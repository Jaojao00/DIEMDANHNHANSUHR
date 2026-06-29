import os

file_path = "app.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject AdminApp.pendingChangeRequests and methods
admin_methods = """
  pendingChangeRequests: [],
  currentApproveReq: null,

  listenToChangeRequests: () => {
    const db = window.FirebaseDB?.db;
    if (!db) return;
    const { collection, query, where, onSnapshot } = window.FirebaseDB;
    const q = query(collection(db, "change_requests"), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
      AdminApp.pendingChangeRequests = snapshot.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
      AdminApp.updateNotifBadge();
      // Re-render table if we are on the registration view
      if (document.getElementById('scheduleView').classList.contains('active')) {
        if (AdminApp.currentRegPayload) AdminApp.renderRegistrationTable(AdminApp.currentRegPayload);
      }
    });
  },

  updateNotifBadge: () => {
    const badge = document.getElementById('adminNotifBadge');
    if (!badge) return;
    const count = AdminApp.pendingChangeRequests.length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  },

  openNotifModal: () => {
    const modal = document.getElementById('adminNotifModal');
    const list = document.getElementById('adminNotifList');
    if (!modal || !list) return;
    
    if (AdminApp.pendingChangeRequests.length === 0) {
      list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Không có yêu cầu nào đang chờ duyệt.</p>';
    } else {
      let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
      AdminApp.pendingChangeRequests.forEach(req => {
        html += `
          <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:bold; color:var(--text-main);">${(req.empName || '').toUpperCase()} <span style="font-size:11px; color:var(--text-muted);">(${req.empId})</span></div>
              <div style="font-size:12px; color:var(--primary); margin-top:4px;">Yêu cầu sửa: ${req.shiftLabel || req.shiftId}</div>
            </div>
            <button class="btn btn-primary" style="padding:6px 12px; font-size:12px;" onclick="AdminApp.jumpToChangeRequest('${req.shiftId}', '${req.empId}')">Tới Lịch</button>
          </div>
        `;
      });
      html += '</div>';
      list.innerHTML = html;
    }
    modal.classList.remove('hidden');
  },

  closeNotifModal: () => {
    document.getElementById('adminNotifModal').classList.add('hidden');
  },

  jumpToChangeRequest: (shiftId, empId) => {
    AdminApp.closeNotifModal();
    // Chuyển sang Quản Lý Lịch
    document.getElementById('viewScheduleBtn')?.click();
    // Chọn Ca
    const shiftTabs = document.querySelectorAll('.shift-tab');
    for (let tab of shiftTabs) {
      if (tab.dataset.id === shiftId || (shiftId === 'CA_NGAY' && tab.dataset.id === '06:00-15:00')) {
        tab.click();
        break;
      }
    }
    // Optional: filter by empId in the search bar if exists
    const searchInput = document.getElementById('searchEmp');
    if (searchInput) {
      searchInput.value = empId;
      searchInput.dispatchEvent(new Event('input'));
    }
  },

  openApproveModal: (reqId) => {
    AdminApp.currentApproveReq = AdminApp.pendingChangeRequests.find(r => r.id === reqId);
    if (!AdminApp.currentApproveReq) return;
    document.getElementById('adminApproveModal').classList.remove('hidden');
  },

  closeApproveModal: () => {
    AdminApp.currentApproveReq = null;
    document.getElementById('adminApproveModal').classList.add('hidden');
  },

  handleApproveChange: async (isApproved) => {
    if (!AdminApp.currentApproveReq) return;
    const req = AdminApp.currentApproveReq;
    
    // UI disable
    document.getElementById('confirmApproveBtn').disabled = true;
    document.getElementById('rejectApproveBtn').disabled = true;
    
    try {
      const db = window.FirebaseDB?.db;
      const { doc, updateDoc } = window.FirebaseDB;
      
      if (isApproved) {
        document.getElementById('confirmApproveBtn').textContent = 'Đang xử lý...';
        
        // Call backend to update sheets
        const payload = {
          action: 'approve_change_request',
          empId: req.empId,
          shiftId: req.shiftId,
          selections: req.selections
        };
        
        const apiLink = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
        const resp = await fetch(apiLink, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const resJson = await resp.json();
        
        if (resJson.error) {
          throw new Error(resJson.error);
        }
        
        // Update Firebase Reg if needed (targetRegId)
        if (req.targetRegId) {
          await updateDoc(doc(db, "registrations", req.targetRegId), {
            selections: req.selections,
            timestamp: Date.now()
          });
        }
        
        // Update status of change request
        await updateDoc(doc(db, "change_requests", req.id), { status: 'approved' });
        
        Utils.showToast(`Yêu cầu của bạn đã được duyệt. Mã NV: ${req.empId}, Họ Tên: ${req.empName}, SĐT: ${req.empPhone}`, 'success', 8000);
      } else {
        document.getElementById('rejectApproveBtn').textContent = 'Đang từ chối...';
        await updateDoc(doc(db, "change_requests", req.id), { status: 'rejected' });
        Utils.showToast('Đã từ chối yêu cầu thay đổi lịch.', 'info');
      }
      
      AdminApp.closeApproveModal();
      AdminApp.loadData();
    } catch(e) {
      console.error(e);
      alert('Lỗi: ' + e.message);
    } finally {
      document.getElementById('confirmApproveBtn').disabled = false;
      document.getElementById('confirmApproveBtn').textContent = 'Duyệt';
      document.getElementById('rejectApproveBtn').disabled = false;
      document.getElementById('rejectApproveBtn').textContent = 'Từ chối';
    }
  },
"""

# Replace in app.js
if "listenToChangeRequests:" not in content:
    content = content.replace('switchToAdmin: () => {', 'switchToAdmin: () => {\n    AdminApp.listenToChangeRequests();\n')
    content = content.replace('AdminApp = {', 'AdminApp = {\n' + admin_methods)

# 2. Add event listeners
events_logic = """
    const notifBtn = document.getElementById('adminNotifBtn');
    if (notifBtn) notifBtn.addEventListener('click', AdminApp.openNotifModal);
    
    const closeNotifBtn = document.getElementById('closeAdminNotifModal');
    if (closeNotifBtn) closeNotifBtn.addEventListener('click', AdminApp.closeNotifModal);
    
    const closeApproveBtn = document.getElementById('closeAdminApproveModal');
    if (closeApproveBtn) closeApproveBtn.addEventListener('click', AdminApp.closeApproveModal);
    
    const confirmApproveBtn = document.getElementById('confirmApproveBtn');
    if (confirmApproveBtn) confirmApproveBtn.addEventListener('click', () => AdminApp.handleApproveChange(true));
    
    const rejectApproveBtn = document.getElementById('rejectApproveBtn');
    if (rejectApproveBtn) rejectApproveBtn.addEventListener('click', () => AdminApp.handleApproveChange(false));
"""
if "AdminApp.openNotifModal" not in content:
    content = content.replace('setupEvents: () => {', 'setupEvents: () => {\n' + events_logic)

# 3. Patch renderRegistrationTable to show badge
render_patch = """
      let isPending = false;
      let reqId = null;
      if (AdminApp.pendingChangeRequests) {
        const pReq = AdminApp.pendingChangeRequests.find(pr => pr.empId === r.empId && (pr.shiftId === r.shiftId || pr.shiftId === 'CA_NGAY' || pr.shiftId === State.selectedShiftId));
        if (pReq) {
          isPending = true;
          reqId = pReq.id;
        }
      }
      
      let badgeHtml = isPending ? `<span style="margin-left:8px; padding:2px 6px; background:#43e97b; color:black; font-size:10px; border-radius:10px; font-weight:bold; cursor:pointer;" onclick="AdminApp.openApproveModal('${reqId}')">Chờ xét duyệt</span>` : '';

      const tr = document.createElement('tr');
      let html = `
        <td style="text-align:center"><input type="checkbox" class="reg-checkbox" value="${r.empId}" data-shift="${r.shiftId || State.selectedShiftId}" style="cursor: pointer;"></td>
        <td style="text-align:center">${idx + 1}</td>
        <td><span class="emp-id-badge">${r.empId}</span></td>
        <td style="font-weight:600; color:var(--text-main); white-space:nowrap">${r.name || r.empName || ''} ${badgeHtml}</td>
"""
content = content.replace("""      const tr = document.createElement('tr');
      let html = `
        <td style="text-align:center"><input type="checkbox" class="reg-checkbox" value="${r.empId}" data-shift="${r.shiftId || State.selectedShiftId}" style="cursor: pointer;"></td>
        <td style="text-align:center">${idx + 1}</td>
        <td><span class="emp-id-badge">${r.empId}</span></td>
        <td style="font-weight:600; color:var(--text-main); white-space:nowrap">${r.name || r.empName || ''}</td>""", render_patch)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Injected Admin change request logic into app.js")

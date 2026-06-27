import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace listenToChangeRequests
new_fetch = """  fetchChangeRequests: async () => {
    try {
      const apiLink = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!apiLink) return;
      
      const res = await fetch(`${apiLink}?action=get_change_requests`);
      const data = await res.json();
      
      if (data.status === 'success' && data.data) {
        AdminApp.pendingChangeRequests = data.data;
        AdminApp.updateNotifBadge();
        // Re-render table if we are on the registration view
        if (document.getElementById('scheduleView') && document.getElementById('scheduleView').classList.contains('active')) {
          if (AdminApp.currentRegPayload) AdminApp.renderRegistrationTable(AdminApp.currentRegPayload);
        }
      }
    } catch(e) {
      console.error("Lỗi lấy danh sách change request: ", e);
    }
  },"""
content = re.sub(r'listenToChangeRequests:\s*\(\)\s*=>\s*\{.*?\n  \},', new_fetch, content, flags=re.DOTALL)
content = content.replace('AdminApp.listenToChangeRequests();', 'AdminApp.fetchChangeRequests();')

# Replace openNotifModal
new_openNotif = """  openNotifModal: async () => {
    const btn = document.getElementById('adminNotifBtn');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:16px; font-weight:bold;">⏳</span>';
    
    await AdminApp.fetchChangeRequests();
    
    btn.innerHTML = originalHtml;
    AdminApp.updateNotifBadge();

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
              <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${new Date(req.timestamp).toLocaleString()}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="AdminApp.openApproveModal('${req.id}')" style="padding:6px 12px; font-size:12px;">Xem</button>
          </div>
        `;
      });
      html += '</div>';
      list.innerHTML = html;
    }
    
    modal.classList.remove('hidden');
  },"""
content = re.sub(r'openNotifModal:\s*\(\)\s*=>\s*\{.*?\n  \},', new_openNotif, content, flags=re.DOTALL)

# Replace handleApproveChange
new_handle = """  handleApproveChange: async (isApproved) => {
    if (!AdminApp.currentApproveReq) return;
    const req = AdminApp.currentApproveReq;
    
    document.getElementById('confirmApproveBtn').disabled = true;
    document.getElementById('rejectApproveBtn').disabled = true;
    
    try {
      if (isApproved) {
        document.getElementById('confirmApproveBtn').textContent = 'Đang xử lý...';
        
        const payload = {
          action: 'approve_change_request',
          reqId: req.id,
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
        
        Utils.showToast("Đã duyệt yêu cầu và cập nhật lịch", "success");
      } else {
        document.getElementById('rejectApproveBtn').textContent = 'Đang xử lý...';
        
        const payload = {
          action: 'reject_change_request',
          reqId: req.id
        };
        const apiLink = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
        await fetch(apiLink, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        
        Utils.showToast("Đã từ chối yêu cầu", "info");
      }
      
      AdminApp.closeApproveModal();
      AdminApp.currentApproveReq = null;
      await AdminApp.fetchChangeRequests();
      AdminApp.openNotifModal();
      
    } catch (e) {
      console.error(e);
      alert('Lỗi: ' + e.message);
    } finally {
      document.getElementById('confirmApproveBtn').disabled = false;
      document.getElementById('rejectApproveBtn').disabled = false;
      document.getElementById('confirmApproveBtn').textContent = 'Duyệt';
      document.getElementById('rejectApproveBtn').textContent = 'Từ chối';
    }
  },"""
content = re.sub(r'handleApproveChange:\s*async\s*\(\w+\)\s*=>\s*\{.*?\n  \},', new_handle, content, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app.js")

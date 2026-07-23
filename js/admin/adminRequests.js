Object.assign(AdminApp, {

  fetchChangeRequests: async () => {
      const reqs = await RegAPI.getChangeRequests();
      if (reqs) {
        AdminApp.pendingChangeRequests = reqs;
        AdminApp.updateNotifBadge();
        // Re-render table if we are on the registration view
        if (
          document.getElementById("scheduleView") &&
          document.getElementById("scheduleView").classList.contains("active")
        ) {
          if (AdminApp.currentRegPayload)
            AdminApp.renderRegistrationTable(AdminApp.currentRegPayload);
        }
      }
    } catch (e) {
      console.error("Lỗi lấy danh sách change request: ", e);
    }
  },

  updateNotifBadge: () => {
    const badge = document.getElementById("adminNotifBadge");
    if (!badge) return;
    const count = AdminApp.pendingChangeRequests.length;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = "block";
    } else {
      badge.style.display = "none";
    }
  },

  openNotifModal: async () => {
    const btn = document.getElementById("adminNotifBtn");
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:16px; font-weight:bold;">⏳</span>';

    await AdminApp.fetchChangeRequests();

    btn.innerHTML = originalHtml;
    AdminApp.updateNotifBadge();

    const modal = document.getElementById("adminNotifModal");
    const list = document.getElementById("adminNotifList");
    if (!modal || !list) return;

    if (AdminApp.pendingChangeRequests.length === 0) {
      list.innerHTML =
        '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Không có yêu cầu nào đang chờ duyệt.</p>';
    } else {
      let html = '<div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">';
      html += '<label style="display:flex; align-items:center; gap:5px; font-size:13px; cursor:pointer; color:var(--text-main); font-weight:500;"><input type="checkbox" id="selectAllBulk" onchange="AdminApp.toggleSelectAllBulk(this)"> Chọn tất cả</label>';
      html += '<div>';
      html += '<button class="btn btn-sm" onclick="AdminApp.handleBulkApprove()" style="background: #10b981; color: #ffffff; border: none; font-weight: 600; padding: 6px 14px; border-radius: 6px; font-size: 12px; margin-right: 8px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.2s;">✓ Duyệt đã chọn</button>';
      html += '<button class="btn btn-sm" onclick="AdminApp.handleBulkReject()" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; font-weight: 600; padding: 6px 14px; border-radius: 6px; font-size: 12px; transition: all 0.2s;">✗ Xóa đã chọn</button>';
      html += '</div></div>';
      
      html += '<div style="display:flex; flex-direction:column; gap:10px;">';
      AdminApp.pendingChangeRequests.forEach((req) => {
        html += `
          <div style="background:rgba(255,255,255,0.05); padding:12px; border-radius:8px; border:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:12px; align-items:center;">
              <input type="checkbox" class="bulk-check" value="${req.id}" style="width:16px; height:16px; cursor:pointer;" onchange="AdminApp.updateBulkSelectAllState()">
              <div>
                <div style="font-weight:bold; color:var(--text-main);">${(req.empName || "").toUpperCase()} <span style="font-size:11px; color:var(--text-muted);">(${req.empId})</span></div>
                <div style="font-size:12px; color:var(--primary); margin-top:4px;">Yêu cầu sửa: ${req.shiftLabel || req.shiftId}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">${new Date(req.timestamp).toLocaleString()}</div>
              </div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="AdminApp.openApproveModal('${req.id}')" style="padding:6px 12px; font-size:12px;">Xem</button>
          </div>
        `;
      });
      html += "</div>";
      list.innerHTML = html;
    }

    modal.classList.remove("hidden");
  },

  closeNotifModal: () => {
    document.getElementById("adminNotifModal").classList.add("hidden");
  },

  toggleSelectAllBulk: (checkbox) => {
    const checks = document.querySelectorAll('.bulk-check');
    checks.forEach(c => c.checked = checkbox.checked);
  },

  updateBulkSelectAllState: () => {
    const checks = document.querySelectorAll('.bulk-check');
    const allChecked = Array.from(checks).every(c => c.checked);
    const selectAll = document.getElementById('selectAllBulk');
    if (selectAll) selectAll.checked = allChecked && checks.length > 0;
  },

  handleBulkApprove: async () => {
    const checks = document.querySelectorAll('.bulk-check:checked');
    if (checks.length === 0) {
      Utils.showToast('Vui lòng chọn ít nhất một yêu cầu để duyệt', 'warning');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn duyệt ${checks.length} yêu cầu này?`)) return;

    const btn = document.querySelector('button[onclick="AdminApp.handleBulkApprove()"]');
    if (btn) btn.innerHTML = 'Đang duyệt...';

    let successCount = 0;
    for (const check of checks) {
      const reqId = check.value;
      const req = AdminApp.pendingChangeRequests.find(r => r.id === reqId);
      if (!req) continue;

      try {
        const res = await window.FirestoreService.approveChangeRequest(req.id, req.empId, req.shiftId, req.selections);
        if (res.success) successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    
    Utils.showGenericSuccessModal("Phê duyệt hoàn tất", `Đã duyệt thành công ${successCount}/${checks.length} yêu cầu.`, "✅");
    await AdminApp.fetchChangeRequests();
    AdminApp.openNotifModal();
  },

  handleBulkReject: async () => {
    const checks = document.querySelectorAll('.bulk-check:checked');
    if (checks.length === 0) {
      Utils.showToast('Vui lòng chọn ít nhất một yêu cầu để xóa', 'warning');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa ${checks.length} yêu cầu này?`)) return;

    const btn = document.querySelector('button[onclick="AdminApp.handleBulkReject()"]');
    if (btn) btn.innerHTML = 'Đang xóa...';

    let successCount = 0;
    for (const check of checks) {
      const reqId = check.value;
      try {
        const res = await window.FirestoreService.rejectChangeRequest(reqId);
        if (res.success) successCount++;
      } catch (e) {
        console.error(e);
      }
    }
    
    Utils.showGenericSuccessModal("Xóa hoàn tất", `Đã xóa thành công ${successCount}/${checks.length} yêu cầu.`, "❌");
    await AdminApp.fetchChangeRequests();
    AdminApp.openNotifModal();
  },

  jumpToChangeRequest: (shiftId, empId) => {
    AdminApp.closeNotifModal();
    // Chuyển sang Quản Lý Lịch
    document.getElementById("viewScheduleBtn")?.click();
    // Chọn Ca
    const shiftTabs = document.querySelectorAll(".shift-tab");
    for (let tab of shiftTabs) {
      if (
        tab.dataset.id === shiftId ||
        (shiftId === "CA_NGAY" && tab.dataset.id === "06:00-15:00")
      ) {
        tab.click();
        break;
      }
    }
    // Optional: filter by empId in the search bar if exists
    const searchInput = document.getElementById("searchEmp");
    if (searchInput) {
      searchInput.value = empId;
      searchInput.dispatchEvent(new Event("input"));
    }
  },

  openApproveModal: (reqId) => {
    AdminApp.currentApproveReq = AdminApp.pendingChangeRequests.find(
      (r) => r.id === reqId,
    );
    if (!AdminApp.currentApproveReq) return;
    
    const detailsContainer = document.getElementById("adminApproveDetails");
    if (detailsContainer) {
       const req = AdminApp.currentApproveReq;
       let html = `<div style="margin-bottom:10px;"><strong>Nhân sự:</strong> ${req.empName} (${req.empId})</div>`;
       html += `<div style="margin-bottom:10px;"><strong>Ca đăng ký:</strong> ${req.shiftId}</div>`;
       if (req.selections && req.selections.length > 0) {
          html += `<table class="schedule-table" style="width:100%; font-size:12px; margin-top:10px;"><thead><tr><th style="padding:5px;">Ngày</th><th style="padding:5px;">Đăng ký mới</th></tr></thead><tbody>`;
          req.selections.forEach(sel => {
             html += `<tr><td style="padding:5px;">${sel.label}</td><td style="padding:5px;">${sel.choice}</td></tr>`;
          });
          html += `</tbody></table>`;
       } else {
          html += `<div>Không có thay đổi cụ thể.</div>`;
       }
       detailsContainer.innerHTML = html;
    }

    document.getElementById("adminApproveModal").classList.remove("hidden");
  },

  closeApproveModal: () => {
    AdminApp.currentApproveReq = null;
    document.getElementById("adminApproveModal").classList.add("hidden");
  },

  handleApproveChange: async (isApproved) => {
    if (!AdminApp.currentApproveReq) return;
    const req = AdminApp.currentApproveReq;

    document.getElementById("confirmApproveBtn").disabled = true;
    document.getElementById("rejectApproveBtn").disabled = true;

    try {
      if (isApproved) {
        document.getElementById("confirmApproveBtn").textContent =
          "Đang xử lý...";

        const res = await window.FirestoreService.approveChangeRequest(req.id, req.empId, req.shiftId, req.selections);
        if (!res.success) throw new Error(res.error);

          Utils.showGenericSuccessModal("Phê duyệt thành công", "Đã duyệt yêu cầu thay đổi lịch và cập nhật vào hệ thống.", "✅");
      } else {
        document.getElementById("rejectApproveBtn").textContent =
          "Đang xử lý...";

        const res = await window.FirestoreService.rejectChangeRequest(req.id);
        if (!res.success) throw new Error(res.error);

          Utils.showGenericSuccessModal("Từ chối thành công", "Đã từ chối yêu cầu thay đổi lịch.", "❌");
      }

      AdminApp.closeApproveModal();
      AdminApp.currentApproveReq = null;
      await AdminApp.fetchChangeRequests();
      AdminApp.openNotifModal();
    } catch (e) {
      console.error(e);
      alert("Lỗi: " + e.message);
    } finally {
      document.getElementById("confirmApproveBtn").disabled = false;
      document.getElementById("rejectApproveBtn").disabled = false;
      document.getElementById("confirmApproveBtn").textContent = "Duyệt";
      document.getElementById("rejectApproveBtn").textContent = "Từ chối";
    }
  }
});

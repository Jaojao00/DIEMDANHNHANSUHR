// ==========================================
// GIAO DIỆN QUẢN TRỊ (ADMIN UI)
// ==========================================
const AdminApp = {
  checkinUnsubscribe: null,
  currentViewMode: 'final', // 'final', 'registration', 'booking'
  bookingData: [],
  selectedBookings: new Set(),

  fetchChangeRequests: async () => {
    try {
      const apiLink =
        localStorage.getItem("agr_api_link") ||
        (typeof CONFIG !== "undefined" ? CONFIG.API_URL : "");
      if (!apiLink) return;

      const res = await fetch(apiLink, {
        method: "POST",
        body: JSON.stringify({ action: "get_change_requests", adminToken: localStorage.getItem("agr_admin_token") })
      });
      const data = await res.json();

      if (data.status === "success" && data.data) {
        AdminApp.pendingChangeRequests = data.data;
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

  openLogModal: async () => {
    const btn = document.getElementById("adminLogBtn");
    if (btn) btn.classList.add("loading");
    
    document.getElementById("adminLogModal").classList.remove("hidden");
    
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Chưa xác thực Admin");
      
      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "get_admin_logs",
          adminToken: token
        })
      });
      const result = await res.json();
      
      if (result.status === "success") {
        AdminApp.renderAdminLogs(result.data || []);
      } else {
        Utils.showToast(result.error || result.message, "error");
      }
    } catch (e) {
      Utils.showToast("Lỗi tải lịch sử: " + e.message, "error");
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },

  closeLogModal: () => {
    document.getElementById("adminLogModal").classList.add("hidden");
  },

  renderAdminLogs: (logs) => {
    const tbody = document.getElementById("adminLogTableBody");
    if (!tbody) return;
    
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted)">Chưa có lịch sử chỉnh sửa nào.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = logs.map(log => {
      const dt = new Date(log.timestamp);
      const formattedDate = dt.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      
      return `
        <tr>
          <td><div class="emp-id-badge" style="background:var(--bg-elevated);color:var(--text-main)">${formattedDate}</div></td>
          <td><b>${log.sheetName}</b></td>
          <td><span style="color:var(--primary);font-weight:bold">${log.cell}</span></td>
          <td><span style="color:var(--text-muted);text-decoration:line-through">${log.oldVal}</span></td>
          <td><span style="color:#43e97b;font-weight:600">${log.newVal}</span></td>
          <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${log.user}">${log.user}</td>
        </tr>
      `;
    }).join("");
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

      const payload = {
        action: "approve_change_request",
        reqId: req.id,
        empId: req.empId,
        shiftId: req.shiftId,
        selections: req.selections,
      };
      const apiLink = localStorage.getItem("agr_api_link") || (typeof CONFIG !== "undefined" ? CONFIG.API_URL : "");
      try {
        payload.adminToken = localStorage.getItem("agr_admin_token");
        const resp = await fetch(apiLink, { method: "POST", body: JSON.stringify(payload) });
        const resJson = await resp.json();
        if (!resJson.error) successCount++;
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
      const payload = { action: "reject_change_request", reqId: reqId };
      const apiLink = localStorage.getItem("agr_api_link") || (typeof CONFIG !== "undefined" ? CONFIG.API_URL : "");
      try {
        payload.adminToken = localStorage.getItem("agr_admin_token");
        const resp = await fetch(apiLink, { method: "POST", body: JSON.stringify(payload) });
        const resJson = await resp.json();
        if (!resJson.error) successCount++;
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

        const payload = {
          action: "approve_change_request",
          reqId: req.id,
          empId: req.empId,
          shiftId: req.shiftId,
          selections: req.selections,
        };

        const apiLink =
          localStorage.getItem("agr_api_link") ||
          (typeof CONFIG !== "undefined" ? CONFIG.API_URL : "");
        payload.adminToken = localStorage.getItem("agr_admin_token");
        const resp = await fetch(apiLink, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const resJson = await resp.json();

        if (resJson.error) {
          throw new Error(resJson.error);
        }

          Utils.showGenericSuccessModal("Phê duyệt thành công", "Đã duyệt yêu cầu thay đổi lịch và cập nhật vào hệ thống.", "✅");
      } else {
        document.getElementById("rejectApproveBtn").textContent =
          "Đang xử lý...";

        const payload = {
          action: "reject_change_request",
          reqId: req.id,
        };
        const apiLink =
          localStorage.getItem("agr_api_link") ||
          (typeof CONFIG !== "undefined" ? CONFIG.API_URL : "");
        payload.adminToken = localStorage.getItem("agr_admin_token");
        await fetch(apiLink, {
          method: "POST",
          body: JSON.stringify(payload),
        });

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
  },

  currentViewMode: "final", // 'final' (Đã Chốt) hoặc 'registration' (Lịch Đăng Ký)
  checkinUnsubscribe: null,

  listenToCheckins: () => {
    if (!window.FirebaseDB?.db) return;
    const { collection, query, where, onSnapshot } = window.FirebaseDB;
    const db = window.FirebaseDB.db;

    // We only want events that happen NOW onwards to update the UI
    const startTime = Date.now() - 5000;

    const q = query(
      collection(db, "checkins"),
      where("serverTimestamp", ">=", startTime),
    );
    if (AdminApp.checkinUnsubscribe) {
      AdminApp.checkinUnsubscribe();
    }
    AdminApp.checkinUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          // If the admin is currently viewing the shift that got updated
          if (
            AdminApp.currentViewMode === "final" &&
            State.selectedShiftId === data.shiftId
          ) {
            // Find employee in State.scheduleData
            const emp = State.scheduleData.find((e) => {
              const eId = (e.id || e.stt || "").toString().toLowerCase().trim();
              const dId = (data.empId || "").toString().toLowerCase().trim();
              return eId === dId;
            });

            if (emp) {
              emp.status = "confirmed";
              emp.timestamp = data.timestamp;
              if (data.phone) emp.phone = data.phone;
              // Save to local cache
              DataManager.saveSchedule(
                State.selectedShiftId,
                State.scheduleData,
              );
              // Re-render
              AdminApp.renderTable();
            }
          }
        }
      });
    });
  },

  init: () => {
    try {
      AdminApp.setupEvents();
      AdminApp.listenToCheckins();

      // Khôi phục tài khoản đăng nhập nếu có
      const savedEmail = localStorage.getItem("admin_email");
      if (savedEmail) {
        const emailInput = document.getElementById("adminEmailInput");
        const changeBtn = document.getElementById("changeAdminAccountBtn");
        if (emailInput && changeBtn) {
          emailInput.value = savedEmail;
          emailInput.setAttribute("readonly", "true");
          changeBtn.classList.remove("hidden");
        }
      }
    } catch (e) {
      console.error("Lỗi setupEvents:", e);
    }
    try {
      AdminApp.renderShiftTabs();
    } catch (e) {
      console.error("Lỗi renderShiftTabs:", e);
    }
    try {
      AdminApp.startClock();
    } catch (e) {
      console.error("Lỗi startClock:", e);
    }

    // Clear search and filter values on startup to prevent browser autofill bugs
    try {
      const searchInput =
        document.getElementById("adminQuerySearch") ||
        document.getElementById("searchInput");
      if (searchInput) searchInput.value = "";
      const statusFilter = document.getElementById("statusFilter");
      if (statusFilter) statusFilter.value = "all";
    } catch (e) {
      console.error("Lỗi reset ô lọc:", e);
    }
  },

  startAutoRefresh: () => {
    AdminApp.stopAutoRefresh();
    AdminApp.refreshTimer = setInterval(() => {
      // Chỉ tự tải lại khi đang ở tab danh sách (không phải lúc đang preview)
      const preview = document.getElementById("previewContainer");
      if (preview && preview.classList.contains("hidden")) {
        AdminApp.loadData(true); // true = silent refresh
      }
    }, CONFIG.REFRESH_INTERVAL);
  },

  stopAutoRefresh: () => {
    if (AdminApp.refreshTimer) clearInterval(AdminApp.refreshTimer);
  },

  startClock: () => {
    const update = () => {
      const savedDate = localStorage.getItem("agr_schedule_date");
      const d = savedDate ? new Date(savedDate) : new Date();
      const dateEl = document.getElementById("currentDate");
      const timeEl = document.getElementById("currentTime");
      if (dateEl) dateEl.textContent = Utils.formatDate(d);

      const now = new Date();
      if (timeEl) timeEl.textContent = Utils.formatTime(now);
    };
    update();
    setInterval(update, 1000);
  },

  switchToAdmin: () => {
    AdminApp.fetchChangeRequests();

    State.isAdminMode = true;
    const empView = document.getElementById("employeeView");
    const admView = document.getElementById("adminView");
    const empBottomNav = document.getElementById("empBottomNav");
    if (empView) empView.classList.remove("active");
    if (admView) admView.classList.add("active");
    if (empBottomNav) empBottomNav.classList.add("hidden");

    AdminApp.loadData();
    // Auto refresh cho admin
    AdminApp.startAutoRefresh();
  },

  switchToEmployee: () => {
    State.isAdminMode = false;
    const empView = document.getElementById("employeeView");
    const admView = document.getElementById("adminView");
    const empBottomNav = document.getElementById("empBottomNav");
    if (admView) admView.classList.remove("active");
    if (empView) empView.classList.add("active");
    if (empBottomNav) empBottomNav.classList.remove("hidden");
    AdminApp.stopAutoRefresh();
  },

  setupEvents: () => {
    const notifBtn = document.getElementById("adminNotifBtn");
    if (notifBtn) notifBtn.addEventListener("click", AdminApp.openNotifModal);

    const logBtn = document.getElementById("adminLogBtn");
    if (logBtn) logBtn.addEventListener("click", AdminApp.openLogModal);

    const closeLogBtn = document.getElementById("closeAdminLogModal");
    if (closeLogBtn)
      closeLogBtn.addEventListener("click", AdminApp.closeLogModal);

    const closeNotifBtn = document.getElementById("closeAdminNotifModal");
    if (closeNotifBtn)
      closeNotifBtn.addEventListener("click", AdminApp.closeNotifModal);

    const closeApproveBtn = document.getElementById("closeAdminApproveModal");
    if (closeApproveBtn)
      closeApproveBtn.addEventListener("click", AdminApp.closeApproveModal);

    const confirmApproveBtn = document.getElementById("confirmApproveBtn");
    if (confirmApproveBtn)
      confirmApproveBtn.addEventListener("click", () =>
        AdminApp.handleApproveChange(true),
      );

    const rejectApproveBtn = document.getElementById("rejectApproveBtn");
    if (rejectApproveBtn)
      rejectApproveBtn.addEventListener("click", () =>
        AdminApp.handleApproveChange(false),
      );

    // Modal Login
    const loginCancelBtn = document.getElementById("adminLoginCancelBtn");
    if (loginCancelBtn) {
      loginCancelBtn.addEventListener("click", () => {
        const loginModal = document.getElementById("adminLoginModal");
        const passInput = document.getElementById("adminPasswordInput");
        if (loginModal) loginModal.classList.add("hidden");
        if (passInput) passInput.value = "";
      });
    }

    const changeAdminAccountBtn = document.getElementById(
      "changeAdminAccountBtn",
    );
    const adminEmailInput = document.getElementById("adminEmailInput");
    if (changeAdminAccountBtn && adminEmailInput) {
      changeAdminAccountBtn.addEventListener("click", () => {
        localStorage.removeItem("admin_email");
        adminEmailInput.value = "";
        adminEmailInput.removeAttribute("readonly");
        changeAdminAccountBtn.classList.add("hidden");
        adminEmailInput.focus();
      });
    }

    const loginSubmitBtn = document.getElementById("adminLoginSubmitBtn");
    if (loginSubmitBtn) {
      loginSubmitBtn.addEventListener("click", () => {
        const passInput = document.getElementById("adminPasswordInput");
        const emailInput = document.getElementById("adminEmailInput");
        const errorEl = document.getElementById("adminLoginError");

        const email = emailInput ? emailInput.value.trim() : "";
        const pass = passInput ? passInput.value : "";

        if (!email || !pass) {
          if (errorEl) {
            errorEl.textContent = "Vui lòng nhập đầy đủ Email và Mật khẩu";
            errorEl.classList.remove("hidden");
          }
          return;
        }

        const originalText = loginSubmitBtn.innerHTML;
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML =
          '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;margin-right:8px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;display:inline-block;border-radius:50%;animation:spin 1s linear infinite;"></span> Đang xử lý...';
        if (errorEl) errorEl.classList.add("hidden");

        fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "admin_login",
            email: email,
            password: pass,
          }),
        })
          .then((res) => res.json())
          .then((json) => {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.innerHTML = originalText;
            if (json.success) {
              localStorage.setItem("admin_email", email);
              if (json.token) localStorage.setItem("agr_admin_token", json.token);
              if (adminEmailInput)
                adminEmailInput.setAttribute("readonly", "true");
              if (changeAdminAccountBtn)
                changeAdminAccountBtn.classList.remove("hidden");

              const loginModal = document.getElementById("adminLoginModal");
              if (loginModal) loginModal.classList.add("hidden");
              if (passInput) passInput.value = "";
              AdminApp.switchToAdmin();
            } else {
              if (errorEl) {
                errorEl.textContent = json.error || "Đăng nhập thất bại";
                errorEl.classList.remove("hidden");
              }
            }
          })
          .catch((err) => {
            console.error("Login Error:", err);
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.innerHTML = originalText;
            if (errorEl) {
              errorEl.textContent = "Lỗi kết nối máy chủ";
              errorEl.classList.remove("hidden");
            }
          });
      });
    }

    // Main Table Copy Button (Đã Chốt)
    const btnCopySelected = document.getElementById('btnCopySelected');
    if (btnCopySelected) {
      btnCopySelected.addEventListener('click', () => {
        const checked = document.querySelectorAll('.schedule-checkbox:checked, .reg-checkbox:checked');
        if (checked.length === 0) return;
        let texts = [];
        checked.forEach(cb => {
          const empId = cb.value;
          const empName = cb.dataset.name || '';
          texts.push(`${empId}\t${empName}`);
        });
        const textToCopy = texts.join('\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
          Utils.showToast(`Đã copy ${texts.length} nhân sự`, 'success');
        }).catch(err => {
          console.error("Lỗi copy: ", err);
          Utils.showToast("Không thể copy!", 'error');
        });
      });
    }

    // Toggle Select All for Main Table
    window.toggleSelectAllSchedule = function(source) {
      const checkboxes = document.querySelectorAll('.schedule-checkbox');
      checkboxes.forEach(cb => {
        if (!cb.disabled) cb.checked = source.checked;
      });
      AdminApp.updateScheduleCopyButton();
    };

    // View Mode Toggle
    const btnViewModeFinal = document.getElementById("viewModeFinal");
    const btnViewModeReg = document.getElementById("viewModeReg");
    const btnViewModeBooking = document.getElementById("viewModeBooking");
    const scheduleTableContainer = document.getElementById(
      "scheduleTableContainer",
    );
    const bookingTableContainer = document.getElementById(
      "bookingTableContainer",
    );

    if (btnViewModeFinal && btnViewModeReg) {
      btnViewModeFinal.addEventListener("click", () => {
        AdminApp.currentViewMode = "final";
        btnViewModeFinal.style.background = "var(--primary)";
        btnViewModeFinal.style.color = "white";
        btnViewModeFinal.classList.remove("btn-ghost");
        btnViewModeReg.style.background = "transparent";
        btnViewModeReg.style.color = "var(--text-secondary)";
        btnViewModeReg.classList.add("btn-ghost");
        if (btnViewModeBooking) {
          btnViewModeBooking.style.background = "transparent";
          btnViewModeBooking.style.color = "var(--text-secondary)";
          btnViewModeBooking.classList.add("btn-ghost");
        }
        if (scheduleTableContainer)
          scheduleTableContainer.style.display = "block";
        if (bookingTableContainer) bookingTableContainer.style.display = "none";
        AdminApp.loadData();
      });
      btnViewModeReg.addEventListener("click", () => {
        AdminApp.currentViewMode = "registration";
        btnViewModeReg.style.background = "var(--primary)";
        btnViewModeReg.style.color = "white";
        btnViewModeReg.classList.remove("btn-ghost");
        btnViewModeFinal.style.background = "transparent";
        btnViewModeFinal.style.color = "var(--text-secondary)";
        btnViewModeFinal.classList.add("btn-ghost");
        if (btnViewModeBooking) {
          btnViewModeBooking.style.background = "transparent";
          btnViewModeBooking.style.color = "var(--text-secondary)";
          btnViewModeBooking.classList.add("btn-ghost");
        }
        if (scheduleTableContainer)
          scheduleTableContainer.style.display = "block";
        if (bookingTableContainer) bookingTableContainer.style.display = "none";
        AdminApp.loadData();
      });
      if (btnViewModeBooking) {
        btnViewModeBooking.addEventListener("click", () => {
          AdminApp.currentViewMode = "booking";
          btnViewModeBooking.style.background = "var(--primary)";
          btnViewModeBooking.style.color = "white";
          btnViewModeBooking.classList.remove("btn-ghost");
          btnViewModeReg.style.background = "transparent";
          btnViewModeReg.style.color = "var(--text-secondary)";
          btnViewModeReg.classList.add("btn-ghost");
          btnViewModeFinal.style.background = "transparent";
          btnViewModeFinal.style.color = "var(--text-secondary)";
          btnViewModeFinal.classList.add("btn-ghost");

          if (scheduleTableContainer)
            scheduleTableContainer.style.display = "none";
          if (bookingTableContainer)
            bookingTableContainer.style.display = "block";

          const shiftFilter = document.getElementById("bookingShiftFilter");
          if (shiftFilter) shiftFilter.value = "";
          AdminApp.loadBookingData();
        });
      }
    }

    // Booking Date Filter Auto-Refresh
    const bookingDateFilter = document.getElementById("bookingDateFilter");
    if (bookingDateFilter) {
      let dateTimeout;
      bookingDateFilter.addEventListener("change", () => {
        clearTimeout(dateTimeout);
        dateTimeout = setTimeout(() => {
          if (typeof AdminApp !== "undefined") AdminApp.renderBookingTable();
        }, 3000);
      });
    }
    // Booking Copy Button
    const btnCopySelectedBooking = document.getElementById('btnCopySelectedBooking');
    if (btnCopySelectedBooking) {
      btnCopySelectedBooking.addEventListener('click', () => {
        if (AdminApp.selectedBookings.size === 0) return;
        let texts = [];
        AdminApp.bookingData.forEach(b => {
           if (AdminApp.selectedBookings.has(b.ticket)) {
              texts.push(b.totalReq !== null && b.totalReq !== undefined ? b.totalReq.toString() : "0");
           }
        });
        const textToCopy = texts.join('\\n');
        navigator.clipboard.writeText(textToCopy).then(() => {
          Utils.showToast(`Đã copy ${texts.length} giá trị Total Request`, 'success');
        }).catch(err => {
          console.error("Lỗi copy: ", err);
          Utils.showToast("Không thể copy!", 'error');
        });
      });
    }

    // Booking Refresh Button
    const bookingRefreshBtn = document.getElementById("bookingRefreshBtn");
    if (bookingRefreshBtn) {
      bookingRefreshBtn.addEventListener("click", async () => {
        bookingRefreshBtn.classList.add("spin-anim");
        await AdminApp.loadBookingData();
        setTimeout(() => {
          bookingRefreshBtn.classList.remove("spin-anim");
        }, 500);
      });
    }

    // Exit Admin
    const exitAdminBtn = document.getElementById("exitAdminBtn");
    if (exitAdminBtn) {
      exitAdminBtn.addEventListener("click", AdminApp.switchToEmployee);
    }

    // Settings Modal
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn)
      settingsBtn.addEventListener("click", AdminApp.openSettingsModal);
    const settingsCloseBtn = document.getElementById("settingsCloseBtn");
    if (settingsCloseBtn)
      settingsCloseBtn.addEventListener("click", AdminApp.closeSettings);
    const settingsCancelBtn = document.getElementById("settingsCancelBtn");
    if (settingsCancelBtn)
      settingsCancelBtn.addEventListener("click", AdminApp.closeSettings);
    const settingsSaveBtn = document.getElementById("settingsSaveBtn");
    if (settingsSaveBtn)
      settingsSaveBtn.addEventListener("click", AdminApp.saveSettings);

    const btnResetRegistrations = document.getElementById(
      "btnResetRegistrations",
    );
    if (btnResetRegistrations)
      btnResetRegistrations.addEventListener(
        "click",
        AdminApp.resetRegistrations,
      );

    // Refresh & Search
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        refreshBtn.classList.add("spinning");
        AdminApp.loadData().then(() => {
          setTimeout(() => refreshBtn.classList.remove("spinning"), 500);
        });
      });
    }

    const searchInput =
      document.getElementById("adminQuerySearch") ||
      document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", AdminApp.filterScheduleTable);
    }

    const filterSelect = document.getElementById("statusFilter");
    if (filterSelect) {
      filterSelect.addEventListener("change", AdminApp.filterScheduleTable);
    }

    const regPeriodSelect = document.getElementById("regPeriodSelect");
    if (regPeriodSelect) {
      regPeriodSelect.addEventListener("change", () => {
        if (
          AdminApp.allRegistrationPeriods &&
          AdminApp.allRegistrationPeriods.length > 0
        ) {
          const idx = parseInt(regPeriodSelect.value, 10);
          if (!isNaN(idx) && AdminApp.allRegistrationPeriods[idx]) {
            AdminApp.renderRegistrationTable(
              AdminApp.allRegistrationPeriods[idx],
            );
          }
        }
      });
    }

    // Manager Panel (Update Schedule)
    const managerBtn = document.getElementById("managerBtn");
    if (managerBtn) {
      managerBtn.addEventListener("click", () => {
        AdminApp.openManagerModal();
      });
    }

    const syncRegistrationBtn = document.getElementById("syncRegistrationBtn");
    if (syncRegistrationBtn) {
      syncRegistrationBtn.addEventListener("click", async () => {
        if (
          !confirm(
            "Hệ thống sẽ tự động tổng hợp tất cả những người đăng ký WORK vào Lịch làm việc. Bạn có chắc chắn muốn chạy ngay bây giờ?",
          )
        )
          return;

        const originalText = syncRegistrationBtn.innerHTML;
        syncRegistrationBtn.innerHTML =
          '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:6px"></span> Đang đồng bộ...';
        syncRegistrationBtn.disabled = true;

        try {
          const res = await fetch(State.apiLink, {
            method: "POST",
            body: JSON.stringify({
              action: "sync_roster",
              shiftId: State.selectedShiftId,
              adminToken: localStorage.getItem("agr_admin_token")
            }),
          });
          const result = await res.json();
          if (result.status === "success") {
            alert(result.message || "Đã đồng bộ lịch thành công!");
            // Reload data
            if (AdminApp.currentViewMode === "final") {
              AdminApp.loadScheduleData(State.selectedShiftId);
            }
          } else {
            alert("Lỗi: " + result.error);
          }
        } catch (err) {
          alert("Lỗi kết nối: " + err.message);
        } finally {
          syncRegistrationBtn.innerHTML = originalText;
          syncRegistrationBtn.disabled = false;
        }
      });
    }
    const managerCloseBtn = document.getElementById("managerCloseBtn");
    if (managerCloseBtn) {
      managerCloseBtn.addEventListener("click", () => {
        const modal = document.getElementById("managerModal");
        if (modal) modal.classList.add("hidden");
      });
    }
    const managerLogoutBtn = document.getElementById("managerLogoutBtn");
    if (managerLogoutBtn) {
      managerLogoutBtn.addEventListener("click", () => {
        const modal = document.getElementById("managerModal");
        if (modal) modal.classList.add("hidden");
      });
    }

    const parsePasteBtn = document.getElementById("parsePasteBtn");
    if (parsePasteBtn)
      parsePasteBtn.addEventListener("click", AdminApp.parsePastedData);

    const clearPasteBtn = document.getElementById("clearPasteBtn");
    if (clearPasteBtn) {
      clearPasteBtn.addEventListener("click", () => {
        const pasteArea = document.getElementById("pasteDataArea");
        const preview = document.getElementById("previewContainer");
        const saveBtn = document.getElementById("saveScheduleBtn");
        if (pasteArea) pasteArea.value = "";
        if (preview) preview.classList.add("hidden");
        if (saveBtn) saveBtn.disabled = true;
      });
    }

    const saveScheduleBtn = document.getElementById("saveScheduleBtn");
    if (saveScheduleBtn)
      saveScheduleBtn.addEventListener("click", AdminApp.savePastedSchedule);

    const clearScheduleBtn = document.getElementById("clearScheduleBtn");
    if (clearScheduleBtn) {
      clearScheduleBtn.addEventListener("click", async () => {
        if (
          confirm(
            "Bạn có chắc chắn muốn XÓA LỊCH CA này và trở về dữ liệu Demo ban đầu?",
          )
        ) {
          try {
            localStorage.removeItem(
              Utils.getShiftStorageKey(State.selectedShiftId),
            );
            Utils.showToast("Đã khôi phục dữ liệu Demo.", "info");
            const modal = document.getElementById("managerModal");
            if (modal) modal.classList.add("hidden");
            AdminApp.loadData();
          } catch (e) {
            console.error("Lỗi xóa ca:", e);
          }
        }
      });
    }
  },

  renderShiftTabs: () => {
    const list = document.getElementById("shiftTabsList");
    if (!list) return;
    list.innerHTML = State.shifts
      .map(
        (s) => `
      <div class="shift-tab ${s.id === State.selectedShiftId ? "active" : ""}" 
           data-shift="${s.id}" style="--tab-color:${s.color}">
        <span class="shift-tab-icon">${s.icon}</span>
        <div class="shift-tab-info">
          <span class="shift-tab-time">${s.id}</span>
          <span class="shift-tab-label">${s.label}</span>
        </div>
      </div>
    `,
      )
      .join("");

    // Bind event
    list.querySelectorAll(".shift-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        State.selectedShiftId = tab.dataset.shift;
        AdminApp.renderShiftTabs(); // Re-render to update active class
        if (AdminApp.currentViewMode === "booking") {
          const shiftFilter = document.getElementById("bookingShiftFilter");
          if (shiftFilter) shiftFilter.value = State.selectedShiftId;
          AdminApp.loadBookingData();
        } else {
          AdminApp.loadData();
        }
      });
    });
  },

  loadBookingData: async (isSilent = false) => {
    if (AdminApp.currentViewMode !== "booking") {
      if (AdminApp.bookingInterval) {
        clearInterval(AdminApp.bookingInterval);
        AdminApp.bookingInterval = null;
      }
      return;
    }

    // 1. OPTIMISTIC UI: Đọc cache hiển thị ngay
    if (!isSilent) {
       try {
          const cached = localStorage.getItem("agr_booking_cache");
          if (cached) {
             AdminApp.bookingData = JSON.parse(cached);
             AdminApp.renderBookingTable();
          }
       } catch(e) {}
    }

    // 2. Fetch dữ liệu mới ngầm
    try {
      const res = await fetch(State.apiLink, {
        method: "POST",
        body: JSON.stringify({ action: "get_booking", adminToken: localStorage.getItem("agr_admin_token") }),
      });
      const result = await res.json();

      if (result.status === "success") {
        AdminApp.bookingData = result.data;
        localStorage.setItem("agr_booking_cache", JSON.stringify(result.data));
        AdminApp.renderBookingTable();
      } else {
        console.error("Error loading booking:", result.error);
      }
    } catch (e) {
      console.error("Network error loading booking:", e);
    }

    // Setup auto-refresh if not already
    if (!AdminApp.bookingInterval) {
      AdminApp.bookingInterval = setInterval(() => {
        if (AdminApp.currentViewMode === "booking") {
          AdminApp.loadBookingData(true);
        }
      }, 15000); // 15 seconds
    }
  },

  renderBookingTable: () => {
    const tbody = document.getElementById("bookingBody");
    if (!tbody) return;

    if (!AdminApp.bookingData || AdminApp.bookingData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu Booking.</td></tr>`;
      return;
    }

    const dateFilter = document.getElementById("bookingDateFilter")?.value; // YYYY-MM-DD
    const shiftFilter = document.getElementById("bookingShiftFilter")?.value;
    const totalReqFilter = document.getElementById("bookingTotalReqFilter")?.value;
    const searchStr = (
      document.getElementById("bookingSearch")?.value || ""
    ).toLowerCase();

    // Filter logic
    const filtered = AdminApp.bookingData.filter((b) => {
      let match = true;

      if (dateFilter) {
        // booking date is expected to be string or object. Convert dateFilter to YYYY-MM-DD or compare parts.
        // Let's assume GAS returns date string matching our timezone
        // "2026-12-04" format
        if (!b.date || !b.date.includes(dateFilter)) {
          // try reformatting YYYY-MM-DD from GAS date ISO
          const d = new Date(b.date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const dStr = `${y}-${m}-${day}`;
          if (dStr !== dateFilter) match = false;
        }
      }

      if (shiftFilter && b.shift !== shiftFilter) match = false;
      if (totalReqFilter) {
         let val = parseInt(b.totalReq) || 0;
         if (totalReqFilter === '>0' && val <= 0) match = false;
         if (totalReqFilter === '0' && val !== 0) match = false;
      }

      if (searchStr) {
        const tkt = (b.ticket || "").toString().toLowerCase();
        const dept = (b.department || "").toString().toLowerCase();
        const soc = (b.socName || "").toString().toLowerCase();
        if (
          !tkt.includes(searchStr) &&
          !dept.includes(searchStr) &&
          !soc.includes(searchStr)
        ) {
          match = false;
        }
      }

      return match;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--text-muted)">Không có Booking nào khớp với bộ lọc.</td></tr>`;
      return;
    }

    let html = "";
    filtered.forEach((b) => {
      let commitCell = `<td>${b.commit || ""}</td>`;
      if (b.commit && b.commit.toString().toUpperCase() === "YES") {
        commitCell = `<td><span class="status-badge checkin">YES</span></td>`;
      } else if (b.commit && b.commit.toString().toUpperCase() === "NO") {
        commitCell = `<td><span class="status-badge noshow">NO</span></td>`;
      }

      let dateStr = b.date;
      try {
        const d = new Date(b.date);
        if (!isNaN(d)) {
          dateStr =
            String(d.getDate()).padStart(2, "0") +
            "/" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "/" +
            d.getFullYear();
        }
      } catch (e) {}

      let isSelected = AdminApp.selectedBookings.has(b.ticket);
      html += `
          <tr class="${isSelected ? 'selected-row' : ''}">
            <td style="text-align:center;">
              <input type="checkbox" class="booking-checkbox" data-ticket="${b.ticket}" ${isSelected ? 'checked' : ''} style="cursor:pointer">
            </td>
            ${commitCell}
            <td>${b.ticket || ""}</td>
            <td>${dateStr}</td>
            <td>${b.region || ""}</td>
            <td>${b.department || ""}</td>
            <td>${b.socName || ""}</td>
            <td>${b.area || ""}</td>
            <td>${b.shift || ""}</td>
            <td>${b.vendor || ""}</td>
            <td>${b.totalReq || ""}</td>
            <td>${b.totalKpi || ""}</td>
            <td>${b.latestCommit || ""}</td>
          </tr>
        `;
    });
    tbody.innerHTML = html;

    // Setup checkbox listeners
    const checkboxes = tbody.querySelectorAll('.booking-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const tId = e.target.dataset.ticket;
        if (e.target.checked) {
          AdminApp.selectedBookings.add(tId);
          e.target.closest('tr').classList.add('selected-row');
        } else {
          AdminApp.selectedBookings.delete(tId);
          e.target.closest('tr').classList.remove('selected-row');
          const selectAll = document.getElementById('selectAllBooking');
          if (selectAll) selectAll.checked = false;
        }
        AdminApp.updateBookingCopyButton();
      });
    });

    const selectAll = document.getElementById('selectAllBooking');
    if (selectAll && filtered.length > 0) {
      let allChecked = true;
      filtered.forEach(b => {
         if (!AdminApp.selectedBookings.has(b.ticket)) allChecked = false;
      });
      selectAll.checked = allChecked;
    } else if (selectAll) {
      selectAll.checked = false;
    }

    AdminApp.updateBookingCopyButton();
  },

  toggleAllBooking: (isChecked) => {
    const shiftFilter = document.getElementById("bookingShiftFilter")?.value;
    const totalReqFilter = document.getElementById("bookingTotalReqFilter")?.value;
    const searchStr = (document.getElementById("bookingSearch")?.value || "").toLowerCase();
    
    const filtered = AdminApp.bookingData.filter((b) => {
      let match = true;
      if (shiftFilter && b.shift !== shiftFilter) match = false;
      if (totalReqFilter) {
         let val = parseInt(b.totalReq) || 0;
         if (totalReqFilter === '>0' && val <= 0) match = false;
         if (totalReqFilter === '0' && val !== 0) match = false;
      }
      if (searchStr) {
        const tkt = (b.ticket || "").toString().toLowerCase();
        const dept = (b.department || "").toString().toLowerCase();
        const soc = (b.socName || "").toString().toLowerCase();
        if (!tkt.includes(searchStr) && !dept.includes(searchStr) && !soc.includes(searchStr)) match = false;
      }
      return match;
    });

    if (isChecked) {
      filtered.forEach(b => AdminApp.selectedBookings.add(b.ticket));
    } else {
      filtered.forEach(b => AdminApp.selectedBookings.delete(b.ticket));
    }
    AdminApp.renderBookingTable();
  },

  updateBookingCopyButton: () => {
    const btn = document.getElementById('btnCopySelectedBooking');
    const countSpan = document.getElementById('copySelectedBookingCount');
    if (btn && countSpan) {
      const count = AdminApp.selectedBookings.size;
      countSpan.textContent = count;
      btn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  updateScheduleCopyButton: () => {
    const btn = document.getElementById('btnCopySelected');
    const countSpan = document.getElementById('copySelectedCount');
    const checked = document.querySelectorAll('.schedule-checkbox:checked, .reg-checkbox:checked').length;
    if (countSpan) countSpan.textContent = checked;
    if (btn) btn.style.display = checked > 0 ? 'inline-flex' : 'none';
  },

  loadData: async (isSilent = false) => {
    try {
      if (!isSilent) {
        // Change to a less intrusive loading state instead of blocking
        const statusDot = document.getElementById("connectionStatus");
        const statusText = document.getElementById("connectionText");
        if (statusDot) statusDot.className = "status-dot loading";
        if (statusText) statusText.textContent = "Đang làm mới...";
      }

      // Update badge
      const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
      const badge = document.getElementById("shiftBadge");
      if (badge && shift) {
        badge.textContent = shift.label.toUpperCase();
        badge.style.background = `linear-gradient(135deg, ${shift.color}, #222)`;
      }

      const filterSelect = document.getElementById("statusFilter");
      const regPeriodSelect = document.getElementById("regPeriodSelect");

      // 1. OPTIMISTIC UI: Render immediately from cache
      if (!isSilent) {
        try {
          if (AdminApp.currentViewMode === "final") {
             if (filterSelect) filterSelect.style.display = "inline-block";
             if (regPeriodSelect) regPeriodSelect.style.display = "none";
             
             const stored = localStorage.getItem(Utils.getShiftStorageKey(State.selectedShiftId));
             if (stored) {
               State.scheduleData = JSON.parse(stored).map(DataManager.normalizeEmp);
               AdminApp.renderTable();
               AdminApp.renderStats();
             }
          } else {
             if (filterSelect) filterSelect.style.display = "none";
             
             const cachedRegStr = localStorage.getItem("agr_reg_cache_" + State.selectedShiftId);
             if (cachedRegStr) {
               const cachedReg = JSON.parse(cachedRegStr);
               AdminApp.allRegistrationPeriods = cachedReg.periods || [];
               if (AdminApp.allRegistrationPeriods.length > 0) {
                 if (regPeriodSelect) regPeriodSelect.style.display = "inline-block";
                 // Giữ nguyên logic hiển thị cho kỳ mới nhất
                 AdminApp.renderRegistrationTable(AdminApp.allRegistrationPeriods[AdminApp.allRegistrationPeriods.length - 1]);
               } else {
                 if (regPeriodSelect) regPeriodSelect.style.display = "none";
                 AdminApp.renderRegistrationTable({ headers: [], data: [] });
               }
             }
          }
        } catch(e) {}
      }

      // 2. Fetch fresh data in background
      const requestsData = await DataManager.loadRequests();

      let data = [];
      if (AdminApp.currentViewMode === "final") {
        data = await DataManager.loadSchedule(State.selectedShiftId);
        State.scheduleData = data;
        AdminApp.renderTable();
      } else {
        const regRes = await DataManager.loadRegistrations(
          State.selectedShiftId,
        );
        AdminApp.allRegistrationPeriods = regRes.periods || [];
        if (regPeriodSelect) {
          regPeriodSelect.innerHTML = "";
          if (AdminApp.allRegistrationPeriods.length > 0) {
            regPeriodSelect.style.display = "inline-block";
            AdminApp.allRegistrationPeriods.forEach((p, idx) => {
              const opt = document.createElement("option");
              opt.value = idx;
              opt.textContent = p.name || p.id;
              regPeriodSelect.appendChild(opt);
            });
            const defaultIdx = AdminApp.allRegistrationPeriods.length - 1;
            regPeriodSelect.value = defaultIdx;
            AdminApp.renderRegistrationTable(
              AdminApp.allRegistrationPeriods[defaultIdx],
            );
          } else {
            regPeriodSelect.style.display = "none";
            AdminApp.renderRegistrationTable({ headers: [], data: [] });
          }
        } else {
          AdminApp.renderRegistrationTable(
            AdminApp.allRegistrationPeriods[
              AdminApp.allRegistrationPeriods.length - 1
            ] || { headers: [], data: [] },
          );
        }
      }

      const adminSearch = document.getElementById("adminQuerySearch");
      if (adminSearch) {
        adminSearch.value = "";
      }
      AdminApp.renderStats();
      AdminApp.renderLogs();

      const statusDot = document.getElementById("connectionStatus");
      const statusText = document.getElementById("connectionText");
      if (statusDot) statusDot.className = "status-dot online";
      if (statusText)
        statusText.textContent = CONFIG.API_URL
          ? "⚡ Realtime (Google Sheets)"
          : "⭕ Offline (Local)";
    } catch (err) {
      if (!isSilent) Utils.showToast("Lỗi tải dữ liệu", "error");
      const statusDot = document.getElementById("connectionStatus");
      const statusText = document.getElementById("connectionText");
      if (statusDot) statusDot.className = "status-dot error";
      if (statusText) statusText.textContent = "Lỗi kết nối";
    }
  },

  renderRegistrationTable: (payload) => {
    AdminApp.currentRegPayload = payload;
    const dataList = payload.data || [];
    let dateHeaders = payload.headers || [];

    const tbody = document.getElementById("scheduleBody");
    const thead = document.getElementById("scheduleHead");
    if (!tbody) return;

    // Update counters
    const totalCount = dataList.length;
    const statTotal = document.getElementById("totalEmployees");
    const statPresent = document.getElementById("confirmedCount");
    const statAbsent = document.getElementById("pendingCount");
    const statOff = document.getElementById("xinOffCountTop");

    if (statTotal) statTotal.innerText = totalCount;
    if (statPresent) statPresent.innerText = "0";
    if (statAbsent) statAbsent.innerText = totalCount;
    if (statOff) statOff.innerText = "0";

    if (dataList.length === 0) {
      if (thead) {
        thead.innerHTML = `<tr><th>STT</th><th>Mã NV</th><th>Họ Tên</th><th>Thời gian gửi</th></tr>`;
      }
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:24px; color:var(--text-secondary)">Chưa có ai đăng ký ca này</td></tr>`;
      return;
    }

    // Fallback if API doesn't provide headers
    if (
      dateHeaders.length === 0 &&
      dataList[0].selections &&
      Array.isArray(dataList[0].selections)
    ) {
      dateHeaders = dataList[0].selections.map((s) => s.label);
    }

    // Đổi header cho chế độ Đăng Ký
    if (thead) {
      let html = `
        <tr>
          <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllReg" style="cursor: pointer;"></th>
          <th>STT</th>
          <th>Mã NV</th>
          <th>Họ Tên</th>
          <th>Số ĐT</th>
          <th>Tên Ca</th>
      `;
      dateHeaders.forEach((date) => {
        const filterVal = AdminApp.regDateFilters?.[date] || "";
        html += `
          <th style="text-align:center; min-width: 100px;">
            <div style="margin-bottom: 4px;">${date}</div>
            <select class="reg-date-filter" data-date="${date}" style="font-size: 11px; padding: 2px 4px; width: 100%; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: black;">
              <option value="" style="color: black">Tất cả</option>
              <option value="WORK" style="color: black" ${filterVal === "WORK" ? "selected" : ""}>WORK</option>
              <option value="OFF" style="color: black" ${filterVal === "OFF" ? "selected" : ""}>OFF</option>
            </select>
          </th>
        `;
      });
      html += `<th>Thời gian gửi</th></tr>`;
      thead.innerHTML = html;

      // Add delete button if it doesn't exist in toolbar
      let toolbar = document.querySelector(".admin-toolbar");
      if (toolbar && !document.getElementById("btnDeleteSelectedReg")) {
        const btnHtml = `<button id="btnDeleteSelectedReg" class="btn" style="background:var(--danger); color:white; border:none; margin-left:10px; display:none; padding:8px 16px;">Xóa đã chọn</button>`;
        toolbar.insertAdjacentHTML("beforeend", btnHtml);

        document
          .getElementById("btnDeleteSelectedReg")
          .addEventListener("click", async () => {
            const checked = document.querySelectorAll(".reg-checkbox:checked");
            if (checked.length === 0) return;
            if (
              !confirm(
                `Bạn có chắc chắn muốn xóa ${checked.length} đăng ký đã chọn trên hệ thống (không ảnh hưởng Google Sheets)?`,
              )
            )
              return;

            try {
              const db = window.FirebaseDB?.db;
              if (db) {
                const { collection, query, where, getDocs, deleteDoc } =
                  window.FirebaseDB;
                const regRef = collection(db, "registrations");

                for (const cb of checked) {
                  const empId = cb.value;
                  const shiftId = cb.dataset.shift;
                  // Delete from Firebase
                  const q = query(
                    regRef,
                    where("empId", "==", empId),
                    where("shiftId", "==", shiftId),
                  );
                  const snap = await getDocs(q);
                  const deletePromises = snap.docs.map((doc) =>
                    deleteDoc(doc.ref),
                  );
                  await Promise.all(deletePromises);
                }
                Utils.showToast(
                  `Đã xóa thành công ${checked.length} bản ghi trên hệ thống.`,
                  "success",
                );
                AdminApp.loadData(); // Tải lại bảng
              } else {
                Utils.showToast(
                  "Không thể kết nối tới Firebase để xóa",
                  "error",
                );
              }
            } catch (e) {
              Utils.showToast("Lỗi khi xóa: " + e.message, "error");
            }
          });
      }

      // Handle Select All
      document
        .getElementById("selectAllReg")
        .addEventListener("change", (e) => {
          const cbs = document.querySelectorAll(".reg-checkbox");
          cbs.forEach((cb) => (cb.checked = e.target.checked));
          AdminApp.toggleDeleteBtn();
        });

      // Handle Date Filters
      document.querySelectorAll(".reg-date-filter").forEach((sel) => {
        sel.addEventListener("change", (e) => {
          if (!AdminApp.regDateFilters) AdminApp.regDateFilters = {};
          AdminApp.regDateFilters[e.target.dataset.date] = e.target.value;
          AdminApp.renderRegistrationTable(AdminApp.currentRegPayload);
        });
      });
    }

    tbody.innerHTML = "";

    // Filter data based on regDateFilters
    const filteredDataList = dataList.filter((r) => {
      let pass = true;
      if (!AdminApp.regDateFilters) return true;

      dateHeaders.forEach((date, i) => {
        const filterVal = AdminApp.regDateFilters[date];
        if (!filterVal) return; // if 'Tất cả' or no filter

        let choice = "";
        if (r.choices && Array.isArray(r.choices)) {
          choice = r.choices[i];
        } else if (r.selections && Array.isArray(r.selections)) {
          choice = r.selections[i]?.choice;
        }

        if (choice !== filterVal) pass = false;
      });
      return pass;
    });

    if (filteredDataList.length === 0 && dataList.length > 0) {
      tbody.innerHTML = `<tr><td colspan="${dateHeaders.length + 7}" class="text-center" style="padding:24px; color:var(--text-secondary)">Không có nhân sự nào khớp với bộ lọc</td></tr>`;
    }

    filteredDataList.forEach((r, idx) => {
      let isPending = false;
      let reqId = null;
      if (AdminApp.pendingChangeRequests) {
        const pReq = AdminApp.pendingChangeRequests.find(
          (pr) =>
            pr.empId === r.empId &&
            (pr.shiftId === r.shiftId ||
              pr.shiftId === "CA_NGAY" ||
              pr.shiftId === State.selectedShiftId),
        );
        if (pReq) {
          isPending = true;
          reqId = pReq.id;
        }
      }

      let badgeHtml = isPending
        ? `<span style="margin-left:8px; padding:2px 6px; background:#43e97b; color:black; font-size:10px; border-radius:10px; font-weight:bold; cursor:pointer;" onclick="AdminApp.openApproveModal('${reqId}')">Chờ xét duyệt</span>`
        : "";

      const tr = document.createElement("tr");
      let html = `
        <td style="text-align:center"><input type="checkbox" class="reg-checkbox" value="${r.empId}" data-name="${escapeHTML(r.name || r.empName || '')}" data-shift="${r.shiftId || State.selectedShiftId}" style="cursor: pointer;"></td>
        <td style="text-align:center">${idx + 1}</td>
        <td><span class="emp-id-badge">${r.empId}</span></td>
        <td style="font-weight:600; color:var(--text-main); white-space:nowrap">${r.name || r.empName || ""} ${badgeHtml}</td>

        <td>${r.empPhone || r.phone || ""}</td>
        <td>${r.shiftLabel || State.shifts.find((s) => s.id === (r.shiftId || State.selectedShiftId))?.label || ""}</td>
      `;

      // Render selection cells (supporting both .choices and .selections API responses)
      if (r.choices && Array.isArray(r.choices)) {
        r.choices.forEach((choice) => {
          const isOff = choice === "OFF";
          const style = isOff
            ? "color:var(--danger); font-weight:bold;"
            : "color:var(--success); font-weight:600;";
          html += `<td style="text-align:center; ${style}">${choice || ""}</td>`;
        });
      } else if (r.selections && Array.isArray(r.selections)) {
        r.selections.forEach((sel) => {
          const isOff = sel.choice === "OFF";
          const style = isOff
            ? "color:var(--danger); font-weight:bold;"
            : "color:var(--success); font-weight:600;";
          html += `<td style="text-align:center; ${style}">${sel.choice || ""}</td>`;
        });
      } else {
        // If somehow no selections exist for this row, fill with empty cells
        dateHeaders.forEach(() => {
          html += `<td></td>`;
        });
      }

      // Add timestamp
      html += `
        <td style="color:var(--text-secondary); text-align:left;">
          <span style="display:inline-block; padding:2px 6px; background:rgba(255,255,255,0.1); border-radius:4px; font-size:11px;">${r.timestamp}</span>
        </td>
      `;

      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    // BÁO CÁO TỔNG NHÂN SỰ ĐI LÀM TRONG CA THEO TỪNG NGÀY
    if (filteredDataList.length > 0) {
      const summaryTr = document.createElement("tr");
      summaryTr.style.background = "rgba(255, 255, 255, 0.05)";

      let summaryHtml = `
        <td colspan="6" style="text-align: right; padding-right: 16px; font-weight: bold; color: var(--text-main);">TỔNG SỐ LƯỢNG (WORK):</td>
      `;

      dateHeaders.forEach((date, i) => {
        let workCount = 0;
        filteredDataList.forEach((r) => {
          let choice = "";
          if (r.choices && Array.isArray(r.choices)) {
            choice = r.choices[i];
          } else if (r.selections && Array.isArray(r.selections)) {
            choice = r.selections[i]?.choice;
          }
          if (choice === "WORK") workCount++;
        });
        summaryHtml += `<td style="text-align:center; color:var(--success); font-size: 16px; font-weight: bold;">${workCount}</td>`;
      });

      summaryHtml += `<td></td>`;
      summaryTr.innerHTML = summaryHtml;
      tbody.appendChild(summaryTr);
    }

    // Handle individual checkbox change
    document.querySelectorAll(".reg-checkbox").forEach((cb) => {
      cb.addEventListener("change", AdminApp.toggleDeleteBtn);
    });
  },

  toggleDeleteBtn: () => {
    const checkedBoxes = document.querySelectorAll(".reg-checkbox:checked");
    const checked = checkedBoxes.length;
    const btn = document.getElementById("btnDeleteSelectedReg");
    if (btn) {
      btn.style.display = checked > 0 ? "inline-block" : "none";
      btn.innerText = `Xóa đã chọn (${checked})`;
    }
    AdminApp.updateScheduleCopyButton();
  },

  renderTable: () => {
    const tbody = document.getElementById("scheduleBody");
    if (!tbody) return;
    const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
    const colCount = shift ? shift.colHeaders.length + 7 : 11;

    tbody.innerHTML = "";

    // Check view mode
    if (AdminApp.currentViewMode === "registration") {
      AdminApp.renderRegistrationTable([]); // Should not reach here normally, but just in case
      return;
    }

    if (!State.scheduleData || State.scheduleData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu lịch ca này. Vui lòng thêm bằng tính năng Quản lý.</td></tr>`;
      return;
    }

    // Lấy danh sách ID đã xin nghỉ/lên ca từ localStorage
    let requests = [];
    try {
      const stored = localStorage.getItem("agr_requests");
      if (stored) requests = JSON.parse(stored);

      const scheduleDate = localStorage.getItem("agr_schedule_date");
      if (scheduleDate) {
        requests = requests.filter((r) => {
          if (!r || !r.date) return false;
          let rDateStr = r.date.toString();
          if (rDateStr.includes("T")) {
            const d = new Date(rDateStr);
            rDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
          }
          return rDateStr === scheduleDate || rDateStr.startsWith(scheduleDate);
        });
      }
    } catch (e) {
      console.error("Lỗi đọc dự án:", e);
    }
    const offIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN OFF" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );
    const extraIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN LÊN CA" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );

    const timeStatus = Utils.isWithinTimeWindow(State.selectedShiftId);
    const isTimeOver = timeStatus.isOver;

    tbody.innerHTML = State.scheduleData
      .map((emp) => {
        const empIdLower = (emp.id || "").toLowerCase().trim();
        const isOff = offIds.has(empIdLower) || emp.status === "xin off";
        const isExtra = extraIds.has(empIdLower);
        const isAutoOff =
          !isOff && !isExtra && emp.status !== "confirmed" && isTimeOver;

        let rowClass = isOff
          ? "xin-off-row"
          : emp.status === "confirmed"
            ? "attended"
            : "";
        if (isAutoOff) rowClass = "auto-off-row";

        let confirmCell = "";
        if (isOff) {
          confirmCell = `<span class="xin-off-badge">📋 Xin Off</span>`;
        } else if (isAutoOff) {
          confirmCell = `<span class="auto-off-badge">OFF CHƯA ĐIỂM DANH</span>`;
        } else if (isExtra) {
          confirmCell = `<span class="xin-len-ca-badge">⬆️ Xin Lên Ca</span>`;
        } else if (emp.status === "confirmed") {
          confirmCell = `<div class="confirm-badge confirmed" title="Đã điểm danh lúc ${emp.timestamp}">✓</div>`;
        } else {
          confirmCell = `<div class="confirm-badge pending"></div>`;
        }

        const posCells = shift
          ? shift.colHeaders
              .map((_, idx) => {
                const p = emp.positions ? emp.positions[idx] : "";
                return `<td><span class="position-tag ${!p ? "empty" : ""}">${p || "Chưa xếp"}</span></td>`;
              })
              .join("")
          : "";

        return `
      <tr class="${rowClass}">
        <td style="text-align:center">
          <input type="checkbox" class="schedule-checkbox" value="${escapeHTML(emp.id)}" data-name="${escapeHTML(emp.name)}" onchange="AdminApp.updateScheduleCopyButton()" style="cursor: pointer; width: 16px; height: 16px;">
        </td>
        <td>${emp.stt}</td>
        <td><span class="employee-code">${escapeHTML(emp.id)}</span></td>
        <td style="font-weight:500">${escapeHTML(emp.name)}</td>
        <td><span class="dinhDanh-badge">${emp.dinhDanh || ""}</span></td>
        ${posCells}
        <td><span style="font-size:12px; color:var(--text-muted)">${emp.note || ""}</span></td>
        <td class="confirm-cell">${confirmCell}</td>
      </tr>`;
      })
      .join("");

    // Cập nhật header bảng theo ca hiện tại
    const thead = document.getElementById("scheduleHead");
    if (thead && shift) {
      const posHeaders = shift.colHeaders.map((h) => `<th>${h}</th>`).join("");
      thead.innerHTML = `<tr>
        <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllSchedule" onchange="toggleSelectAllSchedule(this)" style="cursor: pointer; width: 16px; height: 16px;"></th>
        <th>STT</th>
        <th>Mã CTV</th>
        <th>Họ tên</th>
        <th>Định danh</th>
        ${posHeaders}
        <th>Note</th>
        <th>Xác nhận</th>
      </tr>`;
    }

    // Reset copy state
    AdminApp.updateScheduleCopyButton();

    // Áp dụng bộ lọc và tìm kiếm hiện tại
    AdminApp.filterScheduleTable();
  },

  filterScheduleTable: () => {
    const searchInput =
      document.getElementById("adminQuerySearch") ||
      document.getElementById("searchInput");
    if (!searchInput) return;
    let searchVal = searchInput.value.trim();
    const lowerVal = searchVal.toLowerCase();

    // Tự động dọn dẹp các từ khóa tiêu đề do browser autofill nhầm
    if (
      lowerVal === "hệ thống điểm danh" ||
      lowerVal === "hệ thống" ||
      lowerVal === "hệ thống điểm danh quản trị" ||
      lowerVal === "agr điểm danh" ||
      lowerVal === "agr | điểm danh"
    ) {
      searchInput.value = "";
      searchVal = "";
    }

    const searchValLower = searchVal.toLowerCase();
    const filterEl = document.getElementById("statusFilter");
    const filterVal = filterEl ? filterEl.value : "all";

    document.querySelectorAll("#scheduleBody tr").forEach((row) => {
      if (row.classList.contains("loading-row") || row.cells.length <= 1)
        return;

      const text = row.textContent.toLowerCase();
      const matchesSearch = text.includes(searchValLower);

      let matchesFilter = true;
      if (filterVal !== "all") {
        if (filterVal === "confirmed") {
          matchesFilter = row.classList.contains("attended");
        } else if (filterVal === "pending") {
          matchesFilter =
            !row.classList.contains("attended") &&
            !row.classList.contains("xin-off-row") &&
            !row.querySelector(".xin-len-ca-badge");
        } else if (filterVal === "xin-off") {
          matchesFilter =
            row.classList.contains("xin-off-row") ||
            row.querySelector(".xin-off-badge") !== null;
        } else if (filterVal === "xin-len-ca") {
          matchesFilter = row.querySelector(".xin-len-ca-badge") !== null;
        }
      }

      if (matchesSearch && matchesFilter) {
        row.classList.remove("hidden");
      } else {
        row.classList.add("hidden");
      }
    });
  },

  renderStats: () => {
    let requests = [];
    try {
      const stored = localStorage.getItem("agr_requests");
      if (stored) requests = JSON.parse(stored);

      const scheduleDate = localStorage.getItem("agr_schedule_date");
      if (scheduleDate) {
        requests = requests.filter((r) => {
          if (!r || !r.date) return false;
          let rDateStr = r.date.toString();
          if (rDateStr.includes("T")) {
            const d = new Date(rDateStr);
            rDateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
          }
          return rDateStr === scheduleDate || rDateStr.startsWith(scheduleDate);
        });
      }
    } catch (e) {}
    const offIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN OFF" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );
    const extraIds = new Set(
      (requests || [])
        .filter((r) => r && r.type === "XIN LÊN CA" && r.empId)
        .map((r) => r.empId.toLowerCase().trim()),
    );

    const timeStatus = Utils.isWithinTimeWindow(State.selectedShiftId);
    const isTimeOver = timeStatus.isOver;

    const total = State.scheduleData.length;
    const confirmed = State.scheduleData.filter(
      (e) => e.status === "confirmed",
    ).length;

    let explicitXinOffCount = 0;
    let autoOffCount = 0;

    State.scheduleData.forEach((e) => {
      const idLower = (e.id || "").toLowerCase().trim();
      const isOff = offIds.has(idLower) || e.status === "xin off";
      const isExtra = extraIds.has(idLower);
      if (isOff) {
        explicitXinOffCount++;
      } else if (isTimeOver && !isExtra && e.status !== "confirmed") {
        autoOffCount++;
      }
    });

    const xinOffCount = explicitXinOffCount + autoOffCount;

    const effectiveTotal = Math.max(0, total - xinOffCount);

    const totalEl = document.getElementById("totalEmployees");
    const confirmedEl = document.getElementById("confirmedCount");
    const pendingEl = document.getElementById("pendingCount");
    const xinOffElTop = document.getElementById("xinOffCountTop");

    const adminDone = document.getElementById("adminDone");
    const adminTotal = document.getElementById("adminTotal");
    const adminBar = document.getElementById("adminBar");

    if (totalEl) totalEl.textContent = effectiveTotal;
    if (confirmedEl) confirmedEl.textContent = confirmed;
    if (pendingEl)
      pendingEl.textContent = Math.max(0, effectiveTotal - confirmed);
    if (xinOffElTop) xinOffElTop.textContent = xinOffCount;

    if (adminDone) adminDone.textContent = confirmed;
    if (adminTotal) adminTotal.textContent = effectiveTotal;
    if (adminBar) {
      const pct = effectiveTotal === 0 ? 0 : (confirmed / effectiveTotal) * 100;
      adminBar.style.width = `${pct}%`;
    }
  },

  renderLogs: () => {
    const logList = document.getElementById("logList");
    if (!logList) return;
    const confirmed = State.scheduleData
      .filter((e) => e.status === "confirmed")
      .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || "")); // Xếp mới nhất lên trên

    if (confirmed.length === 0) {
      logList.innerHTML = `<div class="log-empty">Chưa có ai điểm danh</div>`;
      return;
    }

    logList.innerHTML = confirmed
      .map((emp) => {
        const initial = (emp.name || "").trim().charAt(0) || "?";
        return `
      <div class="log-item">
        <div class="log-avatar">${initial}</div>
        <div class="log-info">
          <div class="log-name">${emp.name || ""}</div>
          <div class="log-code">${emp.id || ""}</div>
        </div>
        <div class="log-time">${emp.timestamp || "--:--"}</div>
      </div>`;
      })
      .join("");
  },

  // ---- Manager Modal Logic ----
  openManagerModal: () => {
    document.getElementById("managerModal").classList.remove("hidden");
    document.getElementById("pasteDataArea").value = "";
    document.getElementById("previewContainer").classList.add("hidden");
    document.getElementById("saveScheduleBtn").disabled = true;

    const datePicker = document.getElementById("scheduleDatePicker");
    if (datePicker) {
      const savedDate = localStorage.getItem("agr_schedule_date");
      if (savedDate) {
        datePicker.value = savedDate;
      } else {
        const d = new Date();
        datePicker.value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      }
    }

    // Render shift buttons inside modal
    const btnsContainer = document.getElementById("managerShiftBtns");
    btnsContainer.innerHTML = State.shifts
      .map(
        (s) => `
      <div class="mgr-shift-btn ${s.id === State.selectedShiftId ? "active" : ""}" data-shift="${s.id}" style="--tab-color:${s.color}">
        <span>${s.label}</span>
        <span class="mgr-shift-time">${s.id}</span>
      </div>
    `,
      )
      .join("");

    btnsContainer.querySelectorAll(".mgr-shift-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        btnsContainer
          .querySelectorAll(".mgr-shift-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        State.selectedShiftId = btn.dataset.shift; // Sync shift
        AdminApp.renderShiftTabs(); // Sync background UI
        AdminApp.loadData();
      });
    });
  },

  // ---- Settings Modal Logic ----
  openSettingsModal: () => {
    document.getElementById("apiLinkInput").value = State.apiLink;
    const dfEl = document.getElementById("regDateFrom");
    const dtEl = document.getElementById("regDateTo");
    if (dfEl) dfEl.value = localStorage.getItem("agr_reg_date_from") || "";
    if (dtEl) dtEl.value = localStorage.getItem("agr_reg_date_to") || "";
    document.getElementById("settingsModal").classList.remove("hidden");
  },

  closeSettings: () => {
    document.getElementById("settingsModal").classList.add("hidden");
  },

  resetRegistrations: async () => {
    if (
      !confirm(
        "Hành động này sẽ XÓA TOÀN BỘ các bảng lịch đăng ký hiện có trên Google Sheets của bạn. Bạn có chắc chắn muốn dọn dẹp để tạo kỳ đăng ký lịch mới không?",
      )
    )
      return;

    const btn = document.getElementById("btnResetRegistrations");
    if (btn)
      btn.innerHTML =
        '<span class="spinner" style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;"></span> Đang xóa...';

    try {
      const url = State.apiLink;
      if (!url)
        throw new Error(
          "Vui lòng thiết lập cấu hình CONFIG.API_URL trước khi xóa!",
        );

      const response = await fetch(url, {
        method: "POST",
        body: JSON.stringify({ action: "reset_registrations", adminToken: localStorage.getItem("agr_admin_token") }),
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      alert("Đã dọn dẹp thành công! " + (result.message || ""));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa lịch: " + err.message);
    } finally {
      if (btn)
        btn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Xóa toàn bộ đăng ký lịch cũ';
    }
  },

  saveSettings: async () => {
    // Save API Link
    const newApiLink = document.getElementById("apiLinkInput").value.trim();
    if (newApiLink !== State.apiLink) {
      State.apiLink = newApiLink;
      localStorage.setItem("agr_api_url", newApiLink);
    }

    // Save Reg Date Range — đồng bộ lên backend trước, chỉ lưu local khi thành công
    const regFrom = document.getElementById("regDateFrom");
    const regTo = document.getElementById("regDateTo");
    const regDateFrom = regFrom ? regFrom.value : "";
    const regDateTo = regTo ? regTo.value : "";
    
    if (regDateFrom && regDateTo) {
      if (new Date(regDateFrom) > new Date(regDateTo)) {
        Utils.showToast("Lỗi: Ngày kết thúc không thể nhỏ hơn ngày bắt đầu!", "error");
        return;
      }
    }

    if (State.apiLink && (regDateFrom || regDateTo)) {
      try {
        const resp = await fetch(State.apiLink, {
          method: "POST",
          body: JSON.stringify({
            action: "save_reg_config",
            regDateFrom: regDateFrom,
            regDateTo: regDateTo,
            adminToken: localStorage.getItem("agr_admin_token")
          }),
        });
        const json = await resp.json();
        if (json.error) {
          Utils.showToast("Lỗi lưu cấu hình đăng ký: " + json.error, "error");
          return; // Giữ modal mở để admin thử lại
        }
        // Backend thành công → cập nhật localStorage
        if (regDateFrom) localStorage.setItem("agr_reg_date_from", regDateFrom);
        if (regDateTo) localStorage.setItem("agr_reg_date_to", regDateTo);

        // Save to Firebase for employee registration screen sync
        if (window.FirebaseDB?.db) {
          const { doc, setDoc } = window.FirebaseDB;
          const configRef = doc(window.FirebaseDB.db, "config", "admin");
          setDoc(configRef, { regDateFrom, regDateTo }, { merge: true }).catch(
            (e) => console.error("Firebase config save error:", e),
          );
        }
      } catch (err) {
        Utils.showToast("Lỗi kết nối server: " + err.message, "error");
        return; // Giữ modal mở để admin thử lại
      }
    } else {
      // Offline mode — chỉ lưu localStorage
      if (regFrom && regFrom.value)
        localStorage.setItem("agr_reg_date_from", regFrom.value);
      if (regTo && regTo.value)
        localStorage.setItem("agr_reg_date_to", regTo.value);

      // Save to Firebase for employee registration screen sync
      if (window.FirebaseDB?.db) {
        const { doc, setDoc } = window.FirebaseDB;
        const configRef = doc(window.FirebaseDB.db, "config", "admin");
        setDoc(
          configRef,
          {
            regDateFrom: regFrom ? regFrom.value : "",
            regDateTo: regTo ? regTo.value : "",
          },
          { merge: true },
        ).catch((e) => console.error("Firebase config save error:", e));
      }
    }

    AdminApp.closeSettings();
    AdminApp.loadData();
    Utils.showToast("Đã lưu cài đặt", "success");
  },

  parsePastedData: () => {
    const text = document.getElementById("pasteDataArea").value.trim();
    if (!text) {
      Utils.showToast("Vui lòng dán dữ liệu vào ô trống", "warning");
      return;
    }

    const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
    if (!shift || !shift.colHeaders) {
      Utils.showToast("Không tìm thấy cấu hình ca làm việc!", "error");
      return;
    }

    const rows = text.split("\n");
    const parsedData = [];

    // Bỏ qua dòng tiêu đề nếu có
    let startIndex = 0;
    while (
      startIndex < rows.length &&
      (rows[startIndex].toLowerCase().includes("stt") ||
        rows[startIndex].toLowerCase().includes("mã") ||
        rows[startIndex].split("\t").length < 3)
    ) {
      startIndex++;
    }

    for (let i = startIndex; i < rows.length; i++) {
      const cols = rows[i].split("\t"); // TSV từ Excel/Sheets
      if (cols.length >= 3 && cols[1].trim() !== "") {
        // Đọc positions[] theo số lượng colHeaders của ca
        const positions = shift.colHeaders.map(
          (_, pi) => cols[4 + pi]?.trim() || "",
        );
        parsedData.push({
          stt: cols[0]?.trim() || i + 1 - startIndex,
          id: cols[1]?.trim() || "",
          name: cols[2]?.trim() || "",
          dinhDanh: cols[3]?.trim() || "",
          positions: positions,
          note: cols[shift.noteColIndex]?.trim() || "",
          status: "pending",
          timestamp: "",
        });
      }
    }

    if (parsedData.length === 0) {
      Utils.showToast(
        "Không phân tích được dòng dữ liệu nào hợp lệ. Đảm bảo copy từ Excel/Google Sheets.",
        "error",
      );
      return;
    }

    // Hiển thị preview với cột đúng theo ca
    document.getElementById("previewCount").textContent =
      `(${parsedData.length} nhân viên)`;
    document.getElementById("previewContainer").classList.remove("hidden");

    const previewCols = [
      "STT",
      "Mã NV",
      "Họ Tên",
      ...shift.colHeaders.slice(0, 3),
      "Ghi Chú",
    ];
    const thead = `<tr>${previewCols.map((h) => `<th>${h}</th>`).join("")}</tr>`;
    const tbody = parsedData
      .slice(0, 5)
      .map((r) => {
        const pos = r.positions || [];
        return `<tr><td>${r.stt}</td><td>${escapeHTML(r.id)}</td><td>${escapeHTML(r.name)}</td>${pos
          .slice(0, 3)
          .map((p) => `<td>${p}</td>`)
          .join("")}<td>${escapeHTML(r.note)}</td></tr>`;
      })
      .join("");

    document.getElementById("previewTableWrap").innerHTML = `
      <table class="preview-table">
        ${thead}
        <tbody>
          ${tbody}
          ${parsedData.length > 5 ? `<tr><td colspan="${previewCols.length}" style="text-align:center;color:var(--text-muted);font-style:italic">... và ${parsedData.length - 5} dòng nữa</td></tr>` : ""}
        </tbody>
      </table>
    `;

    // Lưu tạm vào state để khi bấm "Lưu" thì đẩy xuống Storage
    State._tempParsedData = parsedData;
    document.getElementById("saveScheduleBtn").disabled = false;
  },

  savePastedSchedule: async () => {
    if (!State._tempParsedData || State._tempParsedData.length === 0) return;

    const datePicker = document.getElementById("scheduleDatePicker");
    if (datePicker && datePicker.value) {
      localStorage.setItem("agr_schedule_date", datePicker.value);
      const mainDateInput = document.getElementById("mainScheduleDateInput");
      if (mainDateInput) {
        const parts = datePicker.value.split("-");
        if (parts.length === 3) {
          mainDateInput.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          mainDateInput.textContent = datePicker.value;
        }
      }
    }

    try {
      await DataManager.saveSchedule(
        State.selectedShiftId,
        State._tempParsedData,
      );
      Utils.showToast(
        `Đã lưu thành công ${State._tempParsedData.length} nhân viên cho ${State.selectedShiftId}`,
      );
      document.getElementById("managerModal").classList.add("hidden");
      AdminApp.loadData(); // Tải lại bảng admin
    } catch (e) {
      Utils.showToast("Lỗi lưu dữ liệu: " + e.message, "error");
    }
  },
};


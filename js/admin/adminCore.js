const AdminApp = {
// GIAO DIỆN QUẢN TRỊ (ADMIN UI)
// ==========================================
  checkinUnsubscribe: null,
  currentViewMode: 'final', // 'final', 'registration', 'booking'
  bookingData: [],
  selectedBookings: new Set(),

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

        fetch(CONFIG.API_URL, {
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
        const rBtn = document.getElementById("regManagerBtn");
        const mBtn = document.getElementById("managerBtn");
        if(rBtn) rBtn.style.display = "none";
        if(mBtn) mBtn.style.display = "inline-flex";
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
        const rBtn = document.getElementById("regManagerBtn");
        const mBtn = document.getElementById("managerBtn");
        if(rBtn) rBtn.style.display = "inline-flex";
        if(mBtn) mBtn.style.display = "none";
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
        const rBtn = document.getElementById("regManagerBtn");
        const mBtn = document.getElementById("managerBtn");
        if(rBtn) rBtn.style.display = "none";
        if(mBtn) mBtn.style.display = "none";
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

    // --- REGISTRATION MANAGER MODAL ---
    const regManagerBtn = document.getElementById("regManagerBtn");
    const regManagerModal = document.getElementById("regManagerModal");
    const regManagerCloseBtn = document.getElementById("regManagerCloseBtn");
    const parseRegPasteBtn = document.getElementById("parseRegPasteBtn");
    const clearRegPasteBtn = document.getElementById("clearRegPasteBtn");
    const saveRegBtn = document.getElementById("saveRegBtn");
    const regPasteInput = document.getElementById("regPasteInput");
    const regPreviewArea = document.getElementById("regPreviewArea");
    const regPreviewTable = document.getElementById("regPreviewTable");
    
    let parsedRegData = null;

    if (regManagerBtn) {
      regManagerBtn.addEventListener("click", () => {
        if(regManagerModal) regManagerModal.classList.remove("hidden");

        // Render shift buttons inside reg modal
        const regBtnsContainer = document.getElementById("regManagerShiftBtns");
        if (regBtnsContainer) {
          regBtnsContainer.innerHTML = State.shifts
            .map(
              (s) => `<div class="mgr-shift-btn ${s.id === State.selectedShiftId ? "active" : ""}" data-shift="${s.id}" style="--tab-color:${s.color}">
              <span>${s.label}</span>
              <span class="mgr-shift-time">${s.id}</span>
            </div>`
            )
            .join("");

          regBtnsContainer.querySelectorAll(".mgr-shift-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              regBtnsContainer
                .querySelectorAll(".mgr-shift-btn")
                .forEach((b) => b.classList.remove("active"));
              btn.classList.add("active");
              State.selectedShiftId = btn.dataset.shift; // Sync shift
              AdminApp.renderShiftTabs(); // Sync background UI
              AdminApp.loadData();
            });
          });
        }

        if(regPasteInput) regPasteInput.value = "";
        if(regPreviewArea) regPreviewArea.classList.add("hidden");
        if(saveRegBtn) saveRegBtn.disabled = true;
        parsedRegData = null;
      });
    }

    if (regManagerCloseBtn) {
      regManagerCloseBtn.addEventListener("click", () => {
        if(regManagerModal) regManagerModal.classList.add("hidden");
      });
    }

    if (clearRegPasteBtn) {
      clearRegPasteBtn.addEventListener("click", () => {
        if(regPasteInput) regPasteInput.value = "";
        if(regPreviewArea) regPreviewArea.classList.add("hidden");
        if(saveRegBtn) saveRegBtn.disabled = true;
        parsedRegData = null;
      });
    }

    if (parseRegPasteBtn) {
      parseRegPasteBtn.addEventListener("click", () => {
        const text = regPasteInput.value.trim();
        if (!text) {
          Utils.showToast("Vui lòng dán dữ liệu trước", "error");
          return;
        }

        // Parse TSV properly handling quotes and newlines within cells
        const parseTSV = (str) => {
            let rows = [];
            let currentRow = [];
            let currentCell = '';
            let inQuotes = false;
            for (let i = 0; i < str.length; i++) {
                let char = str[i];
                if (inQuotes) {
                    if (char === '"') {
                        if (i + 1 < str.length && str[i + 1] === '"') {
                            currentCell += '"'; i++;
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        currentCell += char;
                    }
                } else {
                    if (char === '"') {
                        inQuotes = true;
                    } else if (char === '\t') {
                        currentRow.push(currentCell.replace(/^\r|\r$/g, ''));
                        currentCell = '';
                    } else if (char === '\n') {
                        currentRow.push(currentCell.replace(/^\r|\r$/g, ''));
                        if(currentRow.some(c => c.trim() !== '')) rows.push(currentRow);
                        currentRow = [];
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
            }
            currentRow.push(currentCell.replace(/^\r|\r$/g, ''));
            if (currentRow.some(c => c.trim() !== '')) rows.push(currentRow);
            return rows;
        };

        const lines = parseTSV(text);
        if (lines.length === 0) {
          Utils.showToast("Dữ liệu trống", "error");
          return;
        }

        let headerIndex = -1;
        let colCa = -1, colMaNV = -1;
        let dateHeaders = [];
        let headers = [];

        // Scan first 10 lines to find header
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const tempHeaders = lines[i].map(h => h.trim().toLowerCase());
            let tempColCa = -1, tempColMaNV = -1;
            for (let j = 0; j < tempHeaders.length; j++) {
                if (tempHeaders[j] === "ca" || tempHeaders[j] === "shift" || tempHeaders[j] === "ca làm việc") tempColCa = j;
                if (tempHeaders[j] === "mã nv" || tempHeaders[j] === "mã nv") tempColMaNV = j;
            }
            if (tempColMaNV !== -1) {
                headerIndex = i;
                colCa = tempColCa !== -1 ? tempColCa : 5; // default to 5 if not found
                colMaNV = tempColMaNV;
                headers = lines[i].map(h => h.trim());
                break;
            }
        }

        let startIndex = 0;
        if (headerIndex !== -1) {
            dateHeaders = headers.slice(7);
            startIndex = headerIndex + 1;
        } else {
            // No header found, assume standard format (Col 1 = Mã NV, Dates start at Col 7)
            colMaNV = 1;
            colCa = 5;
            startIndex = 0;
            const numDates = lines[0].length - 7;
            if (numDates > 0) {
                for (let k = 0; k < numDates; k++) {
                    dateHeaders.push("Ngày " + (k + 1));
                }
            }
        }

        if (dateHeaders.length === 0) {
           Utils.showToast("Không tìm thấy dữ liệu ngày (yêu cầu ít nhất 8 cột)", "error");
           return;
        }

        const result = [];
        for (let i = startIndex; i < lines.length; i++) {
          const r = lines[i];
          if (!r || r.length < 2) continue;
          if (!r[colMaNV]) continue;
          
          result.push({
            timestamp: r[0] || "",
            empId: r[colMaNV] || "",
            name: r[colMaNV + 1] || "",
            phone: r[colMaNV + 2] || "",
            choices: r.slice(7)
          });
        }

        parsedRegData = {
          id: "manual_" + Date.now(),
          name: "Nhập thủ công " + Utils.formatDateObj(new Date()),
          headers: dateHeaders,
          data: result
        };

        // Render preview
        const thead = regPreviewTable.querySelector("thead");
        const tbody = regPreviewTable.querySelector("tbody");
        
        thead.innerHTML = "<tr><th>STT</th><th>Mã NV</th><th>Tên</th><th>" + dateHeaders.join("</th><th>") + "</th></tr>";
        
        let tbodyHtml = "";
        result.slice(0, 50).forEach((row, idx) => { // show up to 50 in preview
          let choicesHtml = row.choices.map(c => "<td>" + (c || "") + "</td>").join("");
          tbodyHtml += "<tr><td>" + (idx+1) + "</td><td>" + row.empId + "</td><td>" + row.name + "</td>" + choicesHtml + "</tr>";
        });
        if (result.length > 50) tbodyHtml += "<tr><td colspan='" + (3 + dateHeaders.length) + "'>... và " + (result.length - 50) + " dòng khác</td></tr>";
        
        tbody.innerHTML = tbodyHtml;
        document.getElementById("regPreviewCount").textContent = result.length;
        
        regPreviewArea.classList.remove("hidden");
        saveRegBtn.disabled = false;
        Utils.showToast("Đọc thành công " + result.length + " dòng", "success");
      });
    }

    if (saveRegBtn) {
      saveRegBtn.addEventListener("click", () => {
        if (!parsedRegData) return;
        
        // Push to allRegistrationPeriods
        AdminApp.allRegistrationPeriods.push(parsedRegData);
        
        // Update select
        const regPeriodSelect = document.getElementById("regPeriodSelect");
        if (regPeriodSelect) {
            regPeriodSelect.style.display = "inline-block";
            const opt = document.createElement("option");
            opt.value = AdminApp.allRegistrationPeriods.length - 1;
            opt.textContent = parsedRegData.name;
            regPeriodSelect.appendChild(opt);
            regPeriodSelect.value = AdminApp.allRegistrationPeriods.length - 1;
        }

        AdminApp.renderRegistrationTable(parsedRegData);
        if(regManagerModal) regManagerModal.classList.add("hidden");
        Utils.showToast("Đã áp dụng lịch đăng ký thủ công!", "success");
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
  }
};

// Attach AdminApp to window for inline HTML onclick handlers
window.AdminApp = AdminApp;

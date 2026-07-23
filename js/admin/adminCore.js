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

    const exportRegExcelBtn = document.getElementById("exportRegExcelBtn");
    if (exportRegExcelBtn) {
      exportRegExcelBtn.addEventListener("click", () => {
        if (!State.selectedShiftId) return;
        
        const payload = AdminApp.currentRegPayload;
        if (!payload || !payload.data || payload.data.length === 0) {
          Utils.showToast("Không có dữ liệu để xuất!", "warning");
          return;
        }

        const dataList = payload.data;
        const escapeCSV = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
        let csvContent = "\uFEFF"; // BOM for UTF-8 Excel support
        
        // Define Headers
        const headers = ["Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT", "Giới tính OS", "Ca", "Tên Ca"];
        let dates = payload.headers || [];
        
        // Fallback if headers is empty but selections exist
        if (dates.length === 0 && dataList[0].selections && Array.isArray(dataList[0].selections)) {
            dates = dataList[0].selections.map(s => s.label || s.date);
        }

        dates.forEach(d => {
           headers.push(d);
        });
        csvContent += headers.map(escapeCSV).join(",") + "\n";

        // Generate Rows
        dataList.forEach(r => {
           const row = [
             r.timestamp || "",
             r.empId || "",
             r.name || r.empName || "",
             r.empPhone || r.phone || "",
             r.osGender || "",
             r.shiftId || "",
             r.shiftLabel || ""
           ];
           
           dates.forEach((d, i) => {
             let choice = "";
             if (r.choices && Array.isArray(r.choices)) {
                 choice = r.choices[i] || "";
             } else if (r.selections && Array.isArray(r.selections)) {
                 choice = r.selections[i]?.choice || "";
             }
             row.push(choice);
           });
           csvContent += row.map(escapeCSV).join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `LichLamViec_${State.selectedShiftId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
          name: "Nhập thủ công " + new Date().toLocaleString("vi-VN"),
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

    // --- Xử lý tải file Excel lên ---
    const uploadRegExcelBtn = document.getElementById("uploadRegExcelBtn");
    const regExcelInput = document.getElementById("regExcelInput");
    
    if (uploadRegExcelBtn && regExcelInput) {
      uploadRegExcelBtn.addEventListener("click", () => {
        regExcelInput.click();
      });
      
      regExcelInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Chọn sheet đầu tiên
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Chuyển đổi thành TSV để dùng lại logic Đọc dữ liệu có sẵn
            const tsvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: "\t" });
            
            if (regPasteInput) {
               regPasteInput.value = tsvContent;
               if (parseRegPasteBtn) parseRegPasteBtn.click();
               Utils.showToast("Đã tải file Excel thành công", "success");
            }
          } catch (err) {
             console.error("Lỗi đọc file Excel:", err);
             Utils.showToast("Lỗi đọc file Excel. Vui lòng kiểm tra lại định dạng file.", "error");
          }
          // Reset input để có thể chọn lại file cũ
          regExcelInput.value = "";
        };
        reader.readAsArrayBuffer(file);
      });
    }

    if (saveRegBtn) {
      saveRegBtn.addEventListener("click", async () => {
        if (!parsedRegData || !parsedRegData.data || parsedRegData.data.length === 0) return;
        
        if (!confirm(`Bạn có chắc chắn muốn lưu ${parsedRegData.data.length} dòng đăng ký này lên hệ thống? (Các dữ liệu trùng mã nhân viên sẽ bị ghi đè)`)) return;

        saveRegBtn.disabled = true;
        saveRegBtn.innerHTML = '<span style="font-size:16px;">⏳</span> Đang lưu...';
        
        let successCount = 0;
        let failCount = 0;
        const shiftId = State.selectedShiftId;
        const shiftLabel = State.shifts.find(s => s.id === shiftId)?.label || shiftId;
        const headers = parsedRegData.headers;
        const period = (headers && headers.length > 0) ? `${headers[0]}_${headers[headers.length-1]}` : "manual";

        // Save to Firestore sequentially or in small batches to avoid overload
        if (window.FirestoreService) {
          for (const row of parsedRegData.data) {
             const selections = row.choices.map((c, i) => ({
                 date: headers[i],
                 label: headers[i],
                 choice: c ? c.toUpperCase() : "OFF"
             }));
             
             const payload = {
                 empId: row.empId,
                 empName: row.name,
                 empPhone: row.phone,
                 osGender: "", 
                 shiftId: shiftId,
                 shiftLabel: shiftLabel,
                 period: period,
                 selections: selections,
                 timestamp: row.timestamp || new Date().toISOString()
             };
             
             try {
                const res = await window.FirestoreService.submitRegistration(payload);
                if (res.success) {
                    successCount++;
                    // Fire-and-forget sync to GAS
                    if (window.State && window.State.apiLink) {
                        fetch(window.State.apiLink, {
                           method: "POST",
                           body: JSON.stringify({ ...payload, action: 'submit_registration' })
                        }).catch(e => console.warn("GAS sync error", e));
                    }
                } else {
                    failCount++;
                }
             } catch (e) {
                console.error("Lỗi lưu DB:", e);
                failCount++;
             }
          }
        }
        
        AdminApp.loadData();
        if(regManagerModal) regManagerModal.classList.add("hidden");
        
        saveRegBtn.disabled = false;
        saveRegBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Áp dụng lên bảng Lịch Làm Việc';
        
        Utils.showGenericSuccessModal("Lưu Thành Công", `Đã ghi nhận ${successCount} nhân sự lên hệ thống.${failCount > 0 ? ` (Lỗi: ${failCount})` : ''}`, "✅");
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
    if (!window.FirestoreService) return;
    
    if (AdminApp.checkinUnsubscribe) {
      AdminApp.checkinUnsubscribe();
    }
    
    AdminApp.checkinUnsubscribe = window.FirestoreService.onCheckinChange(null, (data) => {
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
      const dateEl = document.getElementById("currentDate");
      const timeEl = document.getElementById("currentTime");
      const now = new Date();
      if (dateEl) dateEl.textContent = Utils.formatDate(now);
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


Object.assign(AdminApp, {
  promptAddPersonnel: async () => {
    const shiftOptions = State.shifts.map(shift => {
      const isSelected = shift.id === State.selectedShiftId ? "selected" : "";
      return `<option value="${shift.id}" ${isSelected}>${shift.label}</option>`;
    }).join("");

    const { value: formValues } = await Swal.fire({
      title: "Thêm Nhân Sự",
      background: '#151928',
      color: '#fff',
      html:
        '<input id="swal-input1" class="agr-swal-input" placeholder="Mã Nhân Viên">' +
        '<input id="swal-input2" class="agr-swal-input" placeholder="Họ Tên">' +
        `<select id="swal-input3" class="agr-swal-input">
           <option value="">-- Chọn ca làm việc --</option>
           ${shiftOptions}
         </select>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
      customClass: {
        popup: 'agr-swal-popup',
        title: 'agr-swal-title',
        confirmButton: 'agr-swal-confirm',
        cancelButton: 'agr-swal-cancel'
      },
      preConfirm: () => {
        const id = document.getElementById('swal-input1').value.trim();
        const name = document.getElementById('swal-input2').value.trim();
        const shiftId = document.getElementById('swal-input3').value;
        if (!id || !name || !shiftId) {
          Swal.showValidationMessage("Vui lòng nhập đủ thông tin và chọn ca.");
          return false;
        }
        return [id, name, shiftId];
      }
    });

    if (formValues) {
      const [empId, empName, targetShiftId] = formValues;
      
      Swal.fire({
        title: 'Đang xử lý...',
        text: 'Vui lòng chờ trong giây lát',
        allowOutsideClick: false,
        background: '#151928',
        color: '#fff',
        didOpen: () => Swal.showLoading()
      });

      try {
        const targetShift = State.shifts.find(s => s.id === targetShiftId);
        const posCount = targetShift ? targetShift.colHeaders.length : 4;
        
        const newEmp = {
          id: empId,
          name: empName,
          dinhDanh: "",
          positions: Array(posCount).fill("Chưa xếp"),
          note: "Thêm thủ công",
          status: "pending",
          timestamp: ""
        };

        if (targetShiftId === State.selectedShiftId) {
          newEmp.stt = State.scheduleData.length + 1;
          State.scheduleData.push(newEmp);
          AdminUI.renderSchedule();
          await DataManager.saveSchedule(targetShiftId, State.scheduleData);
        } else {
          const targetData = await DataManager.loadSchedule(targetShiftId);
          newEmp.stt = targetData.length + 1;
          targetData.push(newEmp);
          await DataManager.saveSchedule(targetShiftId, targetData);
        }

        Swal.fire({
          icon: 'success',
          title: 'Thành công',
          text: `Đã thêm nhân sự vào ${targetShift ? targetShift.label : targetShiftId}.`,
          background: '#151928',
          color: '#fff',
          confirmButtonColor: '#4facf7'
        });
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Lỗi',
          text: 'Có lỗi xảy ra: ' + err.message,
          background: '#151928',
          color: '#fff',
          confirmButtonColor: '#ff5c5c'
        });
      }
    }
  },

  editPosition: async (empId, colIndex, currentValue) => {
    const shift = State.shifts.find(s => s.id === State.selectedShiftId);
    if (!shift || !shift.colHeaders || !shift.colHeaders[colIndex]) return;

    const colName = shift.colHeaders[colIndex];
    
    const { value: newPosition } = await Swal.fire({
      title: 'Cập Nhật Vị Trí Làm Việc',
      html: `Nhập vị trí mới cho cột <b>${colName}</b>:<br><br><i>Để trống nếu muốn đặt là "Chưa xếp"</i>`,
      input: 'text',
      inputValue: currentValue,
      background: '#151928',
      color: '#fff',
      showCancelButton: true,
      confirmButtonText: "Cập nhật",
      cancelButtonText: "Hủy",
      customClass: {
        popup: 'agr-swal-popup',
        title: 'agr-swal-title',
        confirmButton: 'agr-swal-confirm',
        cancelButton: 'agr-swal-cancel',
        input: 'agr-swal-input'
      }
    });

    if (newPosition !== undefined) { // undefined means cancelled, empty string means clear
      const emp = State.scheduleData.find(e => e.id.toLowerCase() === empId.toLowerCase());
      if (emp) {
        if (!emp.positions) emp.positions = [];
        emp.positions[colIndex] = newPosition.trim();
        AdminUI.renderSchedule();
        DataManager.saveSchedule(State.selectedShiftId, State.scheduleData);
      }
    }
  },

  changeConfirmStatus: async (empId, currentStatus) => {
    let defaultStatus = currentStatus;
    if (currentStatus === "xin off") defaultStatus = "xin off";
    else if (currentStatus === "confirmed") defaultStatus = "confirmed";
    else defaultStatus = "pending";

    const { value: newStatus } = await Swal.fire({
      title: 'Cập Nhật Trạng Thái',
      background: '#151928',
      color: '#fff',
      input: 'select',
      inputOptions: {
        'pending': 'Chưa Điểm Danh',
        'confirmed': 'Đã Điểm Danh',
        'xin off': 'Xin Off',
        'xin lên ca': 'Xin Lên Ca'
      },
      inputPlaceholder: 'Chọn trạng thái...',
      inputValue: defaultStatus,
      showCancelButton: true,
      confirmButtonText: "Cập nhật",
      cancelButtonText: "Hủy",
      customClass: {
        popup: 'agr-swal-popup',
        title: 'agr-swal-title',
        confirmButton: 'agr-swal-confirm',
        cancelButton: 'agr-swal-cancel',
        input: 'agr-swal-input'
      }
    });

    if (newStatus) {
      const emp = State.scheduleData.find(e => e.id.toLowerCase() === empId.toLowerCase());
      if (emp) {
        emp.status = newStatus;
        if (newStatus === 'confirmed' && !emp.timestamp) {
           emp.timestamp = new Date().toLocaleTimeString();
        }
        AdminUI.renderSchedule();
        DataManager.saveSchedule(State.selectedShiftId, State.scheduleData);
      }
    }
  }
});

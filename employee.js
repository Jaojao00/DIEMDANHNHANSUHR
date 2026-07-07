// ==========================================
// GIAO DIỆN NHÂN VIÊN (EMPLOYEE UI)
// ==========================================
const EmployeeApp = {
  init: () => {
    EmployeeApp.syncSettings();
    EmployeeApp.renderShifts();
    EmployeeApp.setupEvents();
    EmployeeApp.startClock();
  },

  syncSettings: () => {
    // Tự động dọn dẹp API URL cũ nếu còn lưu trong localStorage
    try {
      const currentLocalUrl = localStorage.getItem("agr_api_url");
      const oldUrl1 =
        "https://script.google.com/macros/s/AKfycbxvVmnXSyKdEJt-H7Ag8AKlrMRaScStA5iQbWsspRjT-8r-MHopM5Tylg5wjNJXtHsm/exec";
      const oldUrl2 =
        "https://script.google.com/macros/s/AKfycbxsQNg5OhchJ3P9MuWJF1wctPDfgRlhh2t-fWw_KNwUXyvpbCrpiTqdEMEaFsZi51kc/exec";
      const oldUrl3 =
        "https://script.google.com/macros/s/AKfycbyI46Xny1nRIe8EDiBk79yq2ot-7PafmrWKU3dkLIh6lUoF7b0qS08J9RF6iJeHU6tq/exec";
      const oldUrl4 =
        "https://script.google.com/macros/s/AKfycbzhLm9d6ewMZ4n4QYdMrx1NpUHTwBNgw1Ji0wmK5MwKcRt8KTNnem9-9pRpY__q0qZl/exec";
      const oldUrl5 =
        "https://script.google.com/macros/s/AKfycbwsmUIhLTtsRscpeBIxBCuA5Rt3emjY1wcHyKTQ-Ju_0gd7vZHCjYs50JSGAM91AF08/exec";
      if (
        currentLocalUrl &&
        (currentLocalUrl.trim() === oldUrl1 ||
          currentLocalUrl.trim() === oldUrl2 ||
          currentLocalUrl.trim() === oldUrl3 ||
          currentLocalUrl.trim() === oldUrl4 ||
          currentLocalUrl.trim() === oldUrl5)
      ) {
        localStorage.removeItem("agr_api_url");
      }
      State.apiLink =
        localStorage.getItem("agr_api_url") ||
        (typeof CONFIG !== "undefined" ? CONFIG.APPS_SCRIPT_URL : "");
    } catch (e) {
      console.error("Lỗi dọn dẹp url cũ:", e);
    }

    let savedTimes = null;
    try {
      const stored = localStorage.getItem("agr_shift_times");
      if (stored) savedTimes = JSON.parse(stored);
    } catch (e) {
      console.error("Lỗi đọc agr_shift_times:", e);
    }
    try {
      const savedDate = localStorage.getItem("agr_schedule_date");
      if (savedDate) {
        const d = new Date(savedDate);
        if (!isNaN(d.getTime())) State.scheduleDate = d;
      }
    } catch (e) {
      console.error(e);
    }
  },

  startClock: () => {
    const update = () => {
      const savedDate = localStorage.getItem("agr_schedule_date");
      const d = savedDate ? new Date(savedDate) : new Date();
      const empDateEl = document.getElementById("empDate");
      const empTimeEl = document.getElementById("empTime");
      const attClockSmEl = document.getElementById("attClockSm");
      if (empDateEl) empDateEl.textContent = Utils.formatDate(d);

      const now = new Date();
      if (empTimeEl) empTimeEl.textContent = Utils.formatTime(now);
      if (attClockSmEl) attClockSmEl.textContent = Utils.formatTime(now);
    };
    update();
    setInterval(update, 1000);
  },

  renderShifts: () => {
    const container = document.getElementById("shiftCards");
    container.innerHTML = State.shifts
      .map(
        (shift) => `
      <div class="shift-card" data-shift="${shift.id}" style="--card-color: ${shift.color}">
        <div class="shift-card-icon">${shift.icon}</div>
        <div class="shift-card-body">
          <div class="shift-card-name">${shift.label}</div>
          <div class="shift-card-time">${shift.id}</div>
        </div>
        <div class="shift-card-meta">
          <div class="shift-card-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    `,
      )
      .join("");

    // Bind events
    container.querySelectorAll(".shift-card").forEach((card) => {
      card.addEventListener("click", () => {
        State.selectedShiftId = card.dataset.shift;
        EmployeeApp.goToPhase("phaseAttendance");
      });
    });
  },

  goToPhase: (phaseId) => {
    document
      .querySelectorAll(".emp-phase")
      .forEach((el) => el.classList.remove("active", "hidden"));
    document.querySelectorAll(".emp-phase").forEach((el) => {
      if (el.id === phaseId) el.classList.add("active");
      else el.classList.add("hidden");
    });

    if (phaseId === "phaseAttendance") {
      const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
      document.getElementById("attShiftIcon").textContent = shift.icon;
      document.getElementById("attShiftLabel").textContent = shift.label;
      document.getElementById("attShiftLabel").style.color = shift.color;
      document.getElementById("attShiftTime").textContent = shift.id;

      // Preload data in background to enable instant checkin
      if (!CONFIG.DEMO_MODE) {
        DataManager.loadSchedule(State.selectedShiftId).catch((e) =>
          console.error("Lỗi preload schedule:", e),
        );
      }
    }
  },

  setupEvents: () => {
    const notifBtn = document.getElementById("adminNotifBtn");
    if (notifBtn) notifBtn.addEventListener("click", AdminApp.openNotifModal);

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

    // Back to shifts
    const backToShiftsBtn = document.getElementById("backToShifts");
    if (backToShiftsBtn) {
      backToShiftsBtn.addEventListener("click", () => {
        EmployeeApp.goToPhase("phaseShift");
      });
    }

    // Manual Form Submit
    const attendanceForm = document.getElementById("attendanceForm");
    if (attendanceForm) {
      attendanceForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
        const timeStatus = Utils.isWithinTimeWindow(shift.id);

        if (!timeStatus.isAllowed) {
          Utils.showToast(
            `Hiện không trong thời gian điểm danh của ca ${shift.label} (Giờ cho phép: ${timeStatus.startStr} - ${timeStatus.endStr})`,
            "error",
          );
          return;
        }

        const idInput = document.getElementById("employeeId");
        const nameInput = document.getElementById("employeeName");
        const phoneInput = document.getElementById("employeePhone");
        if (!idInput || !nameInput || !phoneInput) return;

        const idStr = idInput.value.trim();
        const nameStr = nameInput.value.trim();
        const phoneStr = phoneInput.value.trim();

        // Validation cơ bản
        if (!CONFIG.EMPLOYEE_ID_REGEX.test(idStr)) {
          Utils.showToast(
            "Mã nhân viên không hợp lệ (Ví dụ: Ops123456)",
            "error",
          );
          return;
        }
        if (nameStr.length < CONFIG.MIN_NAME_LENGTH) {
          Utils.showToast("Vui lòng nhập đầy đủ họ tên", "error");
          return;
        }
        if (!CONFIG.PHONE_REGEX.test(phoneStr)) {
          Utils.showToast("Số điện thoại không hợp lệ", "error");
          return;
        }

        // Xử lý điểm danh
        const btn = document.getElementById("submitBtn");
        try {
          if (btn) {
            btn.disabled = true;
            btn.innerHTML =
              '<span class="spinner" style="width:14px;height:14px"></span> Đang xử lý...';
          }

          const result = await DataManager.updateAttendance(
            State.selectedShiftId,
            idStr,
            phoneStr,
          );

          // Hiện Success
          EmployeeApp.showSuccess(result.employeeData, result.isUnassigned);
          attendanceForm.reset();
        } catch (error) {
          Utils.showToast(error.message, "error");
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML =
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Xác Nhận Điểm Danh';
          }
        }
      });
    }

    // Admin Access Button
    const adminAccessBtn = document.getElementById("adminAccessBtn");
    if (adminAccessBtn) {
      adminAccessBtn.addEventListener("click", () => {
        const loginModal = document.getElementById("adminLoginModal");
        const passInput = document.getElementById("adminPasswordInput");
        if (loginModal) loginModal.classList.remove("hidden");
        if (passInput) passInput.focus();
      });
    }

    // Success Done Btn
    const successDoneBtn = document.getElementById("successDoneBtn");
    if (successDoneBtn) {
      successDoneBtn.addEventListener("click", () => {
        EmployeeApp.goToPhase("phaseShift");
      });
    }

    // ---- Xin Nghỉ / Xin Lên Ca Buttons ----
    const openLeaveRequestBtn = document.getElementById("openLeaveRequestBtn");
    if (openLeaveRequestBtn) {
      openLeaveRequestBtn.addEventListener("click", () => {
        const now = new Date();

        // === KHÓA TẠM THỜI: Sự kiện công ty 7-8/7/2026 ===
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const d = now.getDate();
        if (y === 2026 && m === 7 && (d === 7 || d === 8)) {
          if (window.Utils && typeof window.Utils.showGenericAlertModal === "function") {
            window.Utils.showGenericAlertModal(
              '⚠️ Tạm khóa Xin OFF',
              'Hãy liên hệ admin, việc hiện tại sẽ không duyệt nghỉ từ 7 - 8 tháng 7.',
              '🔒'
            );
          } else {
            alert('Hãy liên hệ admin, việc hiện tại sẽ không duyệt nghỉ từ 7 - 8 tháng 7.');
          }
          return;
        }
        // === HẾT KHÓA TẠM THỜI ===

        const hour = now.getHours();
        if (hour >= 18 || hour < 6) {
          Utils.showToast(
            "Hệ thống khóa Xin Off trong thời gian từ 18:00 đến 06:00 sáng hôm sau!",
            "error",
          );
          return;
        }

        const typeEl = document.getElementById("req_type");
        const titleEl = document.getElementById("requestModalTitle");
        const modalEl = document.getElementById("requestModal");
        const dateEl = document.getElementById("req_date");
        const shiftGroup = document.getElementById("req_target_shift_group");
        const shiftLabel = document.getElementById("req_target_shift_label");
        const shiftSelect = document.getElementById("req_target_shift");
        if (typeEl) typeEl.value = "XIN OFF";
        if (titleEl) titleEl.textContent = "⏱️ Xin Nghỉ / Xin Off";
        if (modalEl) modalEl.classList.remove("hidden");
        if (dateEl) {
          const savedDate = localStorage.getItem("agr_schedule_date");
          if (savedDate) dateEl.value = savedDate;
          else dateEl.valueAsDate = new Date();
        }
        if (shiftGroup) shiftGroup.style.display = "block";
        if (shiftLabel)
          shiftLabel.innerHTML =
            'Chọn Ca Xin Off <span style="color:#ff5c5c">*</span>';
        if (shiftSelect && shiftSelect.options.length > 0) {
          shiftSelect.options[0].style.display = "block";
          shiftSelect.value = "ALL";
        }

        const reasonLabel = document.getElementById("req_reason_label");
        if (reasonLabel)
          reasonLabel.innerHTML = 'Lý Do <span style="color:#ff5c5c">*</span>';
      });
    }

    const openExtraShiftBtn = document.getElementById("openExtraShiftBtn");
    if (openExtraShiftBtn) {
      openExtraShiftBtn.addEventListener("click", () => {
        const typeEl = document.getElementById("req_type");
        const titleEl = document.getElementById("requestModalTitle");
        const modalEl = document.getElementById("requestModal");
        const dateEl = document.getElementById("req_date");
        const shiftGroup = document.getElementById("req_target_shift_group");
        const shiftLabel = document.getElementById("req_target_shift_label");
        const shiftSelect = document.getElementById("req_target_shift");
        if (typeEl) typeEl.value = "XIN LÊN CA";
        if (titleEl) titleEl.textContent = "⬆️ Xin Lên Ca";
        if (modalEl) modalEl.classList.remove("hidden");
        if (dateEl) {
          const savedDate = localStorage.getItem("agr_schedule_date");
          if (savedDate) dateEl.value = savedDate;
          else dateEl.valueAsDate = new Date();
        }
        if (shiftGroup) shiftGroup.style.display = "block";
        if (shiftLabel)
          shiftLabel.innerHTML =
            'Chọn Ca Xin Lên <span style="color:#ff5c5c">*</span>';
        if (shiftSelect && shiftSelect.options.length > 0) {
          shiftSelect.options[0].style.display = "none";
          shiftSelect.value = "18:00-22:00";
        }

        const reasonLabel = document.getElementById("req_reason_label");
        if (reasonLabel) reasonLabel.innerHTML = "Lý Do (Tùy chọn)";
      });
    }

    const requestModalCloseBtn = document.getElementById(
      "requestModalCloseBtn",
    );
    if (requestModalCloseBtn) {
      requestModalCloseBtn.addEventListener("click", () => {
        const modalEl = document.getElementById("requestModal");
        const formEl = document.getElementById("requestForm");
        if (modalEl) modalEl.classList.add("hidden");
        if (formEl) formEl.reset();
      });
    }

    const requestForm = document.getElementById("requestForm");
    if (requestForm) {
      requestForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const empIdEl = document.getElementById("req_empId");
        const nameEl = document.getElementById("req_name");
        const phoneEl = document.getElementById("req_phone");
        const dateEl = document.getElementById("req_date");
        const reasonEl = document.getElementById("req_reason");
        const noteEl = document.getElementById("req_note");
        const typeEl = document.getElementById("req_type");
        const targetShiftEl = document.getElementById("req_target_shift");
        if (!empIdEl || !nameEl || !phoneEl || !dateEl || !reasonEl || !typeEl)
          return;

        const empId = empIdEl.value.trim();
        const name = nameEl.value.trim().toUpperCase();
        const phone = phoneEl.value.trim();
        const date = dateEl.value;
        const reason = reasonEl.value.trim();
        const type = typeEl.value;
        let note = noteEl ? noteEl.value.trim() : "";
        let targetShift = "";

        if (type === "XIN OFF") {
          const now = new Date();

          // === KHÓA TẠM THỜI: Sự kiện công ty 7-8/7/2026 ===
          const y = now.getFullYear();
          const m = now.getMonth() + 1;
          const d = now.getDate();
          if (y === 2026 && m === 7 && (d === 7 || d === 8)) {
            if (window.Utils && typeof window.Utils.showGenericAlertModal === "function") {
              window.Utils.showGenericAlertModal(
                '⚠️ Tạm khóa Xin OFF',
                'Hãy liên hệ admin, việc hiện tại sẽ không duyệt nghỉ từ 7 - 8 tháng 7.',
                '🔒'
              );
            } else {
              alert('Hãy liên hệ admin, việc hiện tại sẽ không duyệt nghỉ từ 7 - 8 tháng 7.');
            }
            return;
          }
          // === HẾT KHÓA TẠM THỜI ===

          const hour = now.getHours();
          if (hour >= 18 || hour < 6) {
            Utils.showToast(
              "Hệ thống khóa Xin Off trong thời gian từ 18:00 đến 06:00 sáng hôm sau!",
              "error",
            );
            return;
          }
        }

        if ((type === "XIN LÊN CA" || type === "XIN OFF") && targetShiftEl) {
          targetShift = targetShiftEl.value;
          let shiftName =
            targetShiftEl.options[targetShiftEl.selectedIndex].text;
          if (targetShift === "ALL") shiftName = "Tất cả các ca";
          note =
            `[${type === "XIN OFF" ? "Xin Off" : "Xin ca"}: ${shiftName}] ` +
            note;
        }

        if (
          !empId ||
          !name ||
          !phone ||
          !date ||
          (type === "XIN OFF" && !reason)
        ) {
          Utils.showToast("Vui lòng điền đầy đủ thông tin bắt buộc!", "error");
          return;
        }

        if (
          typeof CONFIG !== "undefined" &&
          CONFIG.EMPLOYEE_ID_REGEX &&
          !CONFIG.EMPLOYEE_ID_REGEX.test(empId)
        ) {
          Utils.showToast(
            "Mã nhân viên không hợp lệ! Vui lòng nhập đúng định dạng (VD: Ops123456)",
            "error",
          );
          return;
        }

        const btn = document.getElementById("requestSubmitBtn");
        try {
          if (btn) {
            btn.disabled = true;
            btn.textContent = "⏳ Đang gửi...";
          }

          // Format timestamp kiểu DD/MM/YYYY HH:mm:ss
          const now = new Date();
          const ts = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

          // Format ngày DD/MM/YYYY
          const [y, m, d2] = date.split("-");
          const dateFormatted = `${d2}/${m}/${y}`;

          await DataManager.submitRequest({
            empId,
            name,
            phone,
            type,
            reason,
            date: dateFormatted,
            note,
            targetShift,
            timestamp: ts,
          });

          const modalEl = document.getElementById("requestModal");
          if (modalEl) modalEl.classList.add("hidden");
          requestForm.reset();

          // Tự động tải lại bảng để thấy ngay người vừa xin lên ca
          const refreshBtn = document.getElementById("refreshBtn");
          if (refreshBtn) refreshBtn.click();

          // Hiển thị thông tin lên bảng thông báo thành công
          const reqSuccessModal = document.getElementById(
            "requestSuccessModal",
          );
          if (reqSuccessModal) {
            const successTypeEl = document.getElementById("reqSuccessType");
            const successTypeLabelEl = document.getElementById(
              "reqSuccessTypeLabel",
            );
            const successIdEl = document.getElementById("reqSuccessId");
            const successNameEl = document.getElementById("reqSuccessName");
            const successPhoneEl = document.getElementById("reqSuccessPhone");
            const successDateEl = document.getElementById("reqSuccessDate");
            const successReasonEl = document.getElementById("reqSuccessReason");
            const successNoteRowEl =
              document.getElementById("reqSuccessNoteRow");
            const successNoteEl = document.getElementById("reqSuccessNote");

            if (successTypeEl)
              successTypeEl.textContent = type === "XIN OFF" ? "OFF" : "LÊN CA";
            if (successTypeLabelEl) {
              successTypeLabelEl.textContent = type;
              successTypeLabelEl.style.color =
                type === "XIN OFF" ? "#ffbe00" : "#4fc3f7";
            }
            if (successIdEl) successIdEl.textContent = empId.toUpperCase();
            if (successNameEl) successNameEl.textContent = name;
            if (successPhoneEl) successPhoneEl.textContent = phone;
            if (successDateEl) successDateEl.textContent = dateFormatted;
            if (successReasonEl) successReasonEl.textContent = reason;

            if (successNoteRowEl) {
              if (note) {
                successNoteRowEl.style.display = "flex";
                if (successNoteEl) successNoteEl.textContent = note;
              } else {
                successNoteRowEl.style.display = "none";
              }
            }

            reqSuccessModal.classList.remove("hidden");
          }

          Utils.showToast(`✅ Đăng ký ${type} thành công!`, "success");
        } catch (err) {
          Utils.showToast("Lỗi gửi yêu cầu: " + err.message, "error");
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "📤 Gửi Yêu Cầu";
          }
        }
      });
    }

    // Close Request Success Modal
    const reqSuccessCloseBtn = document.getElementById("reqSuccessCloseBtn");
    if (reqSuccessCloseBtn) {
      reqSuccessCloseBtn.addEventListener("click", () => {
        const successModal = document.getElementById("requestSuccessModal");
        if (successModal) successModal.classList.add("hidden");
      });
    }
  },

  showSuccess: (empData, isUnassigned) => {
    EmployeeApp.goToPhase("phaseSuccess");

    document.getElementById("successName").textContent = empData.name;
    document.getElementById("successCode").textContent = empData.id;
    document.getElementById("successTs").textContent = empData.timestamp;

    if (isUnassigned) {
      document.getElementById("positionResultCard").classList.add("hidden");
      document.getElementById("noPositionWarning").classList.remove("hidden");
    } else {
      document.getElementById("positionResultCard").classList.remove("hidden");
      document.getElementById("noPositionWarning").classList.add("hidden");

      const shift = State.shifts.find((s) => s.id === State.selectedShiftId);
      const positions = empData.positions || [];

      // Render vị trí đầu tiên làm chính
      document.getElementById("prcMain").textContent =
        positions[0] || "Chưa xếp lịch";

      let slotsHTML = `
        <div class="prc-slot">
          <span class="prc-slot-lbl">Định danh</span>
          <span class="prc-slot-val">${empData.dinhDanh || "—"}</span>
        </div>
      `;

      if (shift && shift.colHeaders) {
        shift.colHeaders.forEach((header, index) => {
          slotsHTML += `
            <div class="prc-slot">
              <span class="prc-slot-lbl">${header}</span>
              <span class="prc-slot-val">${positions[index] || "—"}</span>
            </div>
          `;
        });
      }

      slotsHTML += `
        <div class="prc-slot" style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 5px;">
          <span class="prc-slot-lbl">Ghi chú (NOTE)</span>
          <span class="prc-slot-val" style="color:#aaa">${empData.note || "Không có ghi chú"}</span>
        </div>
      `;

      const prcSlotsEl = document.getElementById("prcSlots");
      if (prcSlotsEl) prcSlotsEl.innerHTML = slotsHTML;
    }
  },
};


Object.assign(AdminApp, {

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

    if (regDateFrom || regDateTo) {
      try {
        if (!window.FirestoreService) throw new Error("FirestoreService chưa được khởi tạo!");
        const result = await window.FirestoreService.saveConfig(regDateFrom, regDateTo);
        
        if (!result.success) {
          Utils.showToast("Lỗi lưu cấu hình đăng ký: " + result.error, "error");
          return; // Giữ modal mở để admin thử lại
        }
        
        // Background sync to GAS
        if (State.apiLink) {
           fetch(State.apiLink, {
             method: 'POST',
             body: JSON.stringify({ action: 'save_reg_config', startDate: regDateFrom, endDate: regDateTo, adminToken: localStorage.getItem("agr_admin_token") })
           }).catch(e => console.warn("Lỗi sync config lên GAS:", e));
        }
        
        // Backend thành công → cập nhật localStorage
        if (regDateFrom) localStorage.setItem("agr_reg_date_from", regDateFrom);
        if (regDateTo) localStorage.setItem("agr_reg_date_to", regDateTo);
      } catch (err) {
        Utils.showToast("Lỗi lưu cấu hình: " + err.message, "error");
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

  updateScheduleCopyButton: () => {
    const btn = document.getElementById('btnCopySelected');
    const countSpan = document.getElementById('copySelectedCount');
    const checked = document.querySelectorAll('.schedule-checkbox:checked, .reg-checkbox:checked').length;
    if (countSpan) countSpan.textContent = checked;
    if (btn) btn.style.display = checked > 0 ? 'inline-flex' : 'none';
  }
});

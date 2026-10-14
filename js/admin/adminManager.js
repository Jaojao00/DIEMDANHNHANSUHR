// THAO TÁC QUẢN TRỊ NÂNG CAO (ADMIN MANAGER - ĐIỀU HÀNH CA TRỰC)
const AdminManager = {
  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Nút Lưu Lịch (ghi đè Google Sheets & Firebase)
    const btnSaveRoster = document.getElementById('btnSaveRosterPositions');
    if (btnSaveRoster) {
      btnSaveRoster.addEventListener('click', () => this.handleSaveRosterPositions());
    }

    // Nút Thêm Nhân Sự Đột Xuất
    const btnAddEmp = document.getElementById('btnAddTempEmployee');
    if (btnAddEmp) {
      btnAddEmp.addEventListener('click', () => this.promptAddEmployee());
    }

    // Nút OFF Hàng Loạt
    const btnMassOff = document.getElementById('btnMassOffEmployees');
    if (btnMassOff) {
      btnMassOff.addEventListener('click', () => this.promptMassOff());
    }

    // Nút Mở Modal Cập Nhật Lịch Từ Sheets
    const btnOpenScheduleModal = document.getElementById('btnOpenScheduleModal');
    if (btnOpenScheduleModal) {
      btnOpenScheduleModal.addEventListener('click', () => this.openScheduleModal());
    }

    // Nút Phân Tích Dữ Liệu Dán
    const btnParse = document.getElementById('btnParseScheduleData');
    if (btnParse) {
      btnParse.addEventListener('click', () => this.parsePastedScheduleData());
    }

    // Nút Xóa Vùng Dán
    const btnClearPaste = document.getElementById('btnClearSchedulePaste');
    if (btnClearPaste) {
      btnClearPaste.addEventListener('click', () => this.clearPasteArea());
    }

    // Nút Lưu Lịch Đã Nhập Vào Hệ Thống
    const btnSaveImported = document.getElementById('btnSaveScheduleToSystem');
    if (btnSaveImported) {
      btnSaveImported.addEventListener('click', () => this.savePastedSchedule());
    }

    // Nút Xóa Lịch Ca Này
    const btnClearShift = document.getElementById('btnClearShiftSchedule');
    if (btnClearShift) {
      btnClearShift.addEventListener('click', () => this.clearShiftSchedule());
    }
  },

  /**
   * Lưu lại toàn bộ vị trí đã chỉnh sửa inline lên Google Sheets & Firebase
   */
  async handleSaveRosterPositions() {
    const shiftSelect = document.getElementById('adminShiftSelect');
    const shiftId = shiftSelect ? shiftSelect.value : DataManager.state.currentShift;

    // Lấy toàn bộ input vị trí trong bảng
    const rows = document.querySelectorAll('#adminRosterTableBody tr[data-id]');
    if (!rows.length) {
      Utils.toast('Không có dữ liệu ca để lưu', 'warning');
      return;
    }

    rows.forEach((row) => {
      const empId = row.dataset.id;
      const targetEmp = DataManager.state.roster.find((e) => e.id === empId);
      if (targetEmp) {
        if (!targetEmp.positions) targetEmp.positions = {};
        const inputs = row.querySelectorAll('.pos-input');
        inputs.forEach((inp) => {
          const key = inp.dataset.posKey;
          targetEmp.positions[key] = inp.value.trim();
        });
      }
    });

    Utils.showLoading('Đang lưu lịch và đồng bộ lên Google Sheets...');

    try {
      const res = await DataManager.callApi('save', {
        shift: shiftId,
        date: DataManager.state.currentDate,
        roster: DataManager.state.roster
      });

      Utils.hideLoading();

      // Lưu đệm LocalStorage
      DataManager.saveCachedRoster(shiftId, DataManager.state.roster);

      if (res && res.success) {
        Utils.showAlert('Đã lưu thành công', 'Bảng phân bổ vị trí đã được cập nhật lên Google Sheets và Firebase.', 'success');
      } else {
        Utils.toast('Đã lưu tạm thời vào bộ nhớ cục bộ (Offline)', 'info');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  },

  /**
   * Thêm nhân viên CTV đột xuất vào ca trực
   */
  async promptAddEmployee() {
    if (typeof Swal === 'undefined') return;

    const { value: formValues } = await Swal.fire({
      title: 'Thêm Nhân Sự Vào Ca Đột Xuất',
      html: `
        <div class="text-left space-y-3 p-2">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Mã NV / CTV:</label>
            <input id="swal_emp_id" class="swal2-input !m-0 !w-full !text-sm" placeholder="VD: OPS11999" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Họ và Tên:</label>
            <input id="swal_emp_name" class="swal2-input !m-0 !w-full !text-sm" placeholder="VD: Lê Quốc Bảo" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Số điện thoại / Zalo:</label>
            <input id="swal_emp_phone" class="swal2-input !m-0 !w-full !text-sm" placeholder="VD: 0912345678" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Vị trí đầu ca:</label>
            <input id="swal_emp_pos" class="swal2-input !m-0 !w-full !text-sm" placeholder="VD: Xả xe 1" />
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: '#D90012',
      confirmButtonText: 'Thêm vào ca',
      cancelButtonText: 'Đóng',
      preConfirm: () => {
        const id = document.getElementById('swal_emp_id').value.trim();
        const name = document.getElementById('swal_emp_name').value.trim();
        const phone = document.getElementById('swal_emp_phone').value.trim();
        const pos = document.getElementById('swal_emp_pos').value.trim();
        if (!id || !name) {
          Swal.showValidationMessage('Vui lòng nhập Mã và Họ tên nhân viên!');
          return false;
        }
        return { id, name, phone, pos };
      }
    });

    if (formValues) {
      const newEmp = {
        stt: DataManager.state.roster.length + 1,
        id: Utils.sanitizeId(formValues.id),
        name: formValues.name,
        phone: formValues.phone,
        identity: 'A-OS',
        status: 'pending',
        checkinTime: '',
        positions: { '18H-20H': formValues.pos, '20H-22H': 'Chưa xếp' }
      };

      DataManager.state.roster.push(newEmp);
      DataManager.recalculateStats();
      AdminUI.updateStatsCards();
      AdminUI.renderRosterTable();
      Utils.toast(`Đã thêm nhân sự: ${newEmp.name}`, 'success');
    }
  },

  /**
   * OFF Hàng Loạt nhiều nhân sự
   */
  async promptMassOff() {
    const confirm = await Utils.confirm(
      'Xác nhận OFF Hàng Loạt',
      'Bạn có muốn chuyển toàn bộ nhân sự đang ở trạng thái <strong>Chưa điểm danh</strong> sang <strong>XIN OFF</strong>?'
    );

    if (!confirm.isConfirmed) return;

    let count = 0;
    DataManager.state.roster.forEach((e) => {
      if ((e.status || '').toLowerCase() === 'pending') {
        e.status = 'off';
        count++;
      }
    });

    DataManager.recalculateStats();
    AdminUI.updateStatsCards();
    AdminUI.renderRosterTable();
    Utils.toast(`Đã chuyển ${count} nhân sự sang trạng thái OFF!`, 'info');
  },

  /**
   * Chuyển đổi trạng thái điểm danh thủ công
   */
  toggleEmployeeStatus(empId) {
    const emp = DataManager.state.roster.find((e) => e.id === empId);
    if (!emp) return;

    const currentStatus = (emp.status || 'pending').toLowerCase();
    if (currentStatus === 'confirmed') {
      emp.status = 'pending';
      emp.checkinTime = '';
    } else if (currentStatus === 'pending') {
      emp.status = 'confirmed';
      emp.checkinTime = Utils.getCurrentVNTime();
    } else {
      emp.status = 'pending';
    }

    DataManager.recalculateStats();
    AdminUI.updateStatsCards();
    AdminUI.renderRosterTable();
    AdminUI.renderActivityFeed();
    Utils.toast(`Đã cập nhật: ${emp.name} (${emp.status})`, 'success');
  },

  // ==================== CẬP NHẬT LỊCH LÀM VIỆC TỪ GOOGLE SHEETS ====================
  _tempParsedData: [],

  openScheduleModal() {
    const shiftSelect = document.getElementById('importScheduleShift');
    const adminShiftSelect = document.getElementById('adminShiftSelect');
    if (shiftSelect) {
      shiftSelect.innerHTML = CONFIG.SHIFTS.map((s) => {
        const isCurrent = adminShiftSelect ? adminShiftSelect.value === s.id : s.isDefault;
        return `<option value="${s.id}" ${isCurrent ? 'selected' : ''}>${s.label}</option>`;
      }).join('');
    }

    const datePicker = document.getElementById('importScheduleDate');
    const adminDate = document.getElementById('adminShiftDate');
    if (datePicker) {
      datePicker.value = adminDate && adminDate.value ? adminDate.value : Utils.formatDateISO();
    }

    this.clearPasteArea();
    window.App?.openModal('modalCapNhatLich');
  },

  clearPasteArea() {
    const area = document.getElementById('pasteScheduleArea');
    const preview = document.getElementById('previewScheduleContainer');
    const saveBtn = document.getElementById('btnSaveScheduleToSystem');

    if (area) area.value = '';
    if (preview) preview.classList.add('hidden');
    if (saveBtn) saveBtn.disabled = true;
    this._tempParsedData = [];
  },

  parsePastedScheduleData() {
    const area = document.getElementById('pasteScheduleArea');
    const text = area ? area.value.trim() : '';

    if (!text) {
      Utils.toast('Vui lòng dán dữ liệu lịch từ Google Sheets vào khung trước', 'warning');
      return;
    }

    const rawRows = text.split(/\r?\n/);
    const parsed = [];

    // Tìm dòng bắt đầu dữ liệu (bỏ qua dòng tiêu đề STT, Mã CTV,...)
    let startIndex = 0;
    while (
      startIndex < rawRows.length &&
      (rawRows[startIndex].toLowerCase().includes('stt') ||
        rawRows[startIndex].toLowerCase().includes('mã ctv') ||
        rawRows[startIndex].toLowerCase().includes('họ tên') ||
        rawRows[startIndex].split('\t').length < 2)
    ) {
      startIndex++;
    }

    const chkReset = document.getElementById('chkResetCheckinStatus');
    const shouldReset = chkReset ? chkReset.checked : true;

    for (let i = startIndex; i < rawRows.length; i++) {
      const line = rawRows[i].trim();
      if (!line) continue;

      // Phân tách cột qua Tab (chuẩn khi copy từ Sheets/Excel) hoặc dấu gạch đứng / phẩy
      let cols = line.split('\t');
      if (cols.length < 3 && line.includes('|')) {
        cols = line.split('|').map((c) => c.trim());
      } else if (cols.length < 3 && line.includes(',')) {
        cols = line.split(',').map((c) => c.trim());
      }

      if (cols.length >= 2) {
        // Dự đoán cấu trúc: [0] STT, [1] Mã NV/CTV, [2] Họ Tên, [3] Định danh, [4] Vị trí 1, [5] Vị trí 2, [6] Ghi chú
        const rawId = cols[1] !== undefined ? cols[1].trim() : '';
        const rawName = cols[2] !== undefined ? cols[2].trim() : (cols[1] || '');
        const identity = cols[3] !== undefined ? cols[3].trim() : 'CTV';
        const pos1 = cols[4] !== undefined ? cols[4].trim() : '';
        const pos2 = cols[5] !== undefined ? cols[5].trim() : '';
        const note = cols[6] !== undefined ? cols[6].trim() : '';

        if (rawId || rawName) {
          const empId = Utils.sanitizeId(rawId) || `OPS_${parsed.length + 1}`;
          
          let empStatus = 'pending';
          let checkinTime = '';

          // Nếu không chọn reset ngày mới, bảo lưu trạng thái đã điểm danh của hôm nay nếu có
          if (!shouldReset && DataManager.state.roster && DataManager.state.roster.length > 0) {
            const existing = DataManager.state.roster.find((e) => Utils.isIdMatch(e.id, empId) || (e.name && e.name.toLowerCase() === rawName.toLowerCase()));
            if (existing) {
              empStatus = existing.status || 'pending';
              checkinTime = existing.checkinTime || '';
            }
          }

          parsed.push({
            stt: parsed.length + 1,
            id: empId,
            name: rawName || empId,
            identity: identity || 'CTV',
            status: empStatus,
            checkinTime: checkinTime,
            note: note,
            positions: {
              '18H-20H': pos1 || 'Chưa xếp',
              '20H-22H': pos2 || 'Chưa xếp'
            }
          });
        }
      }
    }

    if (!parsed.length) {
      Utils.showAlert('Không thể phân tích', 'Không tìm thấy dòng dữ liệu hợp lệ. Vui lòng kiểm tra lại định dạng dữ liệu copy từ Google Sheets.', 'warning');
      return;
    }

    this._tempParsedData = parsed;

    // Render Preview
    const previewContainer = document.getElementById('previewScheduleContainer');
    const previewCount = document.getElementById('previewScheduleCount');
    const previewTbody = document.getElementById('previewScheduleTableBody');
    const saveBtn = document.getElementById('btnSaveScheduleToSystem');

    if (previewContainer) previewContainer.classList.remove('hidden');
    if (previewCount) previewCount.textContent = `${parsed.length} nhân sự`;
    if (saveBtn) saveBtn.disabled = false;

    if (previewTbody) {
      previewTbody.innerHTML = parsed.slice(0, 100).map((emp) => `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="p-2 text-center text-slate-400 font-mono">${emp.stt}</td>
          <td class="p-2 font-bold text-slate-900">${emp.id}</td>
          <td class="p-2 text-slate-800 font-sans font-medium">${emp.name}</td>
          <td class="p-2 text-slate-500">${emp.identity}</td>
          <td class="p-2 text-slate-700">${emp.positions['18H-20H']}</td>
          <td class="p-2 text-slate-700">${emp.positions['20H-22H']}</td>
        </tr>
      `).join('');
    }

    Utils.toast(`Đã phân tích thành công ${parsed.length} nhân sự`, 'success');
  },

  async savePastedSchedule() {
    if (!this._tempParsedData || !this._tempParsedData.length) {
      Utils.toast('Chưa có dữ liệu nào được phân tích để lưu', 'warning');
      return;
    }

    const shiftSelect = document.getElementById('importScheduleShift');
    const datePicker = document.getElementById('importScheduleDate');
    const targetShift = shiftSelect ? shiftSelect.value : DataManager.state.currentShift;
    const targetDate = datePicker && datePicker.value ? datePicker.value : Utils.formatDateISO();

    Utils.showLoading('Đang lưu lịch ca vào Google Sheets & Firebase...');

    try {
      const res = await DataManager.callApi('save', {
        shift: targetShift,
        date: targetDate,
        roster: this._tempParsedData
      });

      Utils.hideLoading();

      // Cập nhật State và Cache cục bộ
      DataManager.state.roster = this._tempParsedData;
      DataManager.saveCachedRoster(targetShift, this._tempParsedData);
      DataManager.recalculateStats();

      // Đồng bộ sang Admin UI
      const adminShiftSelect = document.getElementById('adminShiftSelect');
      const adminDateSelect = document.getElementById('adminShiftDate');
      if (adminShiftSelect) adminShiftSelect.value = targetShift;
      if (adminDateSelect) adminDateSelect.value = targetDate;

      AdminUI.updateStatsCards();
      AdminUI.renderRosterTable();
      AdminUI.renderActivityFeed();

      Utils.showAlert(
        'Cập Nhật Lịch Thành Công!',
        `Đã cập nhật thành công <strong>${this._tempParsedData.length}</strong> nhân sự vào ca <strong>${targetShift}</strong> ngày <strong>${targetDate}</strong>.`,
        'success'
      );

      window.App?.closeModal('modalCapNhatLich');
      this.clearPasteArea();
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  },

  async clearShiftSchedule() {
    const shiftSelect = document.getElementById('importScheduleShift');
    const targetShift = shiftSelect ? shiftSelect.value : DataManager.state.currentShift;

    const confirm = await Utils.confirm(
      'Xác nhận xóa lịch ca',
      `Bạn có chắc chắn muốn xóa toàn bộ lịch của ca <strong>${targetShift}</strong> để làm mới từ đầu không?`
    );

    if (!confirm.isConfirmed) return;

    Utils.showLoading('Đang xóa lịch ca...');

    try {
      await DataManager.callApi('save', {
        shift: targetShift,
        date: DataManager.state.currentDate,
        roster: []
      });

      Utils.hideLoading();
      DataManager.state.roster = [];
      DataManager.saveCachedRoster(targetShift, []);
      DataManager.recalculateStats();

      AdminUI.updateStatsCards();
      AdminUI.renderRosterTable();
      AdminUI.renderActivityFeed();

      Utils.toast('Đã làm trống lịch ca trực thành công!', 'info');
      window.App?.closeModal('modalCapNhatLich');
      this.clearPasteArea();
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  }
};

if (typeof window !== 'undefined') {
  window.AdminManager = AdminManager;
}

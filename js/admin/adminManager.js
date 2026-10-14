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

    // Nút Mở Cài Đặt Khung Giờ & Cấu Hình Đăng Ký (Ảnh 2)
    const btnOpenSettings = document.getElementById('btnOpenSettingsModal');
    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
    }

    // Nút Lưu Cài Đặt (Ảnh 2)
    const btnSaveSettings = document.getElementById('btnSaveSettingsModal');
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => this.saveSettingsModal());
    }

    // Nút Xóa Toàn Bộ Lịch Cũ trong Cài Đặt (Ảnh 2)
    const btnResetOldReg = document.getElementById('btnSettingsResetRegistrations');
    if (btnResetOldReg) {
      btnResetOldReg.addEventListener('click', () => {
        if (window.AdminRegistration && typeof window.AdminRegistration.handleResetRegistrations === 'function') {
          window.AdminRegistration.handleResetRegistrations();
        }
      });
    }

    // Dropdown Cập Nhật Trạng Thái & Nút Xác Nhận (Ảnh 1)
    const modalStatusSelect = document.getElementById('modalStatusSelect');
    const btnConfirmStatus = document.getElementById('btnConfirmApplyStatus');
    if (btnConfirmStatus) {
      btnConfirmStatus.addEventListener('click', () => {
        const val = modalStatusSelect ? modalStatusSelect.value : '';
        this.handleApplyStatus(val);
      });
    }
    if (modalStatusSelect) {
      modalStatusSelect.addEventListener('change', (e) => this.handleApplyStatus(e.target.value));
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
      const targetEmp = DataManager.state.roster.find((e) => 
        Utils.isIdMatch(e.id, empId) || 
        Utils.isIdMatch(e.cccd, empId) || 
        String(e.id || '').trim().toLowerCase() === String(empId || '').trim().toLowerCase() ||
        String(e.stt || '').trim() === String(empId || '').trim()
      );
      if (targetEmp) {
        if (!targetEmp.positions) targetEmp.positions = {};
        const inputs = row.querySelectorAll('.pos-input');
        inputs.forEach((inp) => {
          const key = inp.dataset.posKey;
          const val = inp.value.trim();
          if (key === 'NOTE') {
            targetEmp.note = val;
            targetEmp.positions['NOTE'] = val;
          } else {
            targetEmp.positions[key] = val;
          }
        });
      }
    });

    Utils.showLoading('Đang lưu lịch và đồng bộ lên Google Sheets & Firebase...');

    try {
      const colHeaders = ['Vị trí cố định', 'SAU GIỜ NGHỈ', '4h-6h', 'Xuất Tải'];
      const res = await DataManager.saveSchedule(shiftId, DataManager.state.roster, colHeaders);
      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert('Đã lưu thành công', 'Bảng phân bổ vị trí đã được cập nhật lên Google Sheets và Firebase.', 'success');
      } else {
        Utils.toast('Đã lưu dữ liệu vào hệ thống và Firebase', 'success');
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

  // ==================== CẬP NHẬT TRẠNG THÁI (Ảnh 1) ====================
  _targetStatusEmpId: null,

  /**
   * Mở modal chọn trạng thái nhân viên (Ảnh 1)
   */
  openStatusModal(empId) {
    this._targetStatusEmpId = empId;
    const targetInput = document.getElementById('modalStatusTargetEmpId');
    if (targetInput) targetInput.value = empId;

    const cleanEmpId = String(empId || '').trim();
    const emp = DataManager.state.roster.find((e) => 
      Utils.isIdMatch(e.id, cleanEmpId) || 
      Utils.isIdMatch(e.cccd, cleanEmpId) || 
      String(e.id || '').trim().toLowerCase() === cleanEmpId.toLowerCase() ||
      String(e.stt || '').trim() === cleanEmpId
    );

    const infoEl = document.getElementById('modalStatusTargetInfo');
    if (infoEl) {
      if (emp) {
        infoEl.innerHTML = `
          <div class="font-bold text-sm text-white">${emp.name || 'Nhân viên'}</div>
          <div class="text-[11px] text-cyan-400 font-mono mt-0.5">Mã: ${emp.id || emp.cccd || cleanEmpId} ${emp.identity ? '• ' + emp.identity : ''}</div>
        `;
      } else {
        infoEl.innerHTML = `<span class="text-slate-300">Nhân sự: ${cleanEmpId}</span>`;
      }
    }

    const select = document.getElementById('modalStatusSelect');
    if (select) {
      const curStatus = (emp?.status || 'pending').toLowerCase();
      if (curStatus === 'confirmed' || curStatus === 'đã điểm danh') {
        select.value = 'confirmed';
      } else if (curStatus === 'off' || curStatus === 'xin off') {
        select.value = 'off';
      } else if (curStatus === 'xin_len_ca' || curStatus === 'xin lên ca') {
        select.value = 'xin_len_ca';
      } else {
        select.value = 'pending';
      }
    }

    window.App?.openModal('modalCapNhatTrangThai');
  },

  /**
   * Áp dụng trạng thái được chọn từ dropdown hoặc nút bấm xác nhận
   */
  async handleApplyStatus(selectedStatus) {
    const empId = this._targetStatusEmpId || document.getElementById('modalStatusTargetEmpId')?.value;
    if (!empId) {
      Utils.toast('Không tìm thấy thông tin nhân sự', 'warning');
      return;
    }

    const cleanEmpId = String(empId || '').trim();
    const emp = DataManager.state.roster.find((e) => 
      Utils.isIdMatch(e.id, cleanEmpId) || 
      Utils.isIdMatch(e.cccd, cleanEmpId) || 
      String(e.id || '').trim().toLowerCase() === cleanEmpId.toLowerCase() ||
      String(e.stt || '').trim() === cleanEmpId
    );

    if (!emp) {
      Utils.toast('Không tìm thấy nhân viên trong danh sách ca!', 'error');
      return;
    }

    const selectEl = document.getElementById('modalStatusSelect');
    const targetStatus = selectedStatus || selectEl?.value || 'pending';

    let statusLabel = '';
    if (targetStatus === 'confirmed') {
      emp.status = 'confirmed';
      emp.checkinTime = Utils.getCurrentVNTime();
      statusLabel = 'Đã Điểm Danh';
    } else if (targetStatus === 'off') {
      emp.status = 'off';
      emp.checkinTime = '';
      statusLabel = 'Xin Off';
    } else if (targetStatus === 'xin_len_ca') {
      emp.status = 'confirmed';
      emp.identity = 'A-OS';
      emp.checkinTime = Utils.getCurrentVNTime();
      statusLabel = 'Xin Lên Ca (Đã Điểm Danh)';
    } else {
      emp.status = 'pending';
      emp.checkinTime = '';
      statusLabel = 'Chưa Điểm Danh';
    }

    const shiftSelect = document.getElementById('adminShiftSelect');
    const shiftId = shiftSelect ? shiftSelect.value : DataManager.state.currentShift;

    // 1. Lưu vào LocalStorage
    DataManager.saveCachedRoster(shiftId, DataManager.state.roster);

    // 2. Lưu lên Firebase Realtime Firestore (Tầng 1 - Realtime Cloud Layer)
    if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
      FirebaseService.saveRoster(shiftId, DataManager.state.roster).catch((err) => {
        console.warn('[Firebase] saveRoster error:', err);
      });
      if (emp.status === 'confirmed') {
        FirebaseService.recordCheckinRealtime(shiftId, emp).catch((err) => {
          console.warn('[Firebase] recordCheckinRealtime error:', err);
        });
      }
    }

    // 3. Đồng bộ lên Google Sheets qua GAS (Tầng 2 - Database Cloud Layer)
    DataManager.callApi('checkin', {
      shift: shiftId,
      shiftId: shiftId,
      identifier: emp.id || emp.cccd || emp.stt,
      empId: emp.id || emp.cccd,
      name: emp.name,
      forceStatus: emp.status,
      timestamp: emp.checkinTime || ''
    }).catch((err) => {
      console.warn('[AdminManager] GAS checkin sync error:', err);
    });

    // 4. Tính lại số liệu thống kê & Re-render giao diện Bảng Admin
    DataManager.recalculateStats();
    AdminUI.updateStatsCards();
    AdminUI.renderRosterTable();
    AdminUI.renderActivityFeed();

    // 5. Đóng modal và hiển thị toast
    window.App?.closeModal('modalCapNhatTrangThai');
    Utils.toast(`Đã cập nhật: ${emp.name} → ${statusLabel}`, 'success');
  },

  toggleEmployeeStatus(empId) {
    this.openStatusModal(empId);
  },

  // ==================== CÀI ĐẶT KHUNG GIỜ & CẤU HÌNH ĐĂNG KÝ (Ảnh 2) ====================
  openSettingsModal() {
    const apiInput = document.getElementById('settingsApiLinkInput');
    const fromInput = document.getElementById('settingsRegDateFrom');
    const toInput = document.getElementById('settingsRegDateTo');

    if (apiInput) {
      apiInput.value = localStorage.getItem('agari_custom_gas_url') || CONFIG.APPS_SCRIPT_URL;
    }
    if (fromInput) {
      fromInput.value = localStorage.getItem('agari_reg_date_from') || '2026-10-16';
    }
    if (toInput) {
      toInput.value = localStorage.getItem('agari_reg_date_to') || '2026-10-31';
    }

    window.App?.openModal('settingsModal');
  },

  async saveSettingsModal() {
    const apiInput = document.getElementById('settingsApiLinkInput');
    const fromInput = document.getElementById('settingsRegDateFrom');
    const toInput = document.getElementById('settingsRegDateTo');

    const newUrl = apiInput ? apiInput.value.trim() : '';
    const dateFrom = fromInput ? fromInput.value : '2026-10-16';
    const dateTo = toInput ? toInput.value : '2026-10-31';

    if (newUrl) {
      CONFIG.APPS_SCRIPT_URL = newUrl;
      localStorage.setItem('agari_custom_gas_url', newUrl);
    }

    if (dateFrom && dateTo) {
      localStorage.setItem('agari_reg_date_from', dateFrom);
      localStorage.setItem('agari_reg_date_to', dateTo);

      // Cập nhật tab 2 nếu input tồn tại
      const regFrom = document.getElementById('regConfigDateFrom');
      const regTo = document.getElementById('regConfigDateTo');
      if (regFrom) regFrom.value = dateFrom;
      if (regTo) regTo.value = dateTo;

      // Làm mới lịch của cổng nhân viên
      if (window.RegApp && typeof window.RegApp.generateCycleDays === 'function') {
        window.RegApp.generateCycleDays();
      }

      Utils.showLoading('Đang lưu cài đặt chu kỳ lên Google Sheets...');
      try {
        await DataManager.callApi('save_reg_config', { dateFrom, dateTo });
      } catch (err) {
        console.warn('Lỗi gọi save_reg_config:', err);
      }
      Utils.hideLoading();
    }

    window.App?.closeModal('settingsModal');
    Utils.toast('Đã lưu cấu hình cài đặt thành công!', 'success');
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
        // Cấu trúc chuẩn theo Google Sheets:
        // [0] STT, [1] Mã CTV, [2] Họ tên, [3] Định danh, [4] Vị trí cố định, [5] SAU GIỜ NGHỈ, [6] 4h-6h, [7] Xuất Tải, [8] NOTE
        const rawId = cols[1] !== undefined ? cols[1].trim() : '';
        const rawName = cols[2] !== undefined ? cols[2].trim() : (cols[1] || '');
        const identity = cols[3] !== undefined ? cols[3].trim() : 'A-OS';
        const pos1 = cols[4] !== undefined ? cols[4].trim() : '';
        const pos2 = cols[5] !== undefined ? cols[5].trim() : '';
        const pos3 = cols[6] !== undefined ? cols[6].trim() : '';
        const pos4 = cols[7] !== undefined ? cols[7].trim() : '';
        const note = cols[8] !== undefined ? cols[8].trim() : '';

        // Bỏ qua dòng tiêu đề nếu copy cả header
        const lowerId = rawId.toLowerCase();
        if (lowerId === 'mã ctv' || lowerId === 'mã ops' || lowerId === 'mã nv' || rawName.toLowerCase() === 'họ tên') {
          continue;
        }

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
            identity: identity || 'A-OS',
            status: empStatus,
            checkinTime: checkinTime,
            note: note,
            positions: {
              'Vị trí cố định': pos1 || 'Chưa xếp',
              'SAU GIỜ NGHỈ': pos2 || 'Chưa xếp',
              '4h-6h': pos3 || '',
              'Xuất Tải': pos4 || '',
              'NOTE': note || ''
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
          <td class="p-2 text-slate-800 font-sans font-medium whitespace-nowrap">${emp.name}</td>
          <td class="p-2 text-slate-500 font-mono">${emp.identity}</td>
          <td class="p-2 text-slate-700">${emp.positions['Vị trí cố định']}</td>
          <td class="p-2 text-slate-700">${emp.positions['SAU GIỜ NGHỈ']}</td>
          <td class="p-2 text-slate-700">${emp.positions['4h-6h']}</td>
          <td class="p-2 text-slate-700">${emp.positions['Xuất Tải']}</td>
          <td class="p-2 text-slate-500">${emp.note || ''}</td>
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
      const colHeaders = (this._tempParsedData[0] && this._tempParsedData[0].positions)
        ? Object.keys(this._tempParsedData[0].positions)
        : ['18H-20H', '20H-22H'];

      const res = await DataManager.saveSchedule(targetShift, this._tempParsedData, colHeaders);

      Utils.hideLoading();

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
        `Đã lưu thành công <strong>${this._tempParsedData.length}</strong> nhân sự vào ca <strong>${targetShift}</strong> và đồng bộ lên Google Sheets & Firebase.`,
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

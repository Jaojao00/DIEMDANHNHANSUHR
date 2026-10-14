// MODULE QUẢN LÝ ĐĂNG KÝ LỊCH LÀM VIỆC (TAB 2: REGISTRATION)
const AdminRegistration = {
  regData: [],

  init() {
    this.bindEvents();
    this.initDates();
  },

  initDates() {
    const fromInput = document.getElementById('regConfigDateFrom');
    const toInput = document.getElementById('regConfigDateTo');
    if (fromInput && toInput) {
      fromInput.value = localStorage.getItem('agari_reg_date_from') || '2026-10-16';
      toInput.value = localStorage.getItem('agari_reg_date_to') || '2026-10-31';
    }
  },

  bindEvents() {
    // Form cài đặt chu kỳ đăng ký
    const formConfig = document.getElementById('formRegConfig');
    if (formConfig) {
      formConfig.addEventListener('submit', (e) => this.handleSaveConfig(e));
    }

    // Nút Đồng bộ Roster cưỡng bức
    const btnSyncRoster = document.getElementById('btnForceSyncRoster');
    if (btnSyncRoster) {
      btnSyncRoster.addEventListener('click', () => this.handleForceSyncRoster());
    }

    // Nút Xóa đăng ký cũ
    const btnResetReg = document.getElementById('btnResetRegistrations');
    if (btnResetReg) {
      btnResetReg.addEventListener('click', () => this.handleResetRegistrations());
    }

    // Nút chuyển sang tab Yêu Cầu Đổi Lịch (CR_)
    const btnTabSubRequests = document.getElementById('btnSubTabRequests');
    const btnTabSubRegList = document.getElementById('btnSubTabRegList');
    if (btnTabSubRequests && btnTabSubRegList) {
      btnTabSubRequests.addEventListener('click', () => {
        document.getElementById('paneSubRegList')?.classList.add('hidden');
        document.getElementById('paneSubRequests')?.classList.remove('hidden');
        btnTabSubRequests.classList.add('bg-slate-700', 'text-white');
        btnTabSubRegList.classList.remove('bg-slate-700', 'text-white');
        AdminRequests.loadRequests();
      });

      btnTabSubRegList.addEventListener('click', () => {
        document.getElementById('paneSubRegList')?.classList.remove('hidden');
        document.getElementById('paneSubRequests')?.classList.add('hidden');
        btnTabSubRegList.classList.add('bg-slate-700', 'text-white');
        btnTabSubRequests.classList.remove('bg-slate-700', 'text-white');
        this.loadRegistrations();
      });
    }
  },

  async loadRegistrations() {
    const tbody = document.getElementById('adminRegTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-agari-red mb-2"></div>
            <div>Đang tải bảng đăng ký lịch từ Sheets...</div>
          </td>
        </tr>
      `;
    }

    try {
      const res = await DataManager.callApi('get_registrations');
      if (res && res.success && Array.isArray(res.data)) {
        this.regData = res.data;
      } else {
        this.regData = this.generateSampleRegData();
      }
      this.renderTable();
    } catch (err) {
      console.warn('Lỗi load registrations:', err);
      this.regData = this.generateSampleRegData();
      this.renderTable();
    }
  },

  renderTable() {
    const tbody = document.getElementById('adminRegTableBody');
    if (!tbody) return;

    if (this.regData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400">
            Chưa có nhân viên nào đăng ký lịch trong kỳ này.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.regData.map((emp, idx) => `
      <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/80 text-sm">
        <td class="p-3 text-center text-slate-400 font-mono">${idx + 1}</td>
        <td class="p-3 font-mono font-bold text-agari-yellow">${emp.empId}</td>
        <td class="p-3 font-medium text-white">${emp.name}</td>
        <td class="p-3 text-slate-400 font-mono text-xs">${emp.phone}</td>
        <td class="p-3 font-mono text-slate-300 text-xs">${emp.shift}</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs font-bold">
            ${emp.workDaysCount || 12} ngày làm
          </span>
        </td>
        <td class="p-3 text-center font-mono text-slate-400 text-xs">${emp.timestamp || Utils.formatDateVN()}</td>
      </tr>
    `).join('');
  },

  async handleSaveConfig(e) {
    e.preventDefault();
    const from = document.getElementById('regConfigDateFrom').value;
    const to = document.getElementById('regConfigDateTo').value;

    if (!from || !to) {
      Utils.toast('Vui lòng chọn ngày mở và đóng cổng', 'warning');
      return;
    }

    localStorage.setItem('agari_reg_date_from', from);
    localStorage.setItem('agari_reg_date_to', to);
    if (window.RegApp && typeof window.RegApp.generateCycleDays === 'function') {
      window.RegApp.generateCycleDays();
    }

    Utils.showLoading('Đang lưu cài đặt chu kỳ mở cổng đăng ký...');

    try {
      const res = await DataManager.callApi('save_reg_config', {
        dateFrom: from,
        dateTo: to
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.toast('Đã cập nhật chu kỳ mở cổng thành công!', 'success');
      } else {
        Utils.toast(res.message || 'Đã lưu cấu hình cục bộ', 'info');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  },

  async handleForceSyncRoster() {
    const confirm = await Utils.confirm(
      'Đồng bộ Roster tự động',
      'Hệ thống sẽ kéo toàn bộ nhân sự đăng ký <strong>WORK</strong> trong ngày hôm nay vào danh sách điểm danh ca trực. Bạn có muốn tiếp tục?'
    );

    if (!confirm.isConfirmed) return;

    Utils.showLoading('Đang đồng bộ dữ liệu vào bảng ca trực (Ca_)...');

    try {
      const res = await DataManager.callApi('sync_roster', {
        shift: DataManager.state.currentShift,
        date: Utils.formatDateISO()
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert('Đồng bộ thành công', 'Đã cập nhật danh sách nhân sự vào ca trực hôm nay.', 'success');
        AdminUI.loadShiftData();
      } else {
        Utils.showAlert('Thông báo', res.message || 'Đã đồng bộ dữ liệu danh sách ca.', 'info');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  },

  async handleResetRegistrations() {
    const confirm = await Utils.confirm(
      'Cảnh báo: Xóa đăng ký cũ',
      'Thao tác này sẽ lưu trữ và xóa các đăng ký lịch của kỳ trước để chuẩn bị cho chu kỳ mới. Bạn có chắc chắn không?'
    );

    if (!confirm.isConfirmed) return;

    Utils.showLoading('Đang làm mới kỳ đăng ký...');

    try {
      const res = await DataManager.callApi('reset_registrations');
      Utils.hideLoading();
      Utils.toast('Đã làm mới dữ liệu chu kỳ thành công!', 'success');
      this.regData = [];
      this.renderTable();
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  },

  generateSampleRegData() {
    return [
      { empId: 'OPS10291', name: 'Nguyễn Văn An', phone: '0912345678', shift: '18:00-22:00', workDaysCount: 14, timestamp: '10/10/2026 09:15' },
      { empId: 'OPS10452', name: 'Trần Thị Mai', phone: '0987654321', shift: '22:00-06:00', workDaysCount: 12, timestamp: '10/10/2026 10:20' },
      { empId: 'OPS10788', name: 'Lê Hoàng Nam', phone: '0901239876', shift: '18:00-22:00', workDaysCount: 15, timestamp: '11/10/2026 14:00' },
      { empId: 'OPS11023', name: 'Võ Minh Thắng', phone: '0945678901', shift: '18:00-22:00', workDaysCount: 10, timestamp: '11/10/2026 15:45' }
    ];
  }
};

if (typeof window !== 'undefined') {
  window.AdminRegistration = AdminRegistration;
}

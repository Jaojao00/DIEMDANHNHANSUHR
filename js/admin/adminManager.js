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
  }
};

if (typeof window !== 'undefined') {
  window.AdminManager = AdminManager;
}

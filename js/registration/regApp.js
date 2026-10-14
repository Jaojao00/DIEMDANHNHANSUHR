// PHÂN HỆ ĐĂNG KÝ LỊCH LÀM VIỆC ĐỊNH KỲ (REG APP)
const RegApp = {
  currentCycleDays: [],

  init() {
    this.generateCycleDays();
    this.bindEvents();
  },

  generateCycleDays() {
    // Tạo danh sách 15 ngày kế tiếp cho chu kỳ đăng ký
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 15; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = Utils.formatDateISO(d);
      const dayOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
      days.push({
        date: dateStr,
        display: `${dayOfWeek}, ${d.getDate()}/${d.getMonth() + 1}`,
        dayNum: d.getDate()
      });
    }
    this.currentCycleDays = days;
    this.renderRegistrationCalendar();
  },

  renderRegistrationCalendar() {
    const container = document.getElementById('regCalendarGrid');
    if (!container) return;

    container.innerHTML = this.currentCycleDays.map((day) => `
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:border-agari-red transition">
        <div>
          <span class="text-xs font-bold text-slate-500 uppercase block">${day.display}</span>
          <span class="text-base font-extrabold text-slate-800 font-mono">${day.date}</span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-1.5">
          <label class="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-emerald-500 has-[:checked]:text-white has-[:checked]:border-emerald-500 transition">
            <input type="radio" name="day_${day.date}" value="WORK" checked class="hidden" />
            <span>ĐI LÀM</span>
          </label>
          <label class="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500 transition">
            <input type="radio" name="day_${day.date}" value="OFF" class="hidden" />
            <span>NGHỈ</span>
          </label>
        </div>
      </div>
    `).join('');
  },

  bindEvents() {
    // Form gửi đăng ký lịch
    const formReg = document.getElementById('formSubmitRegistration');
    if (formReg) {
      formReg.addEventListener('submit', (e) => this.handleSubmitRegistration(e));
    }

    // Form xin sửa lịch đã đăng ký (Change Request)
    const formChangeRequest = document.getElementById('formSubmitChangeRequest');
    if (formChangeRequest) {
      formChangeRequest.addEventListener('submit', (e) => this.handleSubmitChangeRequest(e));
    }
  },

  async handleSubmitRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const shift = form.shift.value;

    if (!empId || !empName || !phone) {
      Utils.toast('Vui lòng điền đầy đủ thông tin cá nhân', 'warning');
      return;
    }

    // Thu thập các ngày đã tích chọn
    const selections = {};
    this.currentCycleDays.forEach((day) => {
      const selected = form.querySelector(`input[name="day_${day.date}"]:checked`);
      selections[day.date] = selected ? selected.value : 'WORK';
    });

    Utils.showLoading('Đang lưu đăng ký lịch làm việc...');

    try {
      const res = await RegAPI.submitRegistration({
        empId,
        empName,
        phone,
        shift,
        selections: JSON.stringify(selections)
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert(
          'Đăng Ký Thành Công!',
          'Lịch làm việc của bạn đã được ghi nhận vào hệ thống. Quản trị viên sẽ tổng hợp vào danh sách ca trực.',
          'success'
        );
        form.reset();
        window.App?.closeModal('modalDangKyLich');
      } else {
        Utils.showAlert('Thông báo', res.message || 'Đã gửi lịch làm việc thành công!', 'success');
        window.App?.closeModal('modalDangKyLich');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  },

  async handleSubmitChangeRequest(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const shift = form.shift.value;
    const details = form.details.value.trim();

    if (!empId || !empName || !details) {
      Utils.toast('Vui lòng điền thông tin và chi tiết cần đổi lịch', 'warning');
      return;
    }

    const requestId = 'CR_' + Utils.sanitizeId(empId) + '_' + Date.now().toString().slice(-4);

    Utils.showLoading('Đang tạo mã yêu cầu đổi lịch...');

    try {
      const res = await RegAPI.submitChangeRequest({
        requestId: requestId,
        empId: empId,
        empName: empName,
        shiftId: shift,
        selections: details,
        status: 'pending'
      });

      Utils.hideLoading();

      Utils.showAlert(
        'Đã gửi yêu cầu đổi lịch!',
        `Mã yêu cầu của bạn là: <strong>${requestId}</strong>. Vui lòng theo dõi trạng thái hoặc liên hệ Admin Zalo ca trực.`,
        'success'
      );
      form.reset();
      window.App?.closeModal('modalChangeRequest');
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi', err.message, 'error');
    }
  }
};

if (typeof window !== 'undefined') {
  window.RegApp = RegApp;
}

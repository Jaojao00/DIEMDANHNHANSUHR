// PHÂN HỆ ĐĂNG KÝ LỊCH LÀM VIỆC ĐỊNH KỲ (REG APP)
const RegApp = {
  currentCycleDays: [],

  init() {
    this.generateCycleDays();
    this.bindEvents();
  },

  generateCycleDays() {
    // Lấy chu kỳ ngày được cấu hình từ Admin hoặc mặc định 16/10/2026 - 31/10/2026
    const savedFrom = localStorage.getItem('agari_reg_date_from') || '2026-10-16';
    const savedTo = localStorage.getItem('agari_reg_date_to') || '2026-10-31';

    const days = [];
    let curr = new Date(savedFrom + 'T00:00:00');
    const end = new Date(savedTo + 'T00:00:00');

    if (isNaN(curr.getTime()) || isNaN(end.getTime()) || curr > end) {
      const today = new Date();
      for (let i = 1; i <= 15; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = Utils.formatDateISO(d);
        const dayOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][d.getDay()];
        const dayFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        days.push({
          date: dateStr,
          display: `${dayOfWeek}, ${d.getDate()}/${d.getMonth() + 1}`,
          label: `${dayFormatted} (${dayOfWeek})`,
          dayNum: d.getDate()
        });
      }
    } else {
      while (curr <= end) {
        const dateStr = Utils.formatDateISO(curr);
        const dayOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][curr.getDay()];
        const dayFormatted = `${String(curr.getDate()).padStart(2, '0')}/${String(curr.getMonth() + 1).padStart(2, '0')}/${curr.getFullYear()}`;
        days.push({
          date: dateStr,
          display: `${dayOfWeek}, ${curr.getDate()}/${curr.getMonth() + 1}`,
          label: `${dayFormatted} (${dayOfWeek})`,
          dayNum: curr.getDate()
        });
        curr.setDate(curr.getDate() + 1);
      }
    }

    this.currentCycleDays = days;
    this.renderRegistrationCalendar();
  },

  renderRegistrationCalendar() {
    const container = document.getElementById('regCalendarGrid');
    if (!container) return;

    container.innerHTML = this.currentCycleDays.map((day) => `
      <div class="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-agari-red transition shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center font-bold text-slate-700 flex-shrink-0">
            <span class="text-[10px] uppercase text-slate-500">${day.display.split(',')[0]}</span>
            <span class="text-sm font-extrabold text-agari-red leading-none">${day.dayNum}</span>
          </div>
          <div>
            <span class="text-xs sm:text-sm font-bold text-slate-800">${day.display}</span>
            <span class="text-xs text-slate-400 font-mono block">${day.date}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="cursor-pointer flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-emerald-500 has-[:checked]:text-white has-[:checked]:border-emerald-500 transition">
            <input type="radio" name="day_${day.date}" value="WORK" checked class="hidden" />
            <span>ĐI LÀM</span>
          </label>
          <label class="cursor-pointer flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 has-[:checked]:bg-red-500 has-[:checked]:text-white has-[:checked]:border-red-500 transition">
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
    const empId = form.empId.value.trim().toUpperCase();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const shiftSelect = form.shift;
    const shiftId = shiftSelect.value;
    const selectedOptText = shiftSelect.options[shiftSelect.selectedIndex]?.text || '';
    const matchLabel = selectedOptText.match(/\((.*?)\)/);
    const shiftLabel = matchLabel ? matchLabel[1] : 'Ca Tối';
    const osGender = form.osGender ? form.osGender.value : 'OS NAM';

    if (!empId || !empName || !phone) {
      Utils.toast('Vui lòng điền đầy đủ thông tin cá nhân', 'warning');
      return;
    }

    // Thu thập các ngày đã tích chọn thành mảng đối tượng { date, label, choice } chuẩn theo backend
    const selectionsArray = this.currentCycleDays.map((day) => {
      const selected = form.querySelector(`input[name="day_${day.date}"]:checked`);
      return {
        date: day.date,
        label: day.label,
        choice: selected ? selected.value : 'WORK'
      };
    });

    Utils.showLoading('Đang gửi đăng ký lịch làm việc lên Google Sheets...');

    try {
      const payload = {
        empId,
        empName,
        empPhone: phone,
        phone,
        osGender,
        shiftId,
        shift: shiftId,
        shiftLabel,
        selections: selectionsArray
      };

      const res = await RegAPI.submitRegistration(payload);

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert(
          'Đăng Ký Thành Công!',
          `Lịch làm việc của bạn (${empName} - ${shiftLabel}) đã được ghi nhận trực tiếp vào Google Sheets hệ thống.`,
          'success'
        );
        form.reset();
        window.App?.closeModal('modalDangKyLich');
      } else {
        const errorMsg = (res && (res.error || res.message)) 
          ? (res.error || res.message) 
          : 'Không thể ghi nhận lên Google Sheets. Vui lòng kiểm tra lại!';
        Utils.showAlert('Đăng Ký Thất Bại', errorMsg, 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi Kết Nối', err.message, 'error');
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

// PHÂN HỆ ĐĂNG KÝ LỊCH LÀM VIỆC ĐỊNH KỲ (REG APP)
const RegApp = {
  currentCycleDays: [],

  init() {
    this.generateCycleDays();
    this.bindEvents();
    this.initLookupSchedule();

    if (typeof Utils !== "undefined" && Utils.bindOpsInputValidation) {
      Utils.bindOpsInputValidation(document.querySelector("#formSubmitRegistration input[name=\"empId\"]"));
      Utils.bindOpsInputValidation(document.getElementById("lookupScheduleEmpId"));
    }
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

    const cleanEmpId = Utils.normalizeOpsId(empId);
    if (!Utils.isValidOpsId(cleanEmpId)) {
      Utils.showAlert('Mã OPS Không Hợp Lệ', Utils.getOpsIdErrorMessage(empId), 'warning');
      if (form.empId) {
        form.empId.focus();
        form.empId.select();
      }
      return;
    }
    if (form.empId) form.empId.value = cleanEmpId;

    // Thu thập các ngày đã tích chọn thành mảng đối tượng { date, label, choice } chuẩn theo backend
    const selectionsArray = this.currentCycleDays.map((day) => {
      const selected = form.querySelector(`input[name="day_${day.date}"]:checked`);
      return {
        date: day.date,
        label: day.label,
        choice: selected ? selected.value : 'WORK'
      };
    });

    Utils.showLoading('Đang lưu đăng ký lịch làm việc vào hệ thống...');

    try {
      const payload = {
        empId: cleanEmpId,
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
          `Lịch làm việc của bạn (${empName} - ${shiftLabel}) đã được ghi nhận thành công.<br><br><div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold leading-relaxed">✓ Hệ thống đã tự động lưu dữ liệu.<br>Bạn KHÔNG CẦN phải chụp màn hình hay trình báo lại cho Quản trị viên/Quản lý!</div>`,
          'success'
        );
        form.reset();
        window.App?.closeModal('modalDangKyLich');
      } else {
        const errorMsg = (res && (res.error || res.message)) 
          ? (res.error || res.message) 
          : 'Không thể ghi nhận vào hệ thống. Vui lòng thử lại sau!';
        Utils.showAlert('Đăng Ký Thất Bại', errorMsg, 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi Kết Nối', err.message, 'error');
    }
  },

  async handleSubmitChangeRequest(e) {
    if (e && e.preventDefault) e.preventDefault();
    Utils.showAlert(
      'Tạm Đóng Bảo Trì',
      'Tính năng sửa lịch đã đăng ký (Change Request) hiện đang tạm đóng để bảo trì & nâng cấp dữ liệu. Quý anh/chị vui lòng liên hệ trực tiếp Quản lý ca hoặc Admin Zalo hỗ trợ để được hướng dẫn!',
      'warning'
    );
  },

  initLookupSchedule() {
    const form = document.getElementById('formLookupSchedule');
    const input = document.getElementById('lookupScheduleEmpId');

    // Auto-fill từ mã nhân viên đã nhập gần nhất
    const autoFillEmpId = () => {
      if (input && !input.value) {
        const savedId = localStorage.getItem(CONFIG.STORAGE_KEYS.EMP_ID) || 
                        localStorage.getItem('agari_emp_id') || 
                        document.getElementById('inputEmpId')?.value || '';
        if (savedId) {
          input.value = savedId.trim().toUpperCase();
        }
      }
    };

    autoFillEmpId();

    // Lắng nghe khi mở modalLookupSchedule để auto fill
    document.querySelectorAll('[data-open-modal="modalLookupSchedule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        autoFillEmpId();
        // Nếu đã có sẵn mã và kết quả đang trống, tự động tra cứu luôn
        const curVal = input?.value?.trim();
        const resArea = document.getElementById('scheduleLookupResultArea');
        if (curVal && resArea && resArea.querySelector('.border-dashed')) {
          this.handleLookupSchedule(curVal);
        }
      });
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const empId = (input ? input.value : '').trim().toUpperCase();
        if (!empId) {
          Utils.toast('Vui lòng nhập Mã OPS', 'warning');
          return;
        }
        const cleanEmpId = Utils.normalizeOpsId(empId);
        if (!Utils.isValidOpsId(cleanEmpId)) {
          Utils.showAlert('Mã OPS Không Hợp Lệ', Utils.getOpsIdErrorMessage(empId), 'warning');
          if (input) { input.focus(); input.select(); }
          return;
        }
        if (input) input.value = cleanEmpId;
        this.handleLookupSchedule(cleanEmpId);
      });
    }

    if (input) {
      input.addEventListener('input', () => {
        input.value = input.value.toUpperCase();
      });
    }
  },

  async handleLookupSchedule(empId) {
    const resultArea = document.getElementById('scheduleLookupResultArea');
    const btn = document.getElementById('btnDoLookupSchedule');
    if (!resultArea) return;

    resultArea.innerHTML = `
      <div class="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-sky-500 border-t-transparent mb-3"></div>
        <div class="text-sm font-bold text-slate-800">Đang tra cứu lịch làm việc của ${empId}...</div>
        <div class="text-xs text-slate-400 mt-1">Đang đọc trực tiếp bảng đăng ký Google Sheets...</div>
      </div>
    `;

    if (btn) btn.disabled = true;

    try {
      const data = await RegAPI.getRegistration(empId);
      this.renderScheduleLookupResult(data, empId);
    } catch (err) {
      console.error('[handleLookupSchedule] Lỗi:', err);
      resultArea.innerHTML = `
        <div class="p-6 bg-red-50 rounded-2xl border border-red-200 text-center">
          <div class="text-2xl mb-2">❌</div>
          <div class="text-sm font-bold text-red-800 mb-1">Không thể tải dữ liệu lịch đăng ký</div>
          <div class="text-xs text-red-600 mb-4">${err.message || 'Lỗi kết nối máy chủ.'}</div>
          <button type="button" onclick="RegApp.handleLookupSchedule('${empId}')" class="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl shadow hover:bg-red-700 transition">
            Thử Lại
          </button>
        </div>
      `;
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  renderScheduleLookupResult(data, empId) {
    const resultArea = document.getElementById('scheduleLookupResultArea');
    if (!resultArea) return;

    if (!Array.isArray(data) || data.length === 0) {
      resultArea.innerHTML = `
        <div class="text-center py-10 bg-amber-50/60 rounded-2xl border border-dashed border-amber-300 p-6">
          <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mx-auto mb-3 shadow-sm">
            🔍
          </div>
          <h4 class="text-base font-bold text-slate-800 mb-1">
            Không tìm thấy lịch đăng ký cho: <span class="font-mono text-agari-red font-black">${empId.toUpperCase()}</span>
          </h4>
          <p class="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mt-2 mb-4">
            Quý anh/chị có thể <strong>chưa gửi đăng ký lịch</strong> hoặc <strong>nhập sai Mã OPS</strong>. Vui lòng kiểm tra lại mã hoặc bấm nút bên dưới để gửi đăng ký lịch định kỳ!
          </p>
          <div class="flex flex-wrap items-center justify-center gap-3">
            <button type="button" data-open-modal="modalDangKyLich" data-close-modal="modalLookupSchedule" class="px-5 py-2.5 rounded-xl bg-agari-red hover:bg-agari-red-dark text-white font-bold text-xs shadow transition flex items-center gap-1.5">
              <span>📋</span> Đăng Ký Lịch Mới Ngay
            </button>
          </div>
        </div>
      `;
      resultArea.querySelectorAll('[data-open-modal]').forEach(b => {
        b.addEventListener('click', (e) => {
          const targetModal = e.currentTarget.dataset.openModal;
          const closeTarget = e.currentTarget.dataset.closeModal;
          if (closeTarget) window.App?.closeModal(closeTarget);
          if (targetModal) window.App?.openModal(targetModal);
        });
      });
      return;
    }

    let html = `
      <div class="space-y-5">
        <div class="flex items-center justify-between px-1">
          <div class="text-xs font-bold text-slate-600 uppercase">
            Tìm thấy <strong>${data.length}</strong> đợt đăng ký của: <span class="text-sky-700 font-mono font-bold">${empId.toUpperCase()}</span>
          </div>
          <button type="button" onclick="RegApp.handleLookupSchedule('${empId}')" class="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 transition">
            <span>🔄</span> Tải lại
          </button>
        </div>
    `;

    data.forEach((reg, index) => {
      const selections = reg.selections || [];
      const workCount = selections.filter(s => s.choice && s.choice !== 'OFF').length;
      const offCount = selections.filter(s => !s.choice || s.choice === 'OFF').length;
      
      let formattedTime = 'Gần đây';
      if (reg.timestamp) {
        try {
          const d = new Date(reg.timestamp);
          if (!isNaN(d.getTime())) {
            formattedTime = d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          }
        } catch (e) {}
      }

      let cycleTitle = `Đợt đăng ký #${index + 1}`;
      if (selections.length > 0) {
        const firstLabel = selections[0].label || '';
        const lastLabel = selections[selections.length - 1].label || '';
        const m1 = firstLabel.match(/(\d{1,2}\/\d{1,2})/);
        const m2 = lastLabel.match(/(\d{1,2}\/\d{1,2})/);
        if (m1 && m2) {
          cycleTitle = `Chu kỳ ${m1[1]} - ${m2[1]}`;
        }
      }

      html += `
        <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow transition">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2 mb-4">
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  ${reg.shiftLabel || 'Ca Làm Việc'} (${reg.shiftId || ''})
                </span>
                <span class="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  ${cycleTitle}
                </span>
              </div>
              <h4 class="text-base sm:text-lg font-black text-slate-900 uppercase">
                ${reg.empName || empId}
              </h4>
            </div>
            <div class="text-left sm:text-right">
              <span class="text-[11px] text-slate-400 block">Thời gian nộp đơn:</span>
              <span class="text-xs font-mono font-bold text-slate-700">${formattedTime}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div class="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Đi Làm (WORK)</div>
                <div class="text-xs text-emerald-600">Đã đăng ký lên ca</div>
              </div>
              <div class="text-2xl font-black text-emerald-600">
                ${workCount} <span class="text-xs font-bold text-emerald-700">ngày</span>
              </div>
            </div>

            <div class="bg-rose-50/80 border border-rose-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div class="text-[11px] font-bold text-rose-800 uppercase tracking-wide">Nghỉ (OFF)</div>
                <div class="text-xs text-rose-600">Không đăng ký làm</div>
              </div>
              <div class="text-2xl font-black text-rose-600">
                ${offCount} <span class="text-xs font-bold text-rose-700">ngày</span>
              </div>
            </div>
          </div>

          <div class="text-xs font-bold uppercase text-slate-600 mb-2.5 flex items-center justify-between">
            <span>Chi tiết từng ngày (${selections.length} ngày):</span>
            <span class="text-[11px] text-slate-400 font-normal">Màu xanh: Đi Làm | Màu xám: Nghỉ</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
            ${selections.map((sel) => {
              const isWork = sel.choice && sel.choice !== 'OFF';
              const choiceText = isWork ? (sel.choice === 'WORK' ? (reg.shiftLabel || 'ĐI LÀM') : sel.choice) : 'NGHỈ (OFF)';
              return `
                <div class="flex items-center justify-between p-2.5 rounded-xl border transition ${isWork ? 'bg-emerald-50/50 border-emerald-300/80' : 'bg-slate-50 border-slate-200'}">
                  <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg ${isWork ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'} flex items-center justify-center text-xs font-black flex-shrink-0">
                      ${isWork ? '✓' : '✕'}
                    </span>
                    <span class="text-xs font-semibold text-slate-800">${sel.label}</span>
                  </div>
                  <div>
                    ${isWork 
                      ? `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-600 text-white shadow-sm">${choiceText}</span>`
                      : `<span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-600">OFF</span>`
                    }
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    html += `</div>`;
    resultArea.innerHTML = html;
  }
};

if (typeof window !== 'undefined') {
  window.RegApp = RegApp;
}

// XỬ LÝ NGHIỆP VỤ PHÍA CỔNG NHÂN VIÊN (EMPLOYEE PORTAL)
const EmployeeModule = {
  salaryChartInstance: null,

  init() {
    this.bindEvents();
    this.initDefaultShift();
  },

  initDefaultShift() {
    const shiftSelect = document.getElementById('empShiftSelect');
    if (shiftSelect) {
      shiftSelect.innerHTML = CONFIG.SHIFTS.map((s) => {
        return `<option value="${s.id}" ${s.isDefault ? 'selected' : ''}>${s.label}</option>`;
      }).join('');
    }
  },

  bindEvents() {
    // 1. Chọn ca làm việc (Giai đoạn 1 -> Giai đoạn 2)
    const shiftCards = document.querySelectorAll('#shiftCardsList .shift-card-item');
    shiftCards.forEach((card) => {
      card.addEventListener('click', () => {
        const shiftId = card.getAttribute('data-shift');
        if (shiftId) this.selectShift(shiftId);
      });
    });

    // 2. Nút Quay lại chọn ca
    const btnBack = document.getElementById('btnBackToShifts');
    if (btnBack) {
      btnBack.addEventListener('click', () => this.backToShifts());
    }

    // 3. Form Điểm danh
    const attForm = document.getElementById('attendanceForm');
    if (attForm) {
      attForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCheckin();
      });
    }

    const btnCheckin = document.getElementById('btnQuickCheckin');
    if (btnCheckin) {
      btnCheckin.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleCheckin();
      });
    }

    // 4. Auto lookup khi nhập Mã Nhân Viên
    const empInput = document.getElementById('empIdentifierInput');
    if (empInput) {
      const handleLookup = () => {
        const val = empInput.value.trim().toUpperCase();
        if (val) this.lookupAndAutofill(val);
      };

      empInput.addEventListener('input', () => {
        if (empInput.value.trim().length >= 4) {
          handleLookup();
        }
      });
      empInput.addEventListener('blur', handleLookup);
    }

    const btnAutoLookup = document.getElementById('btnAutoLookup');
    if (btnAutoLookup) {
      btnAutoLookup.addEventListener('click', () => {
        const val = (document.getElementById('empIdentifierInput')?.value || '').trim().toUpperCase();
        if (val) this.lookupAndAutofill(val);
      });
    }

    // Form Xin Nghỉ / Xin Off
    const formXinOff = document.getElementById('formXinOff');
    if (formXinOff) {
      formXinOff.addEventListener('submit', (e) => this.handleSubmitXinOff(e));
    }

    // Form Xin Lên Ca (Thế Ca / Tăng Cường)
    const formXinLenCa = document.getElementById('formXinLenCa');
    if (formXinLenCa) {
      formXinLenCa.addEventListener('submit', (e) => this.handleSubmitXinLenCa(e));
    }

    // Form Cấp Đổi Áo Thẻ & Vé Xe
    const formCapDoi = document.getElementById('formCapDoiAoThe');
    if (formCapDoi) {
      formCapDoi.addEventListener('submit', (e) => this.handleSubmitCapDoiAoThe(e));
      this.initItemRequest();
    }

    // Form Khiếu Nại
    const formKhieuNai = document.getElementById('formKhieuNai');
    if (formKhieuNai) {
      formKhieuNai.addEventListener('submit', (e) => this.handleSubmitKhieuNai(e));
    }

    // Form Tra Cứu Lương Cá Nhân
    const formLookupSalary = document.getElementById('formLookupSalary');
    if (formLookupSalary) {
      formLookupSalary.addEventListener('submit', (e) => this.handleLookupSalary(e));
    }
  },

  /**
   * Chọn ca làm việc (Chuyển từ Phase 1 sang Phase 2)
   */
  selectShift(shiftId) {
    DataManager.state.currentShift = shiftId;
    const shiftSelect = document.getElementById('empShiftSelect');
    if (shiftSelect) shiftSelect.value = shiftId;

    const shiftInfo = CONFIG.SHIFTS.find((s) => s.id === shiftId) || {
      id: shiftId,
      name: shiftId,
      label: shiftId,
      time: shiftId,
      icon: '⏰'
    };

    const iconEl = document.getElementById('attShiftIcon');
    const labelEl = document.getElementById('attShiftLabel');
    const timeEl = document.getElementById('attShiftTime');
    if (iconEl) iconEl.textContent = shiftInfo.icon || '⏰';
    if (labelEl) labelEl.textContent = shiftInfo.name || shiftInfo.label;
    if (timeEl) timeEl.textContent = shiftInfo.time || shiftId;

    const phaseSelect = document.getElementById('phaseShiftSelection');
    const phaseForm = document.getElementById('phaseAttendanceForm');
    const resultArea = document.getElementById('checkinResultArea');

    if (phaseSelect) phaseSelect.classList.add('hidden');
    if (phaseForm) phaseForm.classList.remove('hidden');
    if (resultArea) {
      resultArea.classList.add('hidden');
      resultArea.innerHTML = '';
    }

    // Tải dữ liệu roster cho ca này
    DataManager.loadRoster(shiftId);

    // Khôi phục thông tin từ localStorage nếu có
    const savedId = localStorage.getItem('agr_empId') || '';
    const savedName = localStorage.getItem('agr_empName') || '';
    const savedPhone = localStorage.getItem('agr_empPhone') || '';

    const inpId = document.getElementById('empIdentifierInput');
    const inpName = document.getElementById('employeeName');
    const inpPhone = document.getElementById('employeePhone');

    if (inpId && !inpId.value && savedId) inpId.value = savedId;
    if (inpName && !inpName.value && savedName) inpName.value = savedName;
    if (inpPhone && !inpPhone.value && savedPhone) inpPhone.value = savedPhone;

    if (inpId && inpId.value) {
      this.lookupAndAutofill(inpId.value.trim().toUpperCase());
    }

    if (phaseForm) {
      phaseForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Quay lại màn hình chọn ca (Phase 2 -> Phase 1)
   */
  backToShifts() {
    const phaseSelect = document.getElementById('phaseShiftSelection');
    const phaseForm = document.getElementById('phaseAttendanceForm');
    const resultArea = document.getElementById('checkinResultArea');

    if (phaseForm) phaseForm.classList.add('hidden');
    if (phaseSelect) phaseSelect.classList.remove('hidden');
    if (resultArea) resultArea.classList.add('hidden');
  },

  /**
   * Tự động tra cứu nhân viên trong roster và điền họ tên, số điện thoại
   */
  lookupAndAutofill(val) {
    if (!val || !Array.isArray(DataManager.state.roster)) return;
    const cleanId = val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const emp = DataManager.state.roster.find((e) => {
      const eId = String(e.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const eCccd = String(e.cccd || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const eStt = String(e.stt || '').trim();
      return (eId && (eId === cleanId || eId.includes(cleanId) || cleanId.includes(eId))) ||
             (eCccd && eCccd === cleanId) ||
             (eStt && eStt === cleanId);
    });

    if (emp) {
      const nameInp = document.getElementById('employeeName');
      const phoneInp = document.getElementById('employeePhone');
      if (nameInp && emp.name) nameInp.value = emp.name;
      if (phoneInp && emp.phone) phoneInp.value = emp.phone;

      // Nếu nhân viên này đã có trạng thái điểm danh trước đó, hiển thị luôn thẻ kết quả
      if (emp.status === 'confirmed' || emp.checkinTime) {
        this.renderCheckinSuccess(emp);
      }
    }
  },

  /**
   * 2.1 Xử lý Điểm Danh (Nhập thông tin -> Xác nhận)
   */
  async handleCheckin() {
    const inputEl = document.getElementById('empIdentifierInput');
    const nameEl = document.getElementById('employeeName');
    const phoneEl = document.getElementById('employeePhone');
    const shiftEl = document.getElementById('empShiftSelect');

    if (!inputEl) return;

    const identifier = inputEl.value.trim().toUpperCase();
    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const shiftId = (shiftEl ? shiftEl.value : null) || DataManager.state.currentShift || '22:00-06:00';

    if (!identifier) {
      Utils.toast('Vui lòng nhập Mã Nhân Viên (Mã Ops)', 'warning');
      inputEl.focus();
      return;
    }

    if (!name) {
      Utils.toast('Vui lòng nhập Họ và Tên', 'warning');
      if (nameEl) nameEl.focus();
      return;
    }

    if (!phone) {
      Utils.toast('Vui lòng nhập Số điện thoại Zalo', 'warning');
      if (phoneEl) phoneEl.focus();
      return;
    }

    // 0. Kiểm tra khung giờ điểm danh theo quy định ca làm
    const currentMinutes = Utils.getVNMinutesInDay();

    // Ca Tối (18:00 - 22:00): Điểm danh từ 10h00 - 14h00
    if (shiftId === '18:00-22:00') {
      const startMinutes = 10 * 60; // 10:00 (600 phút)
      const endMinutes = 14 * 60;   // 14:00 (840 phút)
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        Utils.showAlert(
          'Ngoài Khung Giờ Điểm Danh',
          'Ca Tối (18:00 - 22:00) chỉ mở cổng điểm danh từ 10:00 đến 14:00 hàng ngày. Hiện tại ngoài khung giờ quy định, vui lòng quay lại trong khoảng 10h00 - 14h00 hoặc liên hệ Trực ca / Admin!',
          'warning'
        );
        return;
      }
    }

    // Ca Đêm (22:00 - 06:00): Điểm danh từ 14h00 - 18h00
    if (shiftId === '22:00-06:00') {
      const startMinutes = 14 * 60; // 14:00 (840 phút)
      const endMinutes = 18 * 60;   // 18:00 (1080 phút)
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        Utils.showAlert(
          'Ngoài Khung Giờ Điểm Danh',
          'Ca Đêm (22:00 - 06:00) chỉ mở cổng điểm danh từ 14:00 đến 18:00 hàng ngày. Hiện tại ngoài khung giờ quy định, vui lòng quay lại trong khoảng 14h00 - 18h00 hoặc liên hệ Trực ca / Admin!',
          'warning'
        );
        return;
      }
    }

    // Lưu vào localStorage để tái sử dụng
    localStorage.setItem('agr_empId', identifier);
    localStorage.setItem('agr_empName', name);
    localStorage.setItem('agr_empPhone', phone);

    Utils.showLoading('Đang xác thực và ghi nhận điểm danh...');

    try {
      // 1. Tìm nhân viên trong roster hiện tại (nếu đã tải)
      let localEmp = null;
      if (Array.isArray(DataManager.state.roster)) {
        const cleanId = identifier.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        localEmp = DataManager.state.roster.find((e) => {
          const eId = String(e.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const eCccd = String(e.cccd || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const eStt = String(e.stt || '').trim();
          return (eId && (eId === cleanId || eId.includes(cleanId) || cleanId.includes(eId))) ||
                 (eCccd && eCccd === cleanId) ||
                 (eStt && eStt === cleanId);
        });
      }

      // 2. Gọi API điểm danh gửi lên GAS Web App
      const response = await DataManager.callApi('checkin', {
        identifier: identifier,
        empId: identifier,
        name: name,
        phone: phone,
        shift: shiftId,
        shiftId: shiftId,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      let empData = null;
      if (response && response.success && response.data) {
        empData = response.data;
      } else if (localEmp) {
        empData = {
          ...localEmp,
          name: name || localEmp.name,
          phone: phone || localEmp.phone,
          status: 'confirmed',
          checkinTime: Utils.getCurrentVNTime()
        };
      }

      if (empData) {
        empData.status = 'confirmed';
        empData.checkinTime = empData.checkinTime || Utils.getCurrentVNTime();
        if (phone) empData.phone = phone;
        if (name && !empData.name) empData.name = name;

        // Bắn cập nhật sang Firebase Realtime
        FirebaseService.recordCheckinRealtime(shiftId, empData);

        // Cập nhật lại trong DataManager.state.roster nếu đang có sẵn danh sách đầy đủ
        if (Array.isArray(DataManager.state.roster) && DataManager.state.roster.length > 5) {
          const idx = DataManager.state.roster.findIndex(
            (e) => String(e.id || '').toLowerCase() === String(empData.id || empData.empId || '').toLowerCase()
          );
          if (idx >= 0) {
            DataManager.state.roster[idx] = { ...DataManager.state.roster[idx], ...empData };
          }
        }

        // Hiển thị thẻ kết quả & vị trí làm việc
        this.renderCheckinSuccess(empData);
        Utils.toast(`Điểm danh thành công: ${empData.name}`, 'success');

        // Bắn hiệu ứng chúc mừng (confetti) nếu có
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      } else {
        Utils.showAlert(
          'Không tìm thấy trong ca trực',
          response?.message || `Mã "${identifier}" chưa có trong danh sách phân ca "${shiftId}". Hãy kiểm tra lại ca đã chọn hoặc liên hệ Admin Zalo ca trực!`,
          'error'
        );
      }
    } catch (err) {
      Utils.hideLoading();
      console.error('Lỗi điểm danh:', err);
      if (localEmp) {
        localEmp.status = 'confirmed';
        localEmp.checkinTime = Utils.getCurrentVNTime();
        localEmp.phone = phone;
        FirebaseService.recordCheckinRealtime(shiftId, localEmp);
        this.renderCheckinSuccess(localEmp);
        Utils.toast(`Đã ghi nhận điểm danh: ${localEmp.name}`, 'success');
      } else {
        Utils.showAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ điểm danh. Vui lòng kiểm tra mạng và thử lại.', 'error');
      }
    }
  },

  /**
   * Render Thẻ kết quả điểm danh, vị trí làm việc và cảnh báo Chưa Có Vị Trí (npw-icon)
   */
  renderCheckinSuccess(emp) {
    const resultContainer = document.getElementById('checkinResultArea');
    if (!resultContainer) return;

    resultContainer.classList.remove('hidden');

    // Kiểm tra các vị trí xoay ca
    const positions = emp.positions || {};
    const posKeys = Object.keys(positions).filter((k) => k !== 'NOTE' && k !== 'Ghi Chú');
    
    // Kiểm tra xem có bị cảnh báo "Chưa có vị trí" (npw-icon)
    let hasEmptyPosition = false;
    if (posKeys.length === 0) {
      hasEmptyPosition = true;
    } else {
      for (const k of posKeys) {
        const val = (positions[k] || '').trim();
        if (!val || val === 'Chưa xếp' || val === '-') {
          hasEmptyPosition = true;
          break;
        }
      }
    }

    let positionsHtml = '';
    if (posKeys.length > 0) {
      positionsHtml = posKeys.map((k) => `
        <div class="bg-slate-50 hover:bg-white rounded-xl p-3 border border-slate-200 text-center shadow-sm transition">
          <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">${k}</div>
          <div class="text-base font-extrabold text-emerald-600 mt-1">${positions[k] || 'Chưa xếp'}</div>
        </div>
      `).join('');
    } else {
      positionsHtml = `
        <div class="col-span-full bg-amber-50 rounded-xl p-3.5 border border-amber-200 text-amber-800 text-sm font-medium text-center">
          ⏳ Đang chờ Quản lý phân bổ vị trí trực tiếp tại kho ca trực.
        </div>
      `;
    }

    const noteText = (emp.note || positions['NOTE'] || positions['Ghi Chú'] || '').trim();
    const noteHtml = noteText ? `
      <div class="mt-3 p-3 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center gap-2 text-xs text-blue-900 font-medium">
        <span class="text-base">📝</span>
        <span><strong>Ghi chú:</strong> ${noteText}</span>
      </div>
    ` : '';

    const warningHtml = hasEmptyPosition ? `
      <div class="mt-3.5 p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl flex items-start gap-3">
        <span class="text-amber-500 text-xl font-bold npw-icon">⚠️</span>
        <div class="text-xs text-amber-900 leading-relaxed">
          <strong class="font-semibold block text-sm text-amber-800">Cảnh báo vị trí làm việc:</strong>
          Bạn chưa được phân bổ đầy đủ vị trí hoặc đang ở trạng thái <em>"Chưa xếp"</em>. Vui lòng liên hệ ngay <strong>Admin / Zalo ca trực</strong> tại chốt kiểm soát để nhận nhiệm vụ!
        </div>
      </div>
    ` : '';

    resultContainer.innerHTML = `
      <div class="bg-white border-2 border-emerald-500 rounded-2xl p-5 sm:p-6 shadow-xl shadow-emerald-500/10 relative overflow-hidden animate-fade-in">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-emerald-500/30">
              ✓
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 tracking-tight">${emp.name || 'Nhân Viên'}</h3>
              <div class="text-xs text-slate-500 font-mono font-semibold mt-0.5">${emp.id || emp.empId || ''} ${emp.cccd ? '| CCCD: ' + emp.cccd : ''} ${emp.identity || emp.dinhDanh ? ' • ' + (emp.identity || emp.dinhDanh) : ''}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="px-3.5 py-1 text-xs font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ĐÃ ĐIỂM DANH
            </span>
            <div class="text-xs text-slate-500 font-mono mt-1 font-semibold">${emp.checkinTime || Utils.getCurrentVNTime()}</div>
          </div>
        </div>

        <div class="mt-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2.5 tracking-wider flex items-center gap-1.5">
            <span>📍 Vị Trí Làm Việc Phân Bổ</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            ${positionsHtml}
          </div>
        </div>

        ${noteHtml}
        ${warningHtml}
      </div>
    `;

    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /**
   * 2.2.1 Xử lý Gửi Đơn Xin Nghỉ / Xin Off
   */
  async handleSubmitXinOff(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const offDate = form.offDate.value;
    const targetShift = form.targetShift ? form.targetShift.value : (DataManager.state.currentShift || '18:00-22:00');
    const reason = form.reason.value.trim();

    if (!empId || !empName || !phone || !offDate || !reason || !targetShift) {
      Utils.toast('Vui lòng điền đầy đủ tất cả các trường', 'warning');
      return;
    }

    // Kiểm tra khung giờ xin nghỉ: Từ 06:00 đến 18:00 hàng ngày
    const currentMinutes = Utils.getVNMinutesInDay();
    const startMinutes = 6 * 60;  // 06:00 (360 phút)
    const endMinutes = 18 * 60;   // 18:00 (1080 phút)
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      Utils.showAlert(
        'Cổng Xin Nghỉ Đã Khóa',
        'Hệ thống chỉ tiếp nhận đơn xin nghỉ (xin off) từ 06:00 đến 18:00 hàng ngày. Sau 18:00 hệ thống đã tự động khóa cổng. Vui lòng liên hệ trực tiếp Quản lý kho để báo cáo trường hợp đột xuất!',
        'warning'
      );
      return;
    }

    Utils.showLoading('Đang ghi nhận đơn xin nghỉ...');

    try {
      const res = await DataManager.callApi('request', {
        type: 'XIN_OFF',
        empId: empId,
        empName: empName,
        name: empName,
        phone: phone,
        date: offDate,
        reason: reason,
        shift: targetShift,
        targetShift: targetShift,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        // Cập nhật trạng thái trong LocalStorage & Firebase nếu là hôm nay
        const todayStr = Utils.formatDateISO();
        if (offDate === todayStr) {
          const shiftId = targetShift;
          const roster = DataManager.getCachedRoster(shiftId);
          if (roster && Array.isArray(roster) && roster.length > 0) {
            const target = roster.find((emp) => Utils.isIdMatch(emp.id, empId) || Utils.isIdMatch(emp.cccd, empId) || emp.phone === phone);
            if (target) {
              target.status = 'off';
              target.note = reason;
              if (!target.positions) target.positions = {};
              target.positions['NOTE'] = reason;
              DataManager.saveCachedRoster(shiftId, roster);
              if (DataManager.state.currentShift === shiftId) {
                DataManager.state.roster = roster;
                DataManager.recalculateStats();
              }
            }
          }

          if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
            FirebaseService.recordCheckinRealtime(shiftId, {
              id: empId,
              name: empName,
              phone: phone,
              status: 'off',
              note: reason
            }).catch(() => {});
          }
        }

        Utils.showAlert('Gửi đơn thành công', `Đơn xin nghỉ ca ${targetShift} ngày ${offDate} đã được ghi nhận vào hệ thống và đồng bộ.`, 'success');
        form.reset();
        window.App?.closeModal('modalXinOff');
      } else {
        Utils.showAlert('Lỗi', res.message || res.error || 'Không thể lưu đơn xin nghỉ.', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', err.message, 'error');
    }
  },

  /**
   * 2.2.2 Xử lý Xin Lên Ca (Thế Ca / Tăng Cường)
   */
  async handleSubmitXinLenCa(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const targetDate = form.targetDate.value;
    const targetShift = form.targetShift.value;
    const note = form.note.value.trim();

    if (!empId || !empName || !phone || !targetDate || !targetShift) {
      Utils.toast('Vui lòng điền đầy đủ thông tin', 'warning');
      return;
    }

    Utils.showLoading('Đang gửi yêu cầu lên ca...');

    try {
      const res = await DataManager.callApi('request', {
        type: 'XIN_LEN_CA',
        empId: empId,
        empName: empName,
        name: empName,
        phone: phone,
        date: targetDate,
        targetShift: targetShift,
        shift: targetShift,
        note: note,
        identity: 'A-OS',
        status: 'pending',
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        // Ghi nhận sự kiện realtime mà không ghi đè master roster
        const todayStr = Utils.formatDateISO();
        if (targetDate === todayStr) {
          if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
            FirebaseService.recordCheckinRealtime(targetShift, {
              id: empId,
              name: empName,
              status: 'pending',
              note: note ? `Xin lên ca: ${note}` : 'Xin lên ca (A-OS)'
            }).catch((e) => console.warn(e));
          }
        }

        Utils.showAlert(
          'Đã tiếp nhận yêu cầu lên ca',
          'Bạn đã được xếp vào danh sách chờ (A-OS, pending). Quản trị viên sẽ xác nhận vị trí khi vào ca!',
          'success'
        );
        form.reset();
        window.App?.closeModal('modalXinLenCa');
      } else {
        Utils.showAlert('Lỗi', res.message || res.error || 'Không thể gửi yêu cầu', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', err.message, 'error');
    }
  },

  /**
   * 2.2.3 Xử lý Cấp Đổi Áo Thẻ & Dư Vé (Giao diện cũ phục hồi theo yêu cầu)
   */
  initItemRequest() {
    const typeRadios = document.getElementsByName('itemReqType');
    typeRadios.forEach((radio) => {
      radio.addEventListener('change', () => this.toggleItemReqFields());
    });

    const roleEl = document.getElementById('itemReqRole');
    if (roleEl) {
      roleEl.addEventListener('change', () => this.calculateItemPrice());
    }

    const qtyEl = document.getElementById('itemReqQuantity');
    if (qtyEl) {
      qtyEl.addEventListener('input', () => this.calculateItemPrice());
      qtyEl.addEventListener('change', () => this.calculateItemPrice());
    }

    const openBtn = document.getElementById('openItemReqBtn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        const dateInput = document.getElementById('itemReqDate');
        if (dateInput && !dateInput.value) {
          dateInput.value = new Date().toISOString().split('T')[0];
        }
        this.toggleItemReqFields();
      });
    }

    this.toggleItemReqFields();
  },

  toggleItemReqFields() {
    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const reasonGroup = document.getElementById('itemReqReasonGroup');
    const reasonSelect = document.getElementById('itemReqReason');
    const shirtFields = document.getElementById('itemReqShirtFields');
    const roleGroup = document.getElementById('itemReqRoleGroup');
    const roleSelect = document.getElementById('itemReqRole');
    const quantityGroup = document.getElementById('itemReqQuantityGroup');
    const quantityInput = document.getElementById('itemReqQuantity');
    const dateGroup = document.getElementById('itemReqDateGroup');
    const dateLabel = document.getElementById('itemReqDateLabel');
    const dateInput = document.getElementById('itemReqDate');
    const priceGroup = document.getElementById('itemReqPriceGroup');

    if (reasonGroup && reasonSelect) {
      if (reqType === 'Đổi Áo') {
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
        reasonSelect.innerHTML = '<option value="">-- Chọn Lý Do --</option><option value="Áo cũ rách">Áo cũ rách</option><option value="Mất áo do sự cố">Mất áo do sự cố</option><option value="Mua thêm áo">Mua thêm áo</option>';
      } else if (reqType === 'Đổi Thẻ') {
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
        reasonSelect.innerHTML = '<option value="">-- Chọn Lý Do --</option><option value="Mất thẻ">Mất thẻ</option><option value="Hư thẻ">Hư thẻ</option><option value="Cũ muốn cấp mới">Cũ muốn cấp mới</option><option value="Lý do khác">Lý do khác</option>';
      } else {
        // Dư vé
        reasonGroup.style.display = 'none';
        reasonSelect.required = false;
        reasonSelect.innerHTML = '';
      }
    }

    if (shirtFields) {
      if (reqType === 'Đổi Áo') {
        shirtFields.style.display = 'block';
        if (roleGroup) roleGroup.style.display = 'block';
        if (roleSelect) roleSelect.required = true;
        if (quantityGroup) quantityGroup.style.display = 'block';
        if (quantityInput) quantityInput.required = true;
        if (dateGroup) dateGroup.style.display = 'block';
        if (dateInput) dateInput.required = true;
        if (dateLabel) dateLabel.innerHTML = 'NGÀY LẤY <span class="text-red-500">*</span>';
        if (priceGroup) priceGroup.style.display = 'none'; // Ẩn chi phí dự kiến trên giao diện theo yêu cầu
      } else if (reqType === 'Dư vé') {
        shirtFields.style.display = 'block';
        if (roleGroup) roleGroup.style.display = 'none';
        if (roleSelect) roleSelect.required = false;
        if (quantityGroup) quantityGroup.style.display = 'none';
        if (quantityInput) quantityInput.required = false;
        if (dateGroup) dateGroup.style.display = 'block';
        if (dateInput) dateInput.required = true;
        if (dateLabel) dateLabel.innerHTML = 'NGÀY DƯ VÉ <span class="text-red-500">*</span>';
        if (priceGroup) priceGroup.style.display = 'none'; // Ẩn chi phí dự kiến trên giao diện theo yêu cầu
      } else {
        // Đổi Thẻ
        shirtFields.style.display = 'none';
        if (roleSelect) roleSelect.required = false;
        if (quantityInput) quantityInput.required = false;
        if (dateInput) dateInput.required = false;
      }
    }

    this.calculateItemPrice();
  },

  calculateItemPrice() {
    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const role = document.getElementById('itemReqRole')?.value || '';
    const quantity = parseInt(document.getElementById('itemReqQuantity')?.value) || 1;
    const priceEl = document.getElementById('itemReqPrice');
    if (!priceEl) return;

    if (reqType === 'Dư vé') {
      priceEl.value = '30.000 đ';
    } else if (reqType === 'Đổi Áo') {
      if (role === 'OS') {
        priceEl.value = (30000 * quantity).toLocaleString('vi-VN') + ' đ';
      } else if (role === 'BPO') {
        priceEl.value = (40000 * quantity).toLocaleString('vi-VN') + ' đ';
      } else if (role === 'S-BPO') {
        priceEl.value = 'C&B truy thu';
      } else {
        priceEl.value = '0 đ';
      }
    } else {
      priceEl.value = '0 đ';
    }
  },

  async handleSubmitCapDoiAoThe(e) {
    e.preventDefault();
    const form = e.target;

    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const empId = (document.getElementById('itemReqEmpId')?.value || '').trim();
    const name = (document.getElementById('itemReqName')?.value || '').trim();
    const shift = document.getElementById('itemReqShift')?.value || '';

    if (!empId || !name || !shift) {
      Utils.toast('Vui lòng điền đầy đủ Mã nhân viên, Họ tên và Ca làm việc', 'warning');
      return;
    }

    let role = '';
    let quantity = '';
    let pickupDate = '';
    let price = '';
    const reasonEl = document.getElementById('itemReqReason');
    const reason = reasonEl ? reasonEl.value : '';

    if ((reqType === 'Đổi Áo' || reqType === 'Đổi Thẻ') && !reason) {
      Utils.toast('Vui lòng chọn lý do', 'warning');
      return;
    }

    if (reqType === 'Đổi Áo') {
      role = document.getElementById('itemReqRole')?.value || '';
      quantity = document.getElementById('itemReqQuantity')?.value || '1';
      pickupDate = document.getElementById('itemReqDate')?.value || '';
      const priceEl = document.getElementById('itemReqPrice');
      price = priceEl ? priceEl.value : '';
      if (!price || price === '0 đ') {
        const qty = parseInt(quantity) || 1;
        if (role === 'OS') price = (30000 * qty).toLocaleString('vi-VN') + ' đ';
        else if (role === 'BPO') price = (40000 * qty).toLocaleString('vi-VN') + ' đ';
        else if (role === 'S-BPO') price = 'C&B truy thu';
      }
      if (!role || !quantity || !pickupDate) {
        Utils.toast('Vui lòng điền đầy đủ thông tin chức danh, số lượng và ngày lấy', 'warning');
        return;
      }
    } else if (reqType === 'Dư vé') {
      pickupDate = document.getElementById('itemReqDate')?.value || '';
      price = '30.000 đ';
      if (!pickupDate) {
        Utils.toast('Vui lòng chọn ngày dư vé', 'warning');
        return;
      }

      // NGĂN ĐIỀN TRÙNG NGÀY & TRÙNG CA ĐỐI VỚI DƯ VÉ (Frontend Local Check)
      const historyKey = 'agari_du_ve_history';
      let history = [];
      try {
        history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      } catch (e) {
        history = [];
      }

      const normEmpId = empId.toUpperCase().trim();
      const normDate = pickupDate.trim();
      const normShift = shift.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      const exists = history.find((item) => 
        item.empId === normEmpId && 
        item.date === normDate && 
        (item.shift || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '') === normShift
      );

      if (exists) {
        Utils.showAlert(
          'Đã Gửi Yêu Cầu Trước Đó',
          `Mã nhân viên <strong>${normEmpId}</strong> đã gửi yêu cầu <strong>Dư Vé</strong> cho ca <strong>${shift}</strong> vào ngày <strong>${pickupDate}</strong> rồi!<br><br>Hệ thống không cho phép gửi trùng lặp cho cùng một ca trong ngày. Nếu bạn dư vé cho ca làm việc khác (VD: Ca Đêm), vui lòng chọn đúng ca tương ứng!`,
          'warning'
        );
        return;
      }
    } else if (reqType === 'Đổi Thẻ') {
      price = '0 đ';
    }

    const submitBtn = document.getElementById('itemReqSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Đang lưu yêu cầu...';
    }

    Utils.showLoading('Đang lưu yêu cầu vào hệ thống...');

    try {
      const res = await DataManager.callApi('request_item', {
        type: reqType,
        empId: empId.toUpperCase(),
        name: name.toUpperCase(),
        shift: shift,
        role: role,
        quantity: quantity,
        pickupDate: pickupDate,
        price: price, // Vẫn gửi giá tiền đầy đủ sang Google Sheets
        reason: reason,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        // Lưu lịch sử dư vé để ngăn trùng lặp
        if (reqType === 'Dư vé') {
          const historyKey = 'agari_du_ve_history';
          let history = [];
          try {
            history = JSON.parse(localStorage.getItem(historyKey) || '[]');
          } catch (e) {
            history = [];
          }
          history.push({
            empId: empId.toUpperCase().trim(),
            date: pickupDate.trim(),
            shift: shift.trim(),
            timestamp: Date.now()
          });
          try {
            localStorage.setItem(historyKey, JSON.stringify(history));
          } catch (e) {}
        }

        Utils.showAlert(
          'Đã Ghi Nhận Thành Công!',
          `Yêu cầu <strong>${reqType}</strong> của bạn (${name} - ${empId.toUpperCase()}) đã được hệ thống ghi nhận tự động.<br><br><div class="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold leading-relaxed">✓ Hệ thống đã tự động lưu dữ liệu.<br>Bạn KHÔNG CẦN phải chụp màn hình hay trình báo lại cho Quản trị viên/Quản lý!</div>`,
          'success'
        );
        form.reset();
        this.toggleItemReqFields();
        window.App?.closeModal('modalCapDoiAoThe');
      } else {
        const errorMsg = res.message || res.error || 'Lỗi gửi yêu cầu';
        if (errorMsg.includes('đã gửi') || errorMsg.includes('trùng')) {
          Utils.showAlert('Đã Gửi Yêu Cầu Trước Đó', errorMsg, 'warning');
        } else {
          Utils.showAlert('Lỗi', errorMsg, 'error');
        }
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Gửi Yêu Cầu';
      }
    }
  },

  /**
   * 2.2.4 Gửi Phiếu Khiếu Nại (Có nén ảnh Base64 HTML5 Canvas <500KB)
   */
  async handleSubmitKhieuNai(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const complaintType = form.complaintType.value;
    const content = form.content.value.trim();
    const fileInput = form.proofImage;

    if (!empId || !empName || !content) {
      Utils.toast('Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
      return;
    }

    let imageBase64 = '';

    if (fileInput.files && fileInput.files[0]) {
      Utils.showLoading('Đang nén ảnh minh chứng...');
      try {
        const compressed = await Utils.compressImage(fileInput.files[0], 500, 0.8);
        imageBase64 = compressed.base64;
        console.log(`[KhieuNai] Ảnh nén thành công: ${compressed.sizeKB} KB`);
      } catch (err) {
        console.warn('Lỗi nén ảnh:', err);
      }
    }

    Utils.showLoading('Đang gửi khiếu nại lên Google Drive & Sheets...');

    try {
      const res = await DataManager.callApi('submit_complaint', {
        empId,
        empName,
        phone,
        complaintType,
        content,
        imageBase64,
        driveFolderId: CONFIG.GDRIVE_FOLDER_ID,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert(
          'Đã tiếp nhận khiếu nại',
          'Phiếu khiếu nại kèm minh chứng đã gửi thành công tới phòng Nhân sự với trạng thái "Chờ xử lý".',
          'success'
        );
        form.reset();
        window.App?.closeModal('modalKhieuNai');
      } else {
        Utils.showAlert('Lỗi', res.message || 'Không thể gửi khiếu nại', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi gửi phiếu', err.message, 'error');
    }
  },

  /**
   * 2.2.5 Tra Cứu Bảng Lương Cá Nhân & Biểu Đồ Chart.js
   */
  async handleLookupSalary(e) {
    e.preventDefault();
    const form = e.target;
    const identifier = form.identifier.value.trim();
    const resultArea = document.getElementById('salaryResultContainer');

    if (!identifier) {
      Utils.toast('Vui lòng nhập số CCCD hoặc Mã CTV', 'warning');
      return;
    }

    Utils.showLoading('Đang tra cứu bảng lương bảo mật...');

    try {
      const res = await DataManager.callApi('lookup_salary', {
        identifier: identifier,
        empId: identifier
      });

      Utils.hideLoading();

      const records = (res && Array.isArray(res.records)) 
        ? res.records 
        : (res && Array.isArray(res.data) ? res.data : (res && res.data && Array.isArray(res.data.records) ? res.data.records : []));

      if (res && res.success && records.length > 0) {
        this.renderSalaryDetails(records, identifier);
      } else {
        Utils.showAlert(
          'Không tìm thấy dữ liệu',
          res?.message || 'Không tìm thấy dữ liệu lương cho số CCCD/Mã này trong kỳ lương hiện tại. Vui lòng kiểm tra lại số CCCD hoặc liên hệ Quản lý!',
          'info'
        );
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi tra cứu', err.message, 'error');
    }
  },

  renderSalaryDetails(records, identifier) {
    const container = document.getElementById('salaryResultContainer');
    if (!container) return;

    container.classList.remove('hidden');

    // Tính tổng
    let totalHours = 0;
    let totalSalary = 0;
    let totalShifts = records.length;
    const labels = [];
    const hoursData = [];

    records.forEach((r) => {
      const rawHrs = r.totalHours != null ? r.totalHours : (r["Tổng giờ"] || r["Số giờ"] || r.hours || 0);
      const hrs = parseFloat(rawHrs) || 0;
      
      let sal = 0;
      if (typeof r.salary === 'number' && !isNaN(r.salary) && r.salary > 0) {
        sal = r.salary;
      } else {
        const rawSal = r.salary || r["Lương theo ngày công"] || r["Thành tiền"] || r.daySalary || 0;
        const cleanSal = String(rawSal).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
        sal = parseFloat(cleanSal) || 0;
      }

      totalHours += hrs;
      totalSalary += sal;
      const dateLabel = r.date || r["Ngày chấm công"] || r["Ngày"] || r.workDate || 'Ca';
      labels.push(dateLabel);
      hoursData.push(hrs);
    });

    const first = records[0] || {};
    const empName = first.name || first["Họ Tên"] || first["Họ và Tên"] || 'Cộng Tác Viên';
    const empCccd = first.cccd || first["CCCD"] || identifier;
    const empCtv = first.empId || first["Mã CTV \n(nếu có)"] || first["Mã CTV"] || first["Mã NV"] || '';
    const empDept = first.department || first["Địa điểm"] || first["Khu vực"] || 'Kho Vận SOC';

    const rowsHtml = records.map((r, idx) => {
      const dateVal = r.date || r["Ngày chấm công"] || r["Ngày"] || r.workDate || '-';
      const timeVal = r.timeInOut || ((r["Giờ check-in"] || r["Giờ vào"] || '') + (r["Giờ check-out"] ? ' - ' + r["Giờ check-out"] : '')) || r.time || '-';
      const rawHrs = r.totalHours != null ? r.totalHours : (r["Tổng giờ"] || r["Số giờ"] || r.hours || 0);
      const hrsVal = parseFloat(rawHrs) || 0;
      
      let isNight = false;
      if (r.shiftType === 'Đêm' || r.shiftType === 'Ca Đêm') {
        isNight = true;
      } else if (r["Night Shift"] && r["Night Shift"] !== '-' && parseFloat(r["Night Shift"]) > 0) {
        isNight = true;
      }
      
      let sal = 0;
      if (typeof r.salary === 'number' && !isNaN(r.salary) && r.salary > 0) {
        sal = r.salary;
      } else {
        const rawSal = r.salary || r["Lương theo ngày công"] || r["Thành tiền"] || r.daySalary || 0;
        const cleanSal = String(rawSal).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
        sal = parseFloat(cleanSal) || 0;
      }

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-sm">
          <td class="p-3 text-center text-slate-500 font-mono">${idx + 1}</td>
          <td class="p-3 font-medium text-slate-800">${dateVal}</td>
          <td class="p-3 font-mono text-slate-600">${timeVal}</td>
          <td class="p-3 text-center font-bold text-slate-700">${hrsVal}h</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 text-xs rounded font-medium ${isNight ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}">
              ${isNight ? 'Ca Đêm' : 'Ca Ngày'}
            </span>
          </td>
          <td class="p-3 text-right font-mono font-bold text-emerald-600">${Utils.formatCurrency(sal)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="mt-6 border-t border-slate-200 pt-6">
        <div class="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span class="text-xs uppercase font-semibold text-agari-yellow tracking-wider">Thông Tin Nhân Sự</span>
              <h3 class="text-2xl font-bold text-white mt-1">${empName}</h3>
              <div class="text-sm text-slate-400 font-mono mt-0.5">CCCD: ${empCccd} ${empCtv ? ' | Mã CTV: ' + empCtv : ''} | Bộ phận: ${empDept}</div>
            </div>
            <div class="bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700 text-right">
              <div class="text-xs text-slate-400">Tổng thu nhập tạm tính</div>
              <div class="text-2xl font-bold font-mono text-agari-yellow mt-0.5">${Utils.formatCurrency(totalSalary)}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div class="bg-slate-800/50 p-3 rounded-xl">
              <div class="text-xs text-slate-400">Tổng ca làm việc</div>
              <div class="text-xl font-bold text-white font-mono mt-1">${totalShifts} ca</div>
            </div>
            <div class="bg-slate-800/50 p-3 rounded-xl">
              <div class="text-xs text-slate-400">Tổng giờ công</div>
              <div class="text-xl font-bold text-white font-mono mt-1">${totalHours.toFixed(1)} giờ</div>
            </div>
            <div class="bg-slate-800/50 p-3 rounded-xl col-span-2 sm:col-span-1">
              <div class="text-xs text-slate-400">Tỷ lệ chuyên cần</div>
              <div class="text-xl font-bold text-emerald-400 font-mono mt-1">100%</div>
            </div>
          </div>
        </div>

        <!-- Biểu đồ Chart.js -->
        <div class="mt-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>📊 Biểu Đồ Thống Kê Số Giờ Công Từng Ngày</span>
          </h4>
          <div class="h-60 relative">
            <canvas id="salaryBarChart"></canvas>
          </div>
        </div>

        <!-- Bảng chi tiết ngày công -->
        <div class="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
            Chi Tiết Từng Ngày Công & Ca Làm Việc
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-100/70 text-slate-600 text-xs uppercase font-semibold">
                  <th class="p-3 text-center">STT</th>
                  <th class="p-3">Ngày Chấm Công</th>
                  <th class="p-3">Giờ Vào / Ra</th>
                  <th class="p-3 text-center">Số Giờ</th>
                  <th class="p-3 text-center">Loại Ca</th>
                  <th class="p-3 text-right">Lương Ngày</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Khởi tạo Chart.js
    this.renderSalaryChart(labels, hoursData);
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  renderSalaryChart(labels, data) {
    const canvas = document.getElementById('salaryBarChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.salaryChartInstance) {
      this.salaryChartInstance.destroy();
    }

    this.salaryChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số giờ làm (giờ)',
          data: data,
          backgroundColor: '#D90012',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2 }
          }
        }
      }
    });
  }
};

if (typeof window !== 'undefined') {
  window.EmployeeModule = EmployeeModule;
  window.ItemRequestModule = {
    toggleFields: () => EmployeeModule.toggleItemReqFields(),
    calculatePrice: () => EmployeeModule.calculateItemPrice()
  };
}

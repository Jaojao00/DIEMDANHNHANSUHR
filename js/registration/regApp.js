// js/registration/regApp.js
/**
 * Main Controller for Registration Module
 * Connects RegUI, RegAPI, and RegValidation
 */

const EmpNav = {
  currentTab: 'diemDanh',
  init: () => {
    const regBackBtn = document.getElementById('regBackToStep1');
    if (regBackBtn) regBackBtn.addEventListener('click', () => RegApp.showStep(1));

    const regSubmitBtn = document.getElementById('regSubmitBtn');
    if (regSubmitBtn) regSubmitBtn.addEventListener('click', RegApp.submit);

    const vsLookupBtn = document.getElementById('vsLookupBtn');
    if (vsLookupBtn) vsLookupBtn.addEventListener('click', ViewScheduleApp.lookup);

    const vsEmpIdInput = document.getElementById('vsEmpId');
    if (vsEmpIdInput) vsEmpIdInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') ViewScheduleApp.lookup();
    });

    EmpNav.show('diemDanh');
  },

  show: (tab) => {
    EmpNav.currentTab = tab;
    const savedEmpId = localStorage.getItem("agr_empId");
    const savedEmpName = localStorage.getItem("agr_empName");
    const savedEmpPhone = localStorage.getItem("agr_empPhone");
    const savedGender = localStorage.getItem("agr_osGender");

    if (tab === 'dangKyLich' || tab === 'dangKy') {
        if (savedEmpId) { const el = document.getElementById("regEmpId"); if (el) el.value = savedEmpId; }
        if (savedEmpName) { const el = document.getElementById("regEmpName"); if (el) el.value = savedEmpName; }
        if (savedEmpPhone) { const el = document.getElementById("regEmpPhone"); if (el) el.value = savedEmpPhone; }
        if (savedGender) {
            const radios = document.getElementsByName("regOsGender");
            for (const r of radios) { if (r.value === savedGender) r.checked = true; }
        }
    } else if (tab === 'xemLich') {
        if (savedEmpId) { const el = document.getElementById("vsEmpId"); if (el) el.value = savedEmpId; }
    }

    document.querySelectorAll('.emp-nav-item').forEach(b => b.classList.remove('active'));

    const empView = document.getElementById('employeeView');
    const regView = document.getElementById('empRegView');
    const vsView  = document.getElementById('empViewScheduleView');
    if (!empView || !regView || !vsView) return;

    empView.classList.remove('active');
    empView.style.display = 'none';
    regView.style.display = 'none';
    vsView.style.display = 'none';

    if (tab === 'diemDanh') {
      const btn = document.getElementById('navDiemDanh');
      if (btn) btn.classList.add('active');
      empView.classList.add('active');
      empView.style.display = 'block';
    } else if (tab === 'dangKy') {
      const btn = document.getElementById('navDangKy');
      if (btn) btn.classList.add('active');
      regView.style.display = 'block';
      RegAPI.loadConfig(); // Use new API
      RegApp.showStep(1);
    } else if (tab === 'xemLich') {
      const btn = document.getElementById('navXemLich');
      if (btn) btn.classList.add('active');
      vsView.style.display = 'block';
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }
};

const RegApp = {
  selectedShift: null,
  crOriginalData: null,
  crCurrentSelections: [],
  crFirebaseId: null,
  crSelectedShift: 'CA_NGAY',
  crSelectedShiftName: 'CA NGÀY',
  isSubmittingChange: false,

  showStep: (step) => {
    const s1 = document.getElementById('regStep1');
    const s2 = document.getElementById('regStep2');
    if (s1) s1.style.display = step === 1 ? 'block' : 'none';
    if (s2) s2.style.display = step === 2 ? 'block' : 'none';
    if (step === 1) RegApp.renderShiftList();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  },

  renderShiftList: () => {
    const container = document.getElementById('regShiftList');
    if (!container || typeof State === 'undefined' || !State.shifts) return;

    const s1 = State.shifts.find(s => s.id === '18:00-22:00');
    const s2 = State.shifts.find(s => s.id === '22:00-06:00');

    const regShifts = [
      { id: 'CA_NGAY', label: 'CA NGÀY', icon: '☀️', color: '#ffb347', displayTime: '06:00-22:00' }
    ];

    if (s1) regShifts.push({ ...s1, label: s1.name || 'Ca Tối', icon: '🌙', color: '#5c6bc0', displayTime: s1.id });
    if (s2) regShifts.push({ ...s2, label: s2.name || 'Ca Đêm', icon: '🌌', color: '#7e57c2', displayTime: s2.id });

    RegApp._cachedRegShifts = regShifts;
    container.innerHTML = RegUI.renderShiftList(regShifts, 'RegApp.selectShift');
  },

  selectShift: (shiftId) => {
    if (!RegApp._cachedRegShifts) return;
    const shift = RegApp._cachedRegShifts.find(s => s.id === shiftId);
    if (!shift) return;
    RegApp.selectedShift = shift;

    const iconEl = document.getElementById('regBannerIcon');
    const nameEl = document.getElementById('regBannerName');
    const timeEl = document.getElementById('regBannerTime');
    const labelEl = document.getElementById('regStep2ShiftLabel');

    if (iconEl) { iconEl.textContent = shift.icon; iconEl.style.background = shift.color + '22'; }
    if (nameEl) nameEl.textContent = shift.label;
    if (timeEl) timeEl.textContent = shift.displayTime || shift.id;
    if (labelEl) labelEl.textContent = `${shift.label} – ${shift.displayTime || shift.id}`;

    RegApp.renderDateTable();
    RegApp.showStep(2);
  },

  getDateRange: () => {
    const fromStr = localStorage.getItem('agr_reg_date_from');
    const toStr = localStorage.getItem('agr_reg_date_to');
    if (!fromStr || !toStr) return [];

    const dates = [];
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    let cur = new Date(fromStr + 'T00:00:00');
    const end = new Date(toStr + 'T00:00:00');

    while (cur <= end) {
      const yyyy = cur.getFullYear();
      const mm   = (cur.getMonth() + 1).toString().padStart(2, '0');
      const dd   = cur.getDate().toString().padStart(2, '0');
      dates.push({
        iso: `${yyyy}-${mm}-${dd}`,
        label: `${dd}/${mm}/${yyyy} (${days[cur.getDay()]})`
      });
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  },

  renderDateTable: () => {
    const thead = document.querySelector('#regTable thead');
    const tbody = document.getElementById('regTableBody');
    if (!tbody || !thead || !RegApp.selectedShift) return;
    
    const dates = RegApp.getDateRange();
    const htmlObj = RegUI.renderDateTable(dates, RegApp.selectedShift);
    
    // Setting innerHTML safely because HTML comes from UI component
    thead.innerHTML = htmlObj.thead;
    tbody.innerHTML = htmlObj.tbody;
    
    if (RegApp.selectedShift.id !== 'CA_NGAY') {
      const colEl = document.getElementById('regColShift');
      if (colEl) colEl.textContent = `${RegApp.selectedShift.label} (${RegApp.selectedShift.id})`;
    }
  },

  submit: async () => {
    const empIdEl = document.getElementById('regEmpId');
    const empNameEl = document.getElementById('regEmpName');
    const empPhoneEl = document.getElementById('regEmpPhone');
    
    const empId   = (empIdEl ? empIdEl.value : '').trim().toLowerCase();
    const empName = (empNameEl ? empNameEl.value : '').trim();
    const empPhone= (empPhoneEl? empPhoneEl.value: '').trim();
    
    let osGender = '';
    const osGenderRadios = document.getElementsByName('regOsGender');
    for (const radio of osGenderRadios) {
      if (radio.checked) {
        osGender = radio.value;
        break;
      }
    }

    if (typeof RegValidation !== 'undefined') {
      const validationErrors = RegValidation.validateInputs(empId, empName, empPhone, osGender);
      if (validationErrors.length > 0) {
        if (typeof Utils !== 'undefined') Utils.showToast(validationErrors[0], 'error');
        return;
      }

    }

    const dates = RegApp.getDateRange();
    if (dates.length === 0) {
      if (typeof Utils !== 'undefined') Utils.showToast('Admin chưa cấu hình ngày đăng ký', 'error');
      return;
    }

    const selections = [];
    let allFilled = true;
    dates.forEach((d, i) => {
      const chosen = document.querySelector(`input[name="regDay_${i}"]:checked`);
      if (!chosen) { allFilled = false; return; }
      selections.push({ date: d.iso, label: d.label, choice: chosen.value });
    });

    if (!allFilled) {
      if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng chọn ca hoặc OFF cho tất cả các ngày!', 'error');
      return;
    }

    if (typeof RegValidation !== 'undefined') {
      const shiftError = RegValidation.validateConsecutiveShifts(selections, RegApp.selectedShift.id);
      if (shiftError) {
        if (typeof ModalManager !== 'undefined') {
          ModalManager.showModal('warning', {
            title: 'CẢNH BÁO SỨC KHOẺ',
            message: shiftError,
            details: []
          }, {
            icon: '⚠️',
            titleColor: '#ffb347',
            btnText: 'Tôi đã hiểu',
            btnStyle: 'background: linear-gradient(135deg, #ffb347, #ff7b00); border: none; color: white;'
          });
        } else if (typeof Utils !== 'undefined') {
          Utils.showToast(shiftError, 'warning');
        }
        return;
      }
    }

    if (!navigator.onLine) {
      if (typeof Utils !== 'undefined') Utils.showToast('Mất kết nối mạng! Vui lòng kiểm tra lại Wifi/3G của bạn.', 'error');
      return;
    }

    const btn = document.getElementById('regSubmitBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang gửi...'; }

    const currentPeriod = dates.length > 0 ? `${dates[0].iso}_${dates[dates.length-1].iso}` : 'unknown';

    const payload = {
      action:     'submit_registration',
      empId:      empId,
      empName:    empName,
      empPhone:   empPhone,
      osGender:   osGender,
      shiftId:    RegApp.selectedShift.id,
      shiftLabel: RegApp.selectedShift.label,
      selections: selections,
      period:     currentPeriod,
      timestamp:  new Date().toISOString()
    };

    const result = await RegAPI.submitRegistration(payload);

    if (result.success || result.sheetSuccess) {
      // Save locally for offline view using standardized key
      const localKey = `agr_reg_${empId}`;
      const localExisting = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = localExisting.filter(r => r.shiftId !== RegApp.selectedShift.id);
      updated.push(payload);
      localStorage.setItem(localKey, JSON.stringify(updated));

      localStorage.setItem("agr_empId", empId);
      localStorage.setItem("agr_empName", empName);
      localStorage.setItem("agr_empPhone", empPhone);
      localStorage.setItem("agr_osGender", osGender);

      if (typeof ModalManager !== 'undefined') {
        let details = [
          { label: 'Mã Nhân Viên', value: empId.toUpperCase(), valueColor: '#ff5c5c', isHighlight: true },
          { label: 'Họ và Tên', value: empName },
          { label: 'Vị Trí', value: payload.shiftLabel, valueColor: '#4fc3f7', isHighlight: true },
          { label: 'Giai Đoạn', value: currentPeriod }
        ];

        ModalManager.showModal('success', {
          title: 'ĐĂNG KÝ THÀNH CÔNG!',
          message: `Bạn đã gửi lịch làm việc cho vị trí <span style="font-weight:700;color:#4fc3f7">${payload.shiftLabel}</span> thành công!`,
          details: details
        }, {
          icon: '🎉',
          titleColor: '#00e676',
          btnText: '✓ Đóng và xem lịch',
          btnStyle: 'background: linear-gradient(135deg, #00e676, #1de9b6); border: none; color: white;',
          onClose: () => {
            const vsInput = document.getElementById('vsEmpId');
            if (vsInput) vsInput.value = empId;
            EmpNav.show('xemLich');
            ViewScheduleApp.lookup();
          }
        });
      } else {
        if (typeof Utils !== 'undefined') Utils.showToast('🎉 Đăng ký lịch thành công!', 'success');
        setTimeout(() => {
          const vsInput = document.getElementById('vsEmpId');
          if (vsInput) vsInput.value = empId;
          EmpNav.show('xemLich');
          ViewScheduleApp.lookup();
        }, 800);
      }
      
      if (btn) { btn.disabled = false; btn.textContent = '📤 Gửi Đăng Ký'; }
    } else {
      if (typeof Utils !== 'undefined') Utils.showToast(`Lỗi gửi đăng ký: ${result.error || 'Unknown error'}`, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🚀 Gửi Đăng Ký'; } // Fix the text recovery
    }
  },

  selectCRShift: (shiftId, element) => {
    RegApp.crSelectedShift = shiftId;
    RegApp.crSelectedShiftName = element.getAttribute('data-name') || shiftId;
    
    const cards = document.querySelectorAll('.cr-shift-cards .reg-shift-card');
    cards.forEach(c => {
      c.classList.remove('selected');
      c.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      const checkmark = c.querySelector('.checkmark');
      if (checkmark) checkmark.style.display = 'none';
      const arrow = c.querySelector('.arrow-icon');
      if (arrow) arrow.style.display = 'block';
    });
    
    element.classList.add('selected');
    element.style.borderColor = 'var(--primary)';
    const checkmark = element.querySelector('.checkmark');
    if (checkmark) checkmark.style.display = 'block';
    const arrow = element.querySelector('.arrow-icon');
    if (arrow) arrow.style.display = 'none';
  },
  
  openChangeRequestModal: () => {
    if (typeof Utils !== 'undefined') Utils.showGenericAlertModal("Tính Năng Đã Khóa", "Chức năng yêu cầu thay đổi lịch hiện đang được tạm khóa theo yêu cầu. Vui lòng liên hệ Admin để biết thêm chi tiết.", "🔒");
    return;
  },

  closeChangeRequestModal: () => {
    const modal = document.getElementById('regChangeRequest');
    const step1 = document.getElementById('regStep1');
    if (modal) modal.style.display = 'none';
    if (step1) step1.style.display = 'block';
  },

  searchChangeRequest: async () => {
    const crEmpIdEl = document.getElementById('crEmpId');
    if (!crEmpIdEl) return;
    
    const empId = crEmpIdEl.value.trim().toLowerCase();
    const shiftId = RegApp.crSelectedShift;
    if (!empId) {
      if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng nhập Mã nhân viên!', 'error');
      return;
    }

    const lastChangeReqTime = localStorage.getItem(`agr_last_change_req_${empId}`);
    if (lastChangeReqTime) {
       const timeDiff = Date.now() - parseInt(lastChangeReqTime);
       if (timeDiff < 24 * 60 * 60 * 1000) {
          const hoursLeft = Math.ceil((24 * 60 * 60 * 1000 - timeDiff) / (60 * 60 * 1000));
          if (typeof Utils !== 'undefined') Utils.showToast(`Bạn đã gửi yêu cầu thay đổi lịch gần đây. Vui lòng chờ thêm ${hoursLeft} tiếng nữa để gửi yêu cầu mới!`, 'warning');
          return;
       }
    }

    const searchBtn = document.querySelector('button[onclick="RegApp.searchChangeRequest()"]');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 50 50" style="vertical-align:middle; margin-right:5px;"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 1000" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg> Đang tra cứu...';
    }
    
    try {
      const resultArea = document.getElementById('crResultArea');
      if (resultArea) resultArea.style.display = 'none';
      
      const dataArr = await RegAPI.getRegistrations(empId);
      
      if (!dataArr || dataArr.length === 0) {
        if (typeof Utils !== 'undefined') Utils.showToast('Không tìm thấy dữ liệu đăng ký của bạn trên hệ thống!', 'error');
        return;
      }
      
      let targetShiftIds = [];
      if (shiftId === 'CA_NGAY') {
        targetShiftIds = ['06:00-15:00', '06:00-10:00', '15:00-22:00', 'CA_NGAY'];
      } else {
        targetShiftIds = [shiftId];
      }
      
      let empData;
      if (shiftId === 'CA_NGAY') {
        const subShiftDataList = dataArr.filter(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
        if (subShiftDataList.length === 0) {
          if (typeof Utils !== 'undefined') Utils.showToast('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!', 'warning');
          return;
        }
        
        empData = {
          empId: subShiftDataList[0].empId,
          empName: subShiftDataList[0].empName,
          empPhone: subShiftDataList[0].empPhone || '',
          shiftId: 'CA_NGAY',
          shiftLabel: 'CA NGÀY (06:00-22:00)',
          selections: []
        };
        
        let mergedSelections = {};
        subShiftDataList.forEach(subShiftData => {
          if (subShiftData.selections) {
            subShiftData.selections.forEach(sel => {
              if (!mergedSelections[sel.label]) {
                mergedSelections[sel.label] = { label: sel.label, choice: "OFF" };
              }
              if (sel.choice !== "OFF") {
                mergedSelections[sel.label].choice = subShiftData.shiftId;
              }
            });
          }
        });
        
        empData.selections = Object.values(mergedSelections);
      } else {
        empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
        if (!empData) {
          if (typeof Utils !== 'undefined') Utils.showToast('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!', 'warning');
          return;
        }
      }
      
      RegApp.crCurrentSelections = [];
      if (empData.selections && Array.isArray(empData.selections)) {
        empData.selections.forEach(sel => {
          if (sel.label && sel.choice && sel.choice.trim() !== "") {
            RegApp.crCurrentSelections.push({
              id: sel.label.substring(0, 10),
              label: sel.label,
              value: sel.choice,
              choice: sel.choice
            });
          }
        });
      }
      
      RegApp.crOriginalData = {
        empId: empData.empId,
        empName: empData.empName,
        empPhone: empData.empPhone, // ensure phone is preserved
        shiftId: empData.shiftId,
        shiftLabel: empData.shiftLabel,
        period: empData.period || '',
        selections: JSON.parse(JSON.stringify(RegApp.crCurrentSelections))
      };
      RegApp.crFirebaseId = null;
      
      const crEmpNameEl = document.getElementById('crEmpName');
      if (crEmpNameEl) crEmpNameEl.textContent = (empData.empName || '').toUpperCase();
      
      const crShiftNameEl = document.getElementById('crShiftName');
      if (crShiftNameEl) crShiftNameEl.textContent = empData.shiftLabel || RegApp.crSelectedShiftName;
      
      RegApp.renderChangeTable();
      if (resultArea) resultArea.style.display = 'block';
      
      // Check pending requests
      const pendingReqs = await RegAPI.getChangeRequests();
      const pendingForEmp = pendingReqs.filter(r => (r.empId || '').toLowerCase() === empId);
      if (pendingForEmp.length > 0) {
        const matchedReq = pendingForEmp.find(r => targetShiftIds.includes(r.shiftId));
        if (matchedReq) {
          RegApp.crFirebaseId = matchedReq.id; // Store reqId
          if (matchedReq.selections) {
            RegApp.crCurrentSelections = JSON.parse(JSON.stringify(matchedReq.selections));
          }
          if (typeof Utils !== 'undefined') Utils.showToast('Bạn đang có một yêu cầu sửa lịch CHƯA ĐƯỢC DUYỆT cho ca này. Bạn có thể tiếp tục chỉnh sửa và gửi lại.', 'warning');
          RegApp.renderChangeTable();
        }
      }
      
    } catch (e) {
      console.error(e);
      if (typeof Utils !== 'undefined') Utils.showToast(`Lỗi tra cứu: ${e.message}`, 'error');
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '🔍 Tra cứu lịch';
      }
    }
  },
  
  renderChangeTable: () => {
    const thead = document.querySelector('#crTable thead');
    const tbody = document.getElementById('crTableBody');
    if (!thead || !tbody) return;
    
    const htmlObj = RegUI.renderChangeTable(RegApp.crOriginalData, RegApp.crCurrentSelections, 'RegApp.crChangeSelection');
    thead.innerHTML = htmlObj.thead;
    tbody.innerHTML = htmlObj.tbody;
  },

  crChangeSelection: (index, value) => {
    RegApp.crCurrentSelections[index].choice = value;
    RegApp.checkChangeDiff();
  },

  checkChangeDiff: () => {
    let isDiff = false;
    const orig = RegApp.crOriginalData.selections || [];
    for(let i=0; i<RegApp.crCurrentSelections.length; i++) {
      if (!orig[i] || RegApp.crCurrentSelections[i].choice !== orig[i].choice) {
        isDiff = true; break;
      }
    }
    const btn = document.getElementById('crSubmitBtn');
    if (!btn) return;
    if (isDiff) {
      btn.disabled = false;
      btn.style.background = 'var(--primary)';
      btn.style.cursor = 'pointer';
    } else {
      btn.disabled = true;
      btn.style.background = 'var(--text-muted)';
      btn.style.cursor = 'not-allowed';
    }
  },

  submitChangeRequest: async () => {
    if (RegApp.isSubmittingChange) return;
    const empId = RegApp.crOriginalData.empId.toLowerCase();
    const phone = RegApp.crOriginalData.empPhone || '';

    const lastChangeReqTime = localStorage.getItem(`agr_last_change_req_${empId}`);
    if (lastChangeReqTime) {
       const timeDiff = Date.now() - parseInt(lastChangeReqTime);
       if (timeDiff < 24 * 60 * 60 * 1000) {
          if (typeof Utils !== 'undefined') Utils.showToast('Bạn đã gửi yêu cầu thay đổi lịch gần đây. Vui lòng chờ 24h để gửi lại.', 'error');
          return;
       }
    }

    const pendingKey = `agr_pending_req_${empId}`;
    if (localStorage.getItem(pendingKey)) {
        if (typeof Utils !== 'undefined') Utils.showToast('Yêu cầu đang được xử lý, vui lòng không click liên tục!', 'warning');
        return;
    }
    localStorage.setItem(pendingKey, 'true');

    RegApp.isSubmittingChange = true;
    const btn = document.getElementById('crSubmitBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<svg class="spinner" width="20" height="20" viewBox="0 0 50 50" style="vertical-align:middle; margin-right:8px;"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 1000" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg> Đang gửi yêu cầu...';
    }
    
    try {
      const payload = {
        action: 'submit_change_request',
        empId: RegApp.crOriginalData.empId,
        empName: RegApp.crOriginalData.empName,
        empPhone: phone,
        shiftId: RegApp.crOriginalData.shiftId,
        shiftLabel: RegApp.crOriginalData.shiftLabel,
        period: RegApp.crOriginalData.period,
        oldSelections: RegApp.crOriginalData.selections,
        selections: RegApp.crCurrentSelections
      };
      
      const result = await RegAPI.submitChangeRequest(payload);
      
      if (result.success) {
        localStorage.setItem(`agr_last_change_req_${empId}`, Date.now());
        localStorage.setItem("agr_empId", RegApp.crOriginalData.empId);
        localStorage.setItem("agr_empName", RegApp.crOriginalData.empName);
        localStorage.setItem("agr_empPhone", phone);
        
        if (typeof Utils !== 'undefined') Utils.showGenericSuccessModal('Gửi yêu cầu thành công!', 'Hệ thống đã ghi nhận yêu cầu thay đổi lịch của bạn. Vui lòng chờ Admin xác nhận.', '📝');
        RegApp.closeChangeRequestModal();
      } else {
        throw new Error(result.error);
      }
    } catch(e) {
      console.error(e);
      if (typeof Utils !== 'undefined') Utils.showToast(`Lỗi: ${e.message}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Gửi yêu cầu thay đổi';
      }
    } finally {
      localStorage.removeItem(pendingKey);
      RegApp.isSubmittingChange = false;
    }
  }
};

const ViewScheduleApp = {
  lookup: async () => {
    const inputEl = document.getElementById('vsEmpId');
    const empId = (inputEl ? inputEl.value : '').trim().toLowerCase();
    const area  = document.getElementById('vsResultArea');
    if (!area) return;

    if (!empId) {
      if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng nhập mã nhân viên', 'error');
      return;
    }

    area.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">⏳ Đang tải...</div>';

    try {
      const allRegs = await RegAPI.getRegistrations(empId);

      if (!allRegs || allRegs.length === 0) {
        area.innerHTML = `
          <div class="vs-empty-state">
            <div class="vs-empty-icon">🔍</div>
            <div>Không tìm thấy lịch đăng ký cho mã: <strong>${empId.toUpperCase()}</strong></div>
            <div style="font-size:12px;margin-top:8px;color:var(--text-muted)">Bạn có thể chưa đăng ký lịch hoặc nhập sai mã nhân viên.</div>
          </div>
        `;
        return;
      }

      let html = `<div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">Lịch của: <strong style="color:var(--text-primary)">${empId.toUpperCase()}</strong></div>`;
      
      html += RegUI.renderViewScheduleTable(allRegs, (typeof State !== 'undefined' ? State.shifts : []));
      
      area.innerHTML = html;
    } catch (e) {
      console.error(e);
      area.innerHTML = `<div style="text-align:center;padding:30px;color:#ff5c5c">❌ Lỗi tải dữ liệu. Vui lòng thử lại.</div>`;
    }
  }
};

// Attach to window for inline HTML onclick handlers
window.EmpNav = EmpNav;
window.RegApp = RegApp;
window.ViewScheduleApp = ViewScheduleApp;

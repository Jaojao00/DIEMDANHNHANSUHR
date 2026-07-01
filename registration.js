
window.escapeHTML = function(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
/**
 * AGR - registration.js
 * Modules: EmpNav (Bottom Nav), RegApp (Schedule Registration), ViewScheduleApp (View Schedule)
 */

// ==========================================
// ĐIỀU HƯỚNG NHÂN VIÊN (EmpNav)
// ==========================================
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

    // Enforce default view explicitly on load
    EmpNav.show('diemDanh');
  },

  show: (tab) => {
    EmpNav.currentTab = tab;

    // Update nav buttons
    document.querySelectorAll('.emp-nav-item').forEach(b => b.classList.remove('active'));

    const empView = document.getElementById('employeeView');
    const regView = document.getElementById('empRegView');
    const vsView  = document.getElementById('empViewScheduleView');
    if (!empView || !regView || !vsView) return;

    // Hide all explicitly
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
      RegApp.loadConfig(); // Pre-fetch cấu hình ngày đăng ký từ backend
      RegApp.showStep(1);
    } else if (tab === 'xemLich') {
      const btn = document.getElementById('navXemLich');
      if (btn) btn.classList.add('active');
      vsView.style.display = 'block';
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
};

// ==========================================
// ĐĂNG KÝ LỊCH (RegApp)
// ==========================================
const RegApp = {
  selectedShift: null,

  // Tải cấu hình ngày đăng ký từ backend (Google Sheets) và cache vào localStorage
  loadConfig: async () => {
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) return;

      const res = await fetch(`${API_LINK}?action=get_reg_config`, {
        method: 'GET'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          if (data.regDateFrom) localStorage.setItem('agr_reg_date_from', data.regDateFrom);
          else localStorage.removeItem('agr_reg_date_from');
          
          if (data.regDateTo) localStorage.setItem('agr_reg_date_to', data.regDateTo);
          else localStorage.removeItem('agr_reg_date_to');
        }
      }
    } catch (e) {
      console.error('Lỗi tải cấu hình đăng ký từ server:', e);
    }
  },

  showStep: (step) => {
    const s1 = document.getElementById('regStep1');
    const s2 = document.getElementById('regStep2');
    if (s1) s1.style.display = step === 1 ? 'block' : 'none';
    if (s2) s2.style.display = step === 2 ? 'block' : 'none';
    if (step === 1) RegApp.renderShiftList();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  },

  renderShiftList: () => {
    const container = document.getElementById('regShiftList');
    if (!container || !State || !State.shifts) return;

    // Build the Registration-specific shifts
    const regShifts = [
      { id: 'CA_NGAY', label: 'CA NGÀY', icon: '☀️', color: '#ffb347', displayTime: '06:00-22:00' },
      State.shifts.find(s => s.id === '18:00-22:00'),
      State.shifts.find(s => s.id === '22:00-06:00')
    ].filter(Boolean);

    container.innerHTML = regShifts.map(shift => {
      const timeStr = shift.displayTime || shift.id;
      return '<div class="reg-shift-card" onclick="RegApp.selectShift(\'' + shift.id + '\')">'
        + '<div class="rsc-icon" style="background:' + shift.color + '22; color:' + shift.color + ';">' + shift.icon + '</div>'
        + '<div class="rsc-info">'
        + '<div class="rsc-name">' + shift.label + '</div>'
        + '<div class="rsc-time" style="color:' + shift.color + '; background:' + shift.color + '1A; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; font-weight: bold; border: 1px solid ' + shift.color + '33;">' + timeStr + '</div>'
        + '</div>'
        + '<div class="rsc-arrow">→</div>'
        + '</div>';
    }).join('');
  },

  selectShift: (shiftId) => {
    let shift;
    if (shiftId === 'CA_NGAY') {
      shift = { id: 'CA_NGAY', label: 'CA NGÀY', icon: '☀️', color: '#ffb347', displayTime: '06:00-22:00' };
    } else {
      shift = State.shifts.find(s => s.id === shiftId);
    }
    if (!shift) return;
    RegApp.selectedShift = shift;

    // Update banner
    const iconEl = document.getElementById('regBannerIcon');
    const nameEl = document.getElementById('regBannerName');
    const timeEl = document.getElementById('regBannerTime');
    const labelEl = document.getElementById('regStep2ShiftLabel');
    const colEl = document.getElementById('regColShift');

    if (iconEl) { iconEl.textContent = shift.icon; iconEl.style.background = shift.color + '22'; }
    if (nameEl) nameEl.textContent = shift.label;
    if (timeEl) timeEl.textContent = shift.id;
    if (labelEl) labelEl.textContent = shift.label + ' – ' + shift.id;
    if (colEl) colEl.textContent = shift.label + ' (' + shift.id + ')';

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
        iso: yyyy + '-' + mm + '-' + dd,
        label: dd + '/' + mm + '/' + yyyy + ' (' + days[cur.getDay()] + ')'
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

    if (dates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Admin chưa cấu hình ngày đăng ký. Vui lòng liên hệ quản lý.</td></tr>';
      return;
    }

    if (RegApp.selectedShift.id === 'CA_NGAY') {
      thead.innerHTML = `
        <tr>
          <th>Ngày</th>
          <th style="color:#43e97b; min-width:80px">Ca OS Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-15:00</small></th>
          <th style="color:#4facf7; min-width:80px">Ca Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-10:00</small></th>
          <th style="color:#ffb347; min-width:80px">Ca Chiều<br><small style="font-weight:normal;opacity:0.8">15:00-22:00</small></th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
      tbody.innerHTML = dates.map((d, i) => {
        return '<tr>'
          + '<td>' + d.label + '</td>'
          + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="06:00-15:00" data-date="' + d.iso + '"></td>'
          + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="06:00-10:00" data-date="' + d.iso + '"></td>'
          + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="15:00-22:00" data-date="' + d.iso + '"></td>'
          + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="OFF" data-date="' + d.iso + '"></td>'
          + '</tr>';
      }).join('');
    } else {
      thead.innerHTML = `
        <tr>
          <th>Ngày</th>
          <th id="regColShift">Ca làm việc</th>
          <th>OFF (Không đăng ký)</th>
        </tr>
      `;
      const colEl = document.getElementById('regColShift');
      if (colEl) colEl.textContent = RegApp.selectedShift.label + ' (' + RegApp.selectedShift.id + ')';

      tbody.innerHTML = dates.map((d, i) => {
        return '<tr>'
          + '<td>' + d.label + '</td>'
          + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="WORK" data-date="' + d.iso + '"></td>'
          + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="OFF"  data-date="' + d.iso + '"></td>'
          + '</tr>';
      }).join('');
    }
  },

  submit: async () => {
    const empId   = (document.getElementById('regEmpId')   ? document.getElementById('regEmpId').value   : '').trim();
    const empName = (document.getElementById('regEmpName') ? document.getElementById('regEmpName').value : '').trim();
    const empPhone= (document.getElementById('regEmpPhone')? document.getElementById('regEmpPhone').value: '').trim();
    
    let osGender = '';
    const osGenderRadios = document.getElementsByName('regOsGender');
    for (const radio of osGenderRadios) {
      if (radio.checked) {
        osGender = radio.value;
        break;
      }
    }

    if (!empId || !empName || !empPhone || !osGender) {
      Utils.showToast('Vui lòng nhập đầy đủ mã NV, họ tên, số điện thoại và giới tính OS', 'error');
      return;
    }

    // Validation format (dùng chung regex với form điểm danh)
    if (typeof CONFIG !== 'undefined' && CONFIG.EMPLOYEE_ID_REGEX && !CONFIG.EMPLOYEE_ID_REGEX.test(empId)) {
      Utils.showToast('Mã nhân viên không hợp lệ (Ví dụ: Ops123456)', 'error');
      return;
    }
    if (typeof CONFIG !== 'undefined' && CONFIG.PHONE_REGEX && !CONFIG.PHONE_REGEX.test(empPhone)) {
      Utils.showToast('Số điện thoại không hợp lệ (10 số, bắt đầu 03/05/07/08/09)', 'error');
      return;
    }

    const dates = RegApp.getDateRange();
    if (dates.length === 0) {
      Utils.showToast('Admin chưa cấu hình ngày đăng ký', 'error');
      return;
    }

    // Collect selections
    const selections = [];
    let allFilled = true;
    dates.forEach((d, i) => {
      const chosen = document.querySelector('input[name="regDay_' + i + '"]:checked');
      if (!chosen) { allFilled = false; return; }
      selections.push({ date: d.iso, label: d.label, choice: chosen.value });
    });

    if (!allFilled) {
      Utils.showToast('Vui lòng chọn ca hoặc OFF cho tất cả các ngày!', 'error');
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

    try {
      const db = window.FirebaseDB?.db;
      if (db) {
        const { collection, addDoc, query, where, getDocs } = window.FirebaseDB;
        const regRef = collection(db, "registrations");
        
        // Double check on Firebase to prevent cross-device duplicate quickly
        const q = query(regRef, where("empId", "==", empId), where("period", "==", currentPeriod), where("shiftId", "==", RegApp.selectedShift.id));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          throw new Error('Bạn đã đăng ký ca này rồi, không được đăng ký lại!');
        }
        
        // Save to Firebase as a "lock" to prevent duplicates in the same period
        await addDoc(regRef, payload);
      }
      
      // ALWAYS send to Google Sheets for data storage (so Admin can copy/edit)
      const apiLink = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (apiLink) {
        const resp = await fetch(apiLink, {
          method:  'POST',
          body:    JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.error) throw new Error(result.error);
      }

      // Save locally for offline view
      const localKey = 'agr_reg_' + empId.toLowerCase();
      const localExisting = JSON.parse(localStorage.getItem(localKey) || '[]');
      const updated = localExisting.filter(r => r.shiftId !== RegApp.selectedShift.id);
      updated.push(payload);
      localStorage.setItem(localKey, JSON.stringify(updated));

      Utils.showToast('✅ Đăng ký lịch thành công!', 'success');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Gửi Đăng Ký'; }

      // Auto-switch to view tab
      setTimeout(() => {
        const vsInput = document.getElementById('vsEmpId');
        if (vsInput) vsInput.value = empId;
        EmpNav.show('xemLich');
        ViewScheduleApp.lookup();
      }, 800);

    } catch (err) {
      Utils.showToast('Lỗi gửi đăng ký: ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Gửi Đăng Ký'; }
    }
  }
  ,
  crOriginalData: null,
  crCurrentSelections: [],
  crFirebaseId: null,

    crSelectedShift: 'CA_NGAY',
  crSelectedShiftName: 'CA NGÀY',
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
    document.getElementById('regStep1').style.display = 'none';
    document.getElementById('regChangeRequest').style.display = 'block';
    
    // Đặt mặc định ca đang chọn là CA_NGAY
    const firstCard = document.querySelector('.cr-shift-cards .reg-shift-card');
    if (firstCard) {
      RegApp.selectCRShift('CA_NGAY', firstCard);
    }
  },

  closeChangeRequestModal: () => {
    document.getElementById('regChangeRequest').style.display = 'none';
    document.getElementById('regStep1').style.display = 'block';
  },

  searchChangeRequest: async () => {
    const empId = document.getElementById('crEmpId').value.trim().toLowerCase();
    const shiftId = RegApp.crSelectedShift;
    if (!empId) {
      Utils.showToast('Vui lòng nhập Mã nhân viên!', 'error');
      return;
    }
    
    const searchBtn = document.querySelector('button[onclick="RegApp.searchChangeRequest()"]');
    if (searchBtn) {
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<svg class="spinner" width="16" height="16" viewBox="0 0 50 50" style="vertical-align:middle; margin-right:5px;"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 1000" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg> Đang tra cứu...';
    }
    
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) throw new Error('Lỗi kết nối máy chủ!');

      document.getElementById('crResultArea').style.display = 'none';
      
      // Sử dụng get_registration giống như phần Xem lịch (ViewScheduleApp)
      const res = await fetch(`${API_LINK}?action=get_registration&empId=${encodeURIComponent(empId)}`);
      const dataArr = await res.json();
      
      if (!dataArr || dataArr.length === 0 || dataArr.error) {
        Utils.showToast(dataArr.error || 'Không tìm thấy dữ liệu đăng ký của bạn trên hệ thống!', 'error');
        return;
      }
      
      // Lọc ra đúng ca mà người dùng đang chọn (CA_NGAY gồm nhiều ca con)
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
          Utils.showToast('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!', 'warning');
          return;
        }
        
        empData = {
          empId: subShiftDataList[0].empId,
          empName: subShiftDataList[0].empName,
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
              if (sel.choice === "WORK") {
                mergedSelections[sel.label].choice = subShiftData.shiftId;
              }
            });
          }
        });
        
        empData.selections = Object.values(mergedSelections);
      } else {
        empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
        if (!empData) {
          Utils.showToast('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!', 'warning');
          return;
        }
      }
      
            // Build crCurrentSelections từ mảng selections của backend (WORK, OFF, v.v.)
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
        shiftId: empData.shiftId,
        shiftLabel: empData.shiftLabel,
        selections: JSON.parse(JSON.stringify(RegApp.crCurrentSelections))
      };
      RegApp.crFirebaseId = null;
      
      document.getElementById('crEmpName').textContent = (empData.empName || '').toUpperCase();
      document.getElementById('crShiftName').textContent = empData.shiftLabel || RegApp.crSelectedShiftName;
      
      RegApp.renderChangeTable();
      document.getElementById('crResultArea').style.display = 'block';
      
      // Check pending requests
      const resReq = await fetch(API_LINK, { method: 'POST', body: JSON.stringify({ action: 'get_change_requests' }) });
      const reqData = await resReq.json();
      
      if (reqData && reqData.data) {
        const pendingForEmp = reqData.data.filter(r => r.empId.toLowerCase() === empId.toLowerCase());
        if (pendingForEmp.length > 0) {
          const matchedReq = pendingForEmp.find(r => targetShiftIds.includes(r.shiftId));
          if (matchedReq) {
            RegApp.crFirebaseId = matchedReq.id; // Store reqId
            if (matchedReq.selections) {
              RegApp.crCurrentSelections = JSON.parse(JSON.stringify(matchedReq.selections));
            }
            Utils.showToast('Bạn đang có một yêu cầu sửa lịch CHƯA ĐƯỢC DUYỆT cho ca này. Bạn có thể tiếp tục chỉnh sửa và gửi lại.', 'warning');
            RegApp.renderChangeTable();
          }
        }
      }
      
    } catch (e) {
      console.error(e);
      Utils.showToast('Lỗi tra cứu: ' + e.message, 'error');
    } finally {
      if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '🔍 Tra cứu lịch';
      }
    }
  },
  
  renderChangeTable: () => {
    const thead = document.getElementById('crTable').querySelector('thead');
    const tbody = document.getElementById('crTableBody');
    
    let isCaNgay = RegApp.crOriginalData.shiftId === "CA_NGAY";
    
    if (isCaNgay) {
      thead.innerHTML = `
        <tr>
          <th>Ngày</th>
          <th style="color:#43e97b; min-width:80px">Ca OS Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-15:00</small></th>
          <th style="color:#4facf7; min-width:80px">Ca Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-10:00</small></th>
          <th style="color:#ffb347; min-width:80px">Ca Chiều<br><small style="font-weight:normal;opacity:0.8">15:00-22:00</small></th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr>
          <th>Ngày</th>
          <th style="color:var(--primary); min-width:80px">Đăng Ký Làm</th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
    }
    
    let html = '';
    RegApp.crCurrentSelections.forEach((sel, index) => {
      html += '<tr><td>' + sel.label + '</td>';
      if (isCaNgay) {
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="06:00-15:00" ' + (sel.choice === '06:00-15:00' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="06:00-10:00" ' + (sel.choice === '06:00-10:00' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="15:00-22:00" ' + (sel.choice === '15:00-22:00' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="OFF" ' + (sel.choice === 'OFF' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
      } else {
        const valShift = RegApp.crOriginalData.shiftId;
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="' + valShift + '" ' + (sel.choice === valShift ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="OFF" ' + (sel.choice === 'OFF' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
      }
      html += '</tr>';
    });
    tbody.innerHTML = html;
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
    const btn = document.getElementById('crSubmitBtn');
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<svg class="spinner" width="20" height="20" viewBox="0 0 50 50" style="vertical-align:middle; margin-right:8px;"><circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="31.4 1000" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/></circle></svg> Đang gửi yêu cầu...';
    
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) throw new Error('Lỗi kết nối máy chủ!');
      
      const payload = {
        action: 'submit_change_request',
        empId: RegApp.crOriginalData.empId,
        empName: RegApp.crOriginalData.empName,
        empPhone: RegApp.crOriginalData.empPhone,
        shiftId: RegApp.crOriginalData.shiftId,
        shiftLabel: RegApp.crOriginalData.shiftLabel,
        period: RegApp.crOriginalData.period,
        oldSelections: RegApp.crOriginalData.selections,
        selections: RegApp.crCurrentSelections
      };
      
      const res = await fetch(API_LINK, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        Utils.showGenericSuccessModal('Gửi yêu cầu thành công!', 'Hệ thống đã ghi nhận yêu cầu thay đổi lịch của bạn. Vui lòng chờ Admin xác nhận.', '✅');
        RegApp.closeChangeRequestModal();
      } else {
        throw new Error(data.error || 'Lỗi không xác định từ máy chủ');
      }
    } catch(e) {
      console.error(e);
      Utils.showToast('Lỗi: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Gửi yêu cầu thay đổi';
    }
  }

};


// ==========================================
// XEM LỊCH ĐÃ ĐĂNG KÝ (ViewScheduleApp)
// ==========================================
const ViewScheduleApp = {
  lookup: async () => {
    const inputEl = document.getElementById('vsEmpId');
    const empId = (inputEl ? inputEl.value : '').trim().toLowerCase();
    const area  = document.getElementById('vsResultArea');
    if (!area) return;

    if (!empId) {
      Utils.showToast('Vui lòng nhập mã nhân viên', 'error');
      return;
    }

    area.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">⏳ Đang tải...</div>';

    let allRegs = [];

    // Try backend
    // Try backend
    try {
      const db = window.FirebaseDB?.db;
      if (db) {
        const { collection, query, where, getDocs } = window.FirebaseDB;
        const q = query(collection(db, "registrations"), where("empId", "==", empId));
        const qSnap = await getDocs(q);
        const data = qSnap.docs.map(d => d.data());
        if (data.length > 0) allRegs = data;
      } else {
        const apiLink = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
        if (apiLink) {
          const url = apiLink + '?action=get_registration&empId=' + encodeURIComponent(empId);
          const resp = await fetch(url);
          const data = await resp.json();
          if (Array.isArray(data)) allRegs = data;
        }
      }
    } catch (e) { /* fallback to local */ }

    // Fallback: localStorage
    if (allRegs.length === 0) {
      const key = 'agr_reg_' + empId;
      const local = JSON.parse(localStorage.getItem(key) || '[]');
      allRegs = local;
    }

    if (allRegs.length === 0) {
      area.innerHTML = '<div class="vs-empty-state">'
        + '<div class="vs-empty-icon">🔍</div>'
        + '<div>Không tìm thấy lịch đăng ký cho mã: <strong>' + empId.toUpperCase() + '</strong></div>'
        + '<div style="font-size:12px;margin-top:8px;color:var(--text-muted)">Bạn có thể chưa đăng ký lịch hoặc nhập sai mã nhân viên.</div>'
        + '</div>';
      return;
    }

    let html = '<div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">Lịch của: <strong style="color:var(--text-primary)">' + empId.toUpperCase() + '</strong></div>';

    allRegs.forEach(reg => {
      const shiftObj = (State && State.shifts) ? (State.shifts.find(s => s.id === reg.shiftId) || {}) : {};
      html += '<div class="view-schedule-result">'
        + '<div class="vsr-header">'
        + '<div class="vsr-name">' + (shiftObj.icon || '📅') + ' ' + (reg.shiftLabel || reg.shiftId) + '</div>'
        + '<div class="vsr-meta">' + reg.shiftId + ' &nbsp;|&nbsp; ' + (reg.empName || reg.empId) + '</div>'
        + '</div>'
        + '<table class="vsr-table">';

      (reg.selections || []).forEach(sel => {
        const isOff = sel.choice === 'OFF';
        html += '<tr>'
          + '<td class="vsr-date">' + sel.label + '</td>'
          + '<td class="vsr-shift ' + (isOff ? 'off' : 'working') + '">' + (isOff ? '— OFF' : (reg.shiftLabel || reg.shiftId)) + '</td>'
          + '</tr>';
      });

      html += '</table></div>';
    });

    area.innerHTML = html;
  }

};
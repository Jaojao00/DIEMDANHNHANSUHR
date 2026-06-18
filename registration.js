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
  },

  show: (tab) => {
    EmpNav.currentTab = tab;

    // Update nav buttons
    document.querySelectorAll('.emp-nav-item').forEach(b => b.classList.remove('active'));

    const empView = document.getElementById('employeeView');
    const regView = document.getElementById('empRegView');
    const vsView  = document.getElementById('empViewScheduleView');
    if (!empView || !regView || !vsView) return;

    // Hide all
    empView.style.display = 'none';
    regView.classList.remove('active');
    vsView.classList.remove('active');

    if (tab === 'diemDanh') {
      const btn = document.getElementById('navDiemDanh');
      if (btn) btn.classList.add('active');
      empView.style.display = 'block';
    } else if (tab === 'dangKy') {
      const btn = document.getElementById('navDangKy');
      if (btn) btn.classList.add('active');
      regView.classList.add('active');
      RegApp.showStep(1);
    } else if (tab === 'xemLich') {
      const btn = document.getElementById('navXemLich');
      if (btn) btn.classList.add('active');
      vsView.classList.add('active');
    }

    window.scrollTo(0, 0);
  }
};

// ==========================================
// ĐĂNG KÝ LỊCH (RegApp)
// ==========================================
const RegApp = {
  selectedShift: null,

  showStep: (step) => {
    const s1 = document.getElementById('regStep1');
    const s2 = document.getElementById('regStep2');
    if (s1) s1.style.display = step === 1 ? 'block' : 'none';
    if (s2) s2.style.display = step === 2 ? 'block' : 'none';
    if (step === 1) RegApp.renderShiftList();
    window.scrollTo(0, 0);
  },

  renderShiftList: () => {
    const container = document.getElementById('regShiftList');
    if (!container || !State || !State.shifts) return;

    container.innerHTML = State.shifts.map(shift => {
      return '<div class="reg-shift-card" onclick="RegApp.selectShift(\'' + shift.id + '\')">'
        + '<div class="rsc-icon" style="background:' + shift.color + '22; color:' + shift.color + ';">' + shift.icon + '</div>'
        + '<div class="rsc-info">'
        + '<div class="rsc-name">' + shift.label + '</div>'
        + '<div class="rsc-time">' + shift.id + '</div>'
        + '</div>'
        + '<div class="rsc-arrow">→</div>'
        + '</div>';
    }).join('');
  },

  selectShift: (shiftId) => {
    const shift = State.shifts.find(s => s.id === shiftId);
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
    if (labelEl) labelEl.textContent = shift.label + ' — ' + shift.id;
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
    const tbody = document.getElementById('regTableBody');
    if (!tbody || !RegApp.selectedShift) return;
    const dates = RegApp.getDateRange();

    if (dates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">Admin chưa cấu hình ngày đăng ký. Vui lòng liên hệ quản lý.</td></tr>';
      return;
    }

    tbody.innerHTML = dates.map((d, i) => {
      return '<tr>'
        + '<td>' + d.label + '</td>'
        + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="WORK" data-date="' + d.iso + '" id="w_' + i + '"></td>'
        + '<td><input type="radio" class="reg-radio" name="regDay_' + i + '" value="OFF"  data-date="' + d.iso + '" id="o_' + i + '"></td>'
        + '</tr>';
    }).join('');
  },

  submit: async () => {
    const empId   = (document.getElementById('regEmpId')   ? document.getElementById('regEmpId').value   : '').trim();
    const empName = (document.getElementById('regEmpName') ? document.getElementById('regEmpName').value : '').trim();
    const empPhone= (document.getElementById('regEmpPhone')? document.getElementById('regEmpPhone').value: '').trim();

    if (!empId || !empName || !empPhone) {
      Utils.showToast('Vui lòng nhập đầy đủ mã NV, họ tên, số điện thoại', 'error');
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

    const payload = {
      action:     'submit_registration',
      empId:      empId,
      empName:    empName,
      empPhone:   empPhone,
      shiftId:    RegApp.selectedShift.id,
      shiftLabel: RegApp.selectedShift.label,
      selections: selections,
      timestamp:  new Date().toISOString()
    };

    try {
      if (CONFIG && CONFIG.API_URL) {
        const resp = await fetch(CONFIG.API_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.error) throw new Error(result.error);
      }

      // Save locally for offline view
      const key = 'agr_reg_' + empId.toLowerCase();
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = existing.filter(r => r.shiftId !== RegApp.selectedShift.id);
      updated.push(payload);
      localStorage.setItem(key, JSON.stringify(updated));

      Utils.showToast('✅ Đăng ký lịch thành công!', 'success');

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
    try {
      if (CONFIG && CONFIG.API_URL) {
        const url = CONFIG.API_URL + '?action=get_registration&empId=' + encodeURIComponent(empId);
        const resp = await fetch(url);
        const data = await resp.json();
        if (Array.isArray(data)) allRegs = data;
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

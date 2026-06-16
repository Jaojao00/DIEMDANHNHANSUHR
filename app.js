/**
 * AGR - Hệ Thống Điểm Danh v3.0
 * app.js - Xử lý logic nghiệp vụ cho 2 luồng: Nhân viên (Mobile) và Admin (Desktop)
 */

// ==========================================
// TRẠNG THÁI ỨNG DỤNG (STATE)
// ==========================================
const State = {
  shifts: [
    { id: '06:00-10:00', label: 'Ca Sáng', icon: '🌅', color: '#4facf7', allowStart: '06:00', allowEnd: '10:00' },
    { id: '15:00-22:00', label: 'Ca Chiều', icon: '☀️', color: '#ffbd3a', allowStart: '15:00', allowEnd: '22:00' },
    { id: '18:00-22:00', label: 'Ca Tối', icon: '🌆', color: '#ff8c42', allowStart: '18:00', allowEnd: '20:30' },
    { id: '22:00-06:00', label: 'Ca Đêm', icon: '🌙', color: '#b980f0', allowStart: '22:00', allowEnd: '06:00' }
  ],
  selectedShiftId: null,
  scheduleData: [], // Dữ liệu lịch ca hiện tại
  isAdminMode: false,
  isAdminLoggedIn: false,
  scanner: null,
  isScanning: false,
  refreshTimer: null,
  clockTimer: null,
  enableTimeCheck: false
};

// ==========================================
// TIỆN ÍCH (UTILITIES)
// ==========================================
const Utils = {
  formatDate: (date = new Date()) => {
    const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  },
  formatTime: (date = new Date()) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  },
  showToast: (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = 'ℹ️';

    toast.innerHTML = `<span style="font-size:16px">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => toast.remove());
    }, CONFIG.TOAST_DURATION || 3000);
  },
  getShiftStorageKey: (shiftId) => `agr_schedule_${shiftId}`,
  isWithinTimeWindow: (startStr, endStr) => {
    if (!startStr || !endStr) return true;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    
    let [sH, sM] = startStr.split(':').map(Number);
    let startMins = sH * 60 + sM;
    
    let [eH, eM] = endStr.split(':').map(Number);
    let endMins = eH * 60 + eM;
    
    if (endMins < startMins) {
      // Qua đêm
      return currentMins >= startMins || currentMins <= endMins;
    }
    return currentMins >= startMins && currentMins <= endMins;
  },
};

// ==========================================
// XỬ LÝ DỮ LIỆU (DATA LAYER)
// ==========================================
const DataManager = {
  // Demo dữ liệu ban đầu nếu chưa có
  getDemoData: () => {
    return Array.from({length: 35}, (_, i) => ({
      stt: i + 1,
      id: `OPS${100000 + Math.floor(Math.random() * 900000)}`,
      name: `Nhân viên Demo ${i + 1}`,
      dinhDanh: `A-O${Math.floor(Math.random() * 9) + 1}`,
      viTri1: Math.random() > 0.5 ? `Chute ${Math.floor(Math.random() * 50)}` : 'Chưa xếp',
      viTri2: Math.random() > 0.5 ? `Chute ${Math.floor(Math.random() * 50)}` : 'Chưa xếp',
      viTri3: `OR${Math.floor(Math.random() * 20)}`,
      status: Math.random() > 0.8 ? 'confirmed' : 'pending',
      timestamp: Math.random() > 0.8 ? '22:15:00' : ''
    }));
  },

  loadSchedule: (shiftId) => {
    return new Promise((resolve) => {
      if (CONFIG.DEMO_MODE) {
        const key = Utils.getShiftStorageKey(shiftId);
        const stored = localStorage.getItem(key);
        if (stored) {
          resolve(JSON.parse(stored));
        } else {
          // Khởi tạo demo
          const demo = DataManager.getDemoData();
          localStorage.setItem(key, JSON.stringify(demo));
          resolve(demo);
        }
      } else {
        // Tương lai: Lấy từ Apps Script
        resolve([]);
      }
    });
  },

  saveSchedule: (shiftId, data) => {
    return new Promise((resolve) => {
      if (CONFIG.DEMO_MODE) {
        localStorage.setItem(Utils.getShiftStorageKey(shiftId), JSON.stringify(data));
        resolve({ success: true });
      } else {
        // Tương lai: Gửi lên Apps Script
        resolve({ success: true });
      }
    });
  },

  updateAttendance: async (shiftId, empId, phone) => {
    // Tạm thời update ở Local Storage
    const data = await DataManager.loadSchedule(shiftId);
    const empIndex = data.findIndex(e => e.id.toLowerCase() === empId.toLowerCase());
    
    if (empIndex >= 0) {
      if (data[empIndex].status === 'confirmed') {
        throw new Error('Nhân viên này đã điểm danh rồi!');
      }
      
      data[empIndex].status = 'confirmed';
      data[empIndex].timestamp = Utils.formatTime();
      data[empIndex].phone = phone; // Lưu phone nếu cần (local demo)
      
      const emp = data[empIndex];
      const isUnassigned = (!emp.viTri1 || emp.viTri1 === 'Chưa xếp') && 
                           (!emp.viTri2 || emp.viTri2 === 'Chưa xếp') && 
                           (!emp.viTri3 || emp.viTri3 === 'Chưa xếp');
      emp.noPosition = isUnassigned;
      
      await DataManager.saveSchedule(shiftId, data);
      return emp;
    } else {
      throw new Error(`Không tìm thấy mã nhân viên ${empId} trong ca này.`);
    }
  }
};

// ==========================================
// GIAO DIỆN NHÂN VIÊN (EMPLOYEE UI)
// ==========================================
const EmployeeApp = {
  init: () => {
    EmployeeApp.syncSettings();
    EmployeeApp.renderShifts();
    EmployeeApp.setupEvents();
    EmployeeApp.startClock();
  },

  syncSettings: () => {
    const savedTimes = JSON.parse(localStorage.getItem('agr_shift_times'));
    if (savedTimes) {
      State.shifts.forEach(s => {
        if (savedTimes[s.id]) {
          s.allowStart = savedTimes[s.id].allowStart;
          s.allowEnd = savedTimes[s.id].allowEnd;
        }
      });
    }
    const enableTime = localStorage.getItem('agr_enable_time_check');
    if (enableTime !== null) {
      State.enableTimeCheck = enableTime === 'true';
    }
  },

  startClock: () => {
    const update = () => {
      const d = new Date();
      document.getElementById('empDate').textContent = Utils.formatDate(d);
      document.getElementById('empTime').textContent = Utils.formatTime(d);
      document.getElementById('attClockSm').textContent = Utils.formatTime(d);
    };
    update();
    setInterval(update, 1000);
  },

  renderShifts: () => {
    const container = document.getElementById('shiftCards');
    container.innerHTML = State.shifts.map(shift => `
      <div class="shift-card" data-shift="${shift.id}" style="--card-color: ${shift.color}">
        <div class="shift-card-icon">${shift.icon}</div>
        <div class="shift-card-body">
          <div class="shift-card-name">${shift.label}</div>
          <div class="shift-card-time">${shift.id}</div>
        </div>
        <div class="shift-card-meta">
          <div class="shift-card-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>
    `).join('');

    // Bind events
    container.querySelectorAll('.shift-card').forEach(card => {
      card.addEventListener('click', () => {
        State.selectedShiftId = card.dataset.shift;
        EmployeeApp.goToPhase('phaseAttendance');
      });
    });
  },

  goToPhase: (phaseId) => {
    document.querySelectorAll('.emp-phase').forEach(el => el.classList.remove('active', 'hidden'));
    document.querySelectorAll('.emp-phase').forEach(el => {
      if(el.id === phaseId) el.classList.add('active');
      else el.classList.add('hidden');
    });

    if (phaseId === 'phaseAttendance') {
      const shift = State.shifts.find(s => s.id === State.selectedShiftId);
      document.getElementById('attShiftIcon').textContent = shift.icon;
      document.getElementById('attShiftLabel').textContent = shift.label;
      document.getElementById('attShiftLabel').style.color = shift.color;
      document.getElementById('attShiftTime').textContent = shift.id;
    }
  },

  setupEvents: () => {
    // Back to shifts
    document.getElementById('backToShifts').addEventListener('click', () => {
      EmployeeApp.goToPhase('phaseShift');
    });

    // Manual Form Submit
    document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const shift = State.shifts.find(s => s.id === State.selectedShiftId);
      if (State.enableTimeCheck && !Utils.isWithinTimeWindow(shift.allowStart, shift.allowEnd)) {
        Utils.showToast(`Hiện không trong thời gian điểm danh của ca ${shift.label} (Giờ cho phép: ${shift.allowStart} - ${shift.allowEnd})`, 'error');
        return;
      }
      
      const idStr = document.getElementById('employeeId').value.trim();
      const nameStr = document.getElementById('employeeName').value.trim();
      const phoneStr = document.getElementById('employeePhone').value.trim();

      // Validation cơ bản
      if (!CONFIG.EMPLOYEE_ID_REGEX.test(idStr)) {
        Utils.showToast('Mã nhân viên không hợp lệ (Ví dụ: Ops123456)', 'error');
        return;
      }
      if (nameStr.length < CONFIG.MIN_NAME_LENGTH) {
        Utils.showToast('Vui lòng nhập đầy đủ họ tên', 'error');
        return;
      }
      if (!CONFIG.PHONE_REGEX.test(phoneStr)) {
        Utils.showToast('Số điện thoại không hợp lệ', 'error');
        return;
      }

      // Xử lý điểm danh
      try {
        const btn = document.getElementById('submitBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span> Đang xử lý...';

        const updatedEmp = await DataManager.updateAttendance(State.selectedShiftId, idStr, phoneStr);
        
        // Hiện Success
        EmployeeApp.showSuccess(updatedEmp);
        document.getElementById('attendanceForm').reset();
      } catch (error) {
        Utils.showToast(error.message, 'error');
      } finally {
        const btn = document.getElementById('submitBtn');
        btn.disabled = false;
        btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Xác Nhận Điểm Danh';
      }
    });

    // Admin Access Button
    document.getElementById('adminAccessBtn').addEventListener('click', () => {
      document.getElementById('adminLoginModal').classList.remove('hidden');
      document.getElementById('adminPasswordInput').focus();
    });

    // Success Done Btn
    document.getElementById('successDoneBtn').addEventListener('click', () => {
      EmployeeApp.goToPhase('phaseShift');
    });
  },

  showSuccess: (empData) => {
    EmployeeApp.goToPhase('phaseSuccess');
    
    document.getElementById('successName').textContent = empData.name;
    document.getElementById('successCode').textContent = empData.id;
    document.getElementById('successTs').textContent = empData.timestamp;

    if (empData.noPosition) {
      document.getElementById('positionResultCard').classList.add('hidden');
      document.getElementById('noPositionWarning').classList.remove('hidden');
    } else {
      document.getElementById('positionResultCard').classList.remove('hidden');
      document.getElementById('noPositionWarning').classList.add('hidden');
      
      // Render Position
      document.getElementById('prcMain').textContent = empData.viTri1 || 'Chưa xếp lịch';
      
      document.getElementById('prcSlots').innerHTML = `
        <div class="prc-slot">
          <span class="prc-slot-lbl">Định danh</span>
          <span class="prc-slot-val">${empData.dinhDanh || '—'}</span>
        </div>
        <div class="prc-slot">
          <span class="prc-slot-lbl">Sau giờ nghỉ</span>
          <span class="prc-slot-val">${empData.viTri2 || '—'}</span>
        </div>
        <div class="prc-slot">
          <span class="prc-slot-lbl">4h-6h</span>
          <span class="prc-slot-val">${empData.viTri3 || '—'}</span>
        </div>
      `;
    }
  }
};
// ==========================================
// GIAO DIỆN QUẢN TRỊ (ADMIN UI)
// ==========================================
const AdminApp = {
  init: () => {
    AdminApp.setupEvents();
    AdminApp.renderShiftTabs();
    AdminApp.startClock();
  },

  startClock: () => {
    const update = () => {
      const d = new Date();
      document.getElementById('currentDate').textContent = Utils.formatDate(d);
      document.getElementById('currentTime').textContent = Utils.formatTime(d);
    };
    update();
    setInterval(update, 1000);
  },

  switchToAdmin: () => {
    State.isAdminMode = true;
    document.getElementById('employeeView').classList.remove('active');
    document.getElementById('adminView').classList.add('active');
    
    AdminApp.loadData();
    // Auto refresh cho admin
    State.refreshTimer = setInterval(AdminApp.loadData, CONFIG.REFRESH_INTERVAL);
  },

  switchToEmployee: () => {
    State.isAdminMode = false;
    document.getElementById('adminView').classList.remove('active');
    document.getElementById('employeeView').classList.add('active');
    if (State.refreshTimer) clearInterval(State.refreshTimer);
  },

  setupEvents: () => {
    // Modal Login
    document.getElementById('adminLoginCancelBtn').addEventListener('click', () => {
      document.getElementById('adminLoginModal').classList.add('hidden');
      document.getElementById('adminPasswordInput').value = '';
    });
    
    document.getElementById('adminLoginSubmitBtn').addEventListener('click', () => {
      const pass = document.getElementById('adminPasswordInput').value;
      if (pass === CONFIG.MANAGER_PASSWORD) {
        document.getElementById('adminLoginModal').classList.add('hidden');
        document.getElementById('adminPasswordInput').value = '';
        AdminApp.switchToAdmin();
      } else {
        document.getElementById('adminLoginError').classList.remove('hidden');
      }
    });

    // Exit Admin
    document.getElementById('exitAdminBtn').addEventListener('click', AdminApp.switchToEmployee);

    // Settings Modal
    document.getElementById('settingsBtn').addEventListener('click', AdminApp.openSettingsModal);
    document.getElementById('settingsCloseBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.add('hidden');
    });
    document.getElementById('settingsCancelBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').classList.add('hidden');
    });
    document.getElementById('settingsSaveBtn').addEventListener('click', AdminApp.saveSettings);

    // Refresh & Search
    document.getElementById('refreshBtn').addEventListener('click', () => {
      const icon = document.getElementById('refreshBtn');
      icon.classList.add('spinning');
      AdminApp.loadData().then(() => {
        setTimeout(() => icon.classList.remove('spinning'), 500);
      });
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      document.querySelectorAll('#scheduleBody tr').forEach(row => {
        if(row.classList.contains('loading-row')) return;
        const text = row.textContent.toLowerCase();
        if (text.includes(val)) row.classList.remove('hidden');
        else row.classList.add('hidden');
      });
    });

    // Manager Panel (Update Schedule)
    document.getElementById('managerBtn').addEventListener('click', () => {
      AdminApp.openManagerModal();
    });
    document.getElementById('managerCloseBtn').addEventListener('click', () => {
      document.getElementById('managerModal').classList.add('hidden');
    });
    document.getElementById('managerLogoutBtn').addEventListener('click', () => {
      document.getElementById('managerModal').classList.add('hidden');
    });

    document.getElementById('parsePasteBtn').addEventListener('click', AdminApp.parsePastedData);
    document.getElementById('clearPasteBtn').addEventListener('click', () => {
      document.getElementById('pasteDataArea').value = '';
      document.getElementById('previewContainer').classList.add('hidden');
      document.getElementById('saveScheduleBtn').disabled = true;
    });

    document.getElementById('saveScheduleBtn').addEventListener('click', AdminApp.savePastedSchedule);
    
    document.getElementById('clearScheduleBtn').addEventListener('click', async () => {
      if (confirm('Bạn có chắc chắn muốn XÓA LỊCH CA này và trở về dữ liệu Demo ban đầu?')) {
        localStorage.removeItem(Utils.getShiftStorageKey(State.selectedShiftId));
        Utils.showToast('Đã khôi phục dữ liệu Demo.', 'info');
        document.getElementById('managerModal').classList.add('hidden');
        AdminApp.loadData();
      }
    });
  },

  renderShiftTabs: () => {
    const list = document.getElementById('shiftTabsList');
    list.innerHTML = State.shifts.map(s => `
      <div class="shift-tab ${s.id === State.selectedShiftId ? 'active' : ''}" 
           data-shift="${s.id}" style="--tab-color:${s.color}">
        <span class="shift-tab-icon">${s.icon}</span>
        <div class="shift-tab-info">
          <span class="shift-tab-time">${s.id}</span>
          <span class="shift-tab-label">${s.label}</span>
        </div>
      </div>
    `).join('');

    // Bind event
    list.querySelectorAll('.shift-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        State.selectedShiftId = tab.dataset.shift;
        AdminApp.renderShiftTabs(); // Re-render to update active class
        AdminApp.loadData();
      });
    });
  },

  loadData: async () => {
    try {
      document.getElementById('connectionStatus').className = 'status-dot loading';
      document.getElementById('connectionText').textContent = 'Đang tải...';

      // Update badge
      const shift = State.shifts.find(s => s.id === State.selectedShiftId);
      document.getElementById('shiftBadge').textContent = shift.label.toUpperCase();
      document.getElementById('shiftBadge').style.background = `linear-gradient(135deg, ${shift.color}, #222)`;

      const data = await DataManager.loadSchedule(State.selectedShiftId);
      State.scheduleData = data;
      
      AdminApp.renderTable();
      AdminApp.renderStats();
      AdminApp.renderLogs();

      document.getElementById('connectionStatus').className = 'status-dot online';
      document.getElementById('connectionText').textContent = 'Trực tuyến (Local)';
    } catch (err) {
      Utils.showToast('Lỗi tải dữ liệu', 'error');
      document.getElementById('connectionStatus').className = 'status-dot error';
      document.getElementById('connectionText').textContent = 'Lỗi kết nối';
    }
  },

  renderTable: () => {
    const tbody = document.getElementById('scheduleBody');
    if (!State.scheduleData || State.scheduleData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu lịch ca này. Vui lòng thêm bằng tính năng Quản lý.</td></tr>`;
      return;
    }

    tbody.innerHTML = State.scheduleData.map(emp => `
      <tr class="${emp.status === 'confirmed' ? 'attended' : ''}">
        <td>${emp.stt}</td>
        <td><span class="employee-code">${emp.id}</span></td>
        <td style="font-weight:500">${emp.name}</td>
        <td><span class="dinhDanh-badge">${emp.dinhDanh || ''}</span></td>
        <td><span class="position-tag ${!emp.viTri1 ? 'empty' : ''}">${emp.viTri1 || 'Chưa xếp'}</span></td>
        <td><span class="position-tag ${!emp.viTri2 ? 'empty' : ''}">${emp.viTri2 || 'Chưa xếp'}</span></td>
        <td><span class="position-tag ${!emp.viTri3 ? 'empty' : ''}">${emp.viTri3 || 'Chưa xếp'}</span></td>
        <td class="confirm-cell">
          ${emp.status === 'confirmed' 
            ? `<div class="confirm-badge confirmed" title="Đã điểm danh lúc ${emp.timestamp}">✓</div>`
            : `<div class="confirm-badge pending"></div>`
          }
        </td>
      </tr>
    `).join('');
  },

  renderStats: () => {
    const total = State.scheduleData.length;
    const confirmed = State.scheduleData.filter(e => e.status === 'confirmed').length;
    
    document.getElementById('totalEmployees').textContent = total;
    document.getElementById('confirmedCount').textContent = confirmed;
    document.getElementById('pendingCount').textContent = total - confirmed;

    document.getElementById('adminDone').textContent = confirmed;
    document.getElementById('adminTotal').textContent = total;
    const pct = total === 0 ? 0 : (confirmed / total) * 100;
    document.getElementById('adminBar').style.width = `${pct}%`;
  },

  renderLogs: () => {
    const logList = document.getElementById('logList');
    const confirmed = State.scheduleData.filter(e => e.status === 'confirmed')
      .sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')); // Xếp mới nhất lên trên

    if (confirmed.length === 0) {
      logList.innerHTML = `<div class="log-empty">Chưa có ai điểm danh</div>`;
      return;
    }

    logList.innerHTML = confirmed.map(emp => `
      <div class="log-item">
        <div class="log-avatar">${emp.name.charAt(0)}</div>
        <div class="log-info">
          <div class="log-name">${emp.name}</div>
          <div class="log-code">${emp.id}</div>
        </div>
        <div class="log-time">${emp.timestamp || '--:--'}</div>
      </div>
    `).join('');
  },

  // ---- Manager Modal Logic ----
  openManagerModal: () => {
    document.getElementById('managerModal').classList.remove('hidden');
    document.getElementById('pasteDataArea').value = '';
    document.getElementById('previewContainer').classList.add('hidden');
    document.getElementById('saveScheduleBtn').disabled = true;

    // Render shift buttons inside modal
    const btnsContainer = document.getElementById('managerShiftBtns');
    btnsContainer.innerHTML = State.shifts.map(s => `
      <div class="mgr-shift-btn ${s.id === State.selectedShiftId ? 'active' : ''}" data-shift="${s.id}" style="--tab-color:${s.color}">
        <span>${s.label}</span>
        <span class="mgr-shift-time">${s.id}</span>
      </div>
    `).join('');

    btnsContainer.querySelectorAll('.mgr-shift-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        btnsContainer.querySelectorAll('.mgr-shift-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.selectedShiftId = btn.dataset.shift; // Sync shift
        AdminApp.renderShiftTabs(); // Sync background UI
        AdminApp.loadData();
      });
    });
  },

  // ---- Settings Modal Logic ----
  openSettingsModal: () => {
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('enableTimeCheck').checked = State.enableTimeCheck;
    const container = document.getElementById('settingsShiftList');
    
    // Load from localStorage if available
    const savedTimes = JSON.parse(localStorage.getItem('agr_shift_times')) || {};

    container.innerHTML = State.shifts.map(s => {
      const currentStart = savedTimes[s.id]?.allowStart || s.allowStart || '';
      const currentEnd = savedTimes[s.id]?.allowEnd || s.allowEnd || '';
      const safeId = s.id.replace(/:/g, '');
      
      return `
        <div class="settings-shift-item">
          <div class="ssi-info">
            <strong>${s.label}</strong>
            <span style="font-size:11px;color:var(--text-muted)">(${s.id})</span>
          </div>
          <div class="ssi-inputs">
            <input type="time" id="start_${safeId}" value="${currentStart}" />
            <span> - </span>
            <input type="time" id="end_${safeId}" value="${currentEnd}" />
          </div>
        </div>
      `;
    }).join('');
  },

  saveSettings: () => {
    const savedTimes = JSON.parse(localStorage.getItem('agr_shift_times')) || {};
    const enableTime = document.getElementById('enableTimeCheck').checked;
    State.enableTimeCheck = enableTime;
    localStorage.setItem('agr_enable_time_check', enableTime);

    State.shifts.forEach(s => {
      const safeId = s.id.replace(/:/g, '');
      const start = document.getElementById(`start_${safeId}`).value;
      const end = document.getElementById(`end_${safeId}`).value;
      savedTimes[s.id] = { allowStart: start, allowEnd: end };
      
      // Update state
      s.allowStart = start;
      s.allowEnd = end;
    });
    
    localStorage.setItem('agr_shift_times', JSON.stringify(savedTimes));
    Utils.showToast('Lưu cài đặt giờ thành công!', 'success');
    document.getElementById('settingsModal').classList.add('hidden');
  },

  parsePastedData: () => {
    const text = document.getElementById('pasteDataArea').value.trim();
    if (!text) {
      Utils.showToast('Vui lòng dán dữ liệu vào ô trống', 'warning');
      return;
    }

    const rows = text.split('\n');
    const parsedData = [];
    
    // Bỏ qua dòng tiêu đề nếu có (ví dụ STT | MÃ CTV)
    let startIndex = 0;
    if (rows[0].toLowerCase().includes('stt') || rows[0].toLowerCase().includes('mã ctv')) {
      startIndex = 1;
    }

    for (let i = startIndex; i < rows.length; i++) {
      const cols = rows[i].split('\t'); // TSV từ Excel/Sheets
      if (cols.length >= 3 && cols[1].trim() !== '') {
        parsedData.push({
          stt: cols[0]?.trim() || (i + 1 - startIndex),
          id: cols[1]?.trim() || '',
          name: cols[2]?.trim() || '',
          dinhDanh: cols[3]?.trim() || '',
          viTri1: cols[4]?.trim() || '',
          viTri2: cols[5]?.trim() || '',
          viTri3: cols[6]?.trim() || '',
          status: 'pending',
          timestamp: ''
        });
      }
    }

    if (parsedData.length === 0) {
      Utils.showToast('Không phân tích được dòng dữ liệu nào hợp lệ. Đảm bảo copy từ Excel/Google Sheets.', 'error');
      return;
    }

    // Hiển thị preview
    document.getElementById('previewCount').textContent = `(${parsedData.length} nhân viên)`;
    document.getElementById('previewContainer').classList.remove('hidden');
    
    const thead = `<tr><th>STT</th><th>Mã NV</th><th>Họ Tên</th><th>Vị Trí 1</th></tr>`;
    const tbody = parsedData.slice(0, 5).map(r => `
      <tr><td>${r.stt}</td><td>${r.id}</td><td>${r.name}</td><td>${r.viTri1}</td></tr>
    `).join('');
    
    document.getElementById('previewTableWrap').innerHTML = `
      <table class="preview-table">
        ${thead}
        <tbody>
          ${tbody}
          ${parsedData.length > 5 ? `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);font-style:italic">... và ${parsedData.length - 5} dòng nữa</td></tr>` : ''}
        </tbody>
      </table>
    `;

    // Lưu tạm vào state để khi bấm "Lưu" thì đẩy xuống Storage
    State._tempParsedData = parsedData;
    document.getElementById('saveScheduleBtn').disabled = false;
  },

  savePastedSchedule: async () => {
    if (!State._tempParsedData || State._tempParsedData.length === 0) return;
    
    try {
      await DataManager.saveSchedule(State.selectedShiftId, State._tempParsedData);
      Utils.showToast(`Đã lưu thành công ${State._tempParsedData.length} nhân viên cho ${State.selectedShiftId}`);
      document.getElementById('managerModal').classList.add('hidden');
      AdminApp.loadData(); // Tải lại bảng admin
    } catch (e) {
      Utils.showToast('Lỗi lưu dữ liệu: ' + e.message, 'error');
    }
  }
};

// ==========================================
// KHỞI CHẠY (BOOTSTRAP)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  EmployeeApp.init();
  AdminApp.init();
});

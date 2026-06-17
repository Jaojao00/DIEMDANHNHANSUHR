/**
 * AGR - Hệ Thống Điểm Danh v3.0
 * app.js - Xử lý logic nghiệp vụ cho 2 luồng: Nhân viên (Mobile) và Admin (Desktop)
 */

// ==========================================
// TRẠNG THÁI ỨNG DỤNG (STATE)
// ==========================================
const State = {
  shifts: [
    { 
      id: '06:00-10:00', label: 'Ca Sáng', icon: '🌅', color: '#4facf7',
      allowStart: '06:00', allowEnd: '10:00',
      colHeaders: ['Vị Trí Đầu Ca', 'Vị Trí 2', 'Vị Trí 3', 'Vị Trí 4', 'Vị Trí 5'],
      noteColIndex: 9
    },
    { 
      id: '06:00-15:00', label: 'Ca OS Sáng', icon: '🌄', color: '#43e97b',
      allowStart: '06:00', allowEnd: '15:00',
      colHeaders: ['6h-7h (1)', '6h-7h (2)', '12h-13h (1)', '12h-13h (2)', '13h-15h'],
      noteColIndex: 9
    },
    { 
      id: '15:00-22:00', label: 'Ca Chiều', icon: '☀️', color: '#ffbd3a',
      allowStart: '15:00', allowEnd: '22:00',
      colHeaders: ['13h-15h', '15h-17h', '17h-17h30', '17h30-18h', '18h-19h', '19h-20h', '21h-22h'],
      noteColIndex: 11
    },
    { 
      id: '18:00-22:00', label: 'Ca Tối', icon: '🌆', color: '#ff8c42',
      allowStart: '18:00', allowEnd: '20:30',
      colHeaders: ['13h-15h', '15h-17h', '17h-17h30', '17h30-18h', '18h-19h', '19h-20h', '21h-22h'],
      noteColIndex: 11
    },
    { 
      id: '22:00-06:00', label: 'Ca Đêm', icon: '🌙', color: '#b980f0',
      allowStart: '22:00', allowEnd: '06:00',
      colHeaders: ['Vị Trí Cố Định', 'SAU GIỜ NGHỈ', '4h-6h', 'Xuất Tải'],
      noteColIndex: 8
    }
  ],
  selectedShiftId: '06:00-10:00', // Khởi tạo mặc định để tránh null
  scheduleData: [], // Dữ liệu lịch ca hiện tại
  isAdminMode: false,
  isAdminLoggedIn: false,
  scanner: null,
  isScanning: false,
  refreshTimer: null,
  apiLink: '',
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

  // Chuẩn hóa đối tượng nhân viên (chuyển tất cả field số thành chuỗi)
  normalizeEmp: (emp) => ({
    ...emp,
    stt: String(emp.stt || ''),
    id: String(emp.id || ''),
    name: String(emp.name || ''),
    dinhDanh: String(emp.dinhDanh || ''),
    // Nếu đã có positions[], chuẩn hóa từng phần tử
    let positions = emp.positions;
    if (!positions) {
      // Tương thích ngược: đọc từ viTri1-7 + xuatTai
      positions = [
        emp.viTri1 || '', emp.viTri2 || '', emp.viTri3 || '',
        emp.xuatTai || '', emp.viTri4 || '', emp.viTri5 || '',
        emp.viTri6 || '', emp.viTri7 || ''
      ];
      while (positions.length > 0 && positions[positions.length - 1] === '') positions.pop();
    }
    return {
      ...emp,
      stt: String(emp.stt || ''),
      id: String(emp.id || ''),
      name: String(emp.name || ''),
      dinhDanh: String(emp.dinhDanh || ''),
      positions: positions.map(String),
      note: String(emp.note || ''),
      status: String(emp.status || 'pending'),
      timestamp: String(emp.timestamp || ''),
      phone: String(emp.phone || ''),
    };
  }),

  loadSchedule: (shiftId) => {
    return new Promise(async (resolve) => {
      if (CONFIG.DEMO_MODE) {
        // ... code local storage cũ ...
        const key = Utils.getShiftStorageKey(shiftId);
        const stored = localStorage.getItem(key);
        if (stored) {
          resolve(JSON.parse(stored));
        } else {
          const demo = DataManager.getDemoData();
          localStorage.setItem(key, JSON.stringify(demo));
          resolve(demo);
        }
      } else {
        // Tải từ Google Sheets
        try {
          const url = `${CONFIG.API_URL}?action=load&shiftId=${shiftId}`;
          const response = await fetch(url);
          const data = await response.json();
          const normalized = Array.isArray(data) ? data.map(DataManager.normalizeEmp) : [];
          // Cập nhật lại local cache để dự phòng
          localStorage.setItem(Utils.getShiftStorageKey(shiftId), JSON.stringify(normalized));
          resolve(normalized);
        } catch (error) {
          console.error("Lỗi tải lịch từ Google Sheets:", error);
          // Fallback
          const stored = localStorage.getItem(Utils.getShiftStorageKey(shiftId));
          resolve(stored ? JSON.parse(stored) : []);
        }
      }
    });
  },

  saveSchedule: async (shiftId, data) => {
    return new Promise(async (resolve, reject) => {
      // Lưu local cache
      localStorage.setItem(Utils.getShiftStorageKey(shiftId), JSON.stringify(data));
      
      if (CONFIG.DEMO_MODE) {
        resolve({ success: true });
      } else {
        // Gửi lên Google Sheets
        try {
          const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'save',
              shiftId: shiftId,
              schedule: data
            })
          });
          const res = await response.json();
          if (res.error) reject(new Error(res.error));
          else resolve(res);
        } catch (error) {
          console.error("Lỗi lưu lịch lên Google Sheets:", error);
          reject(new Error("Lỗi kết nối đến máy chủ."));
        }
      }
    });
  },

  updateAttendance: async (shiftId, empId, phone) => {
    if (CONFIG.DEMO_MODE) {
      // Logic Local Demo
      const data = await DataManager.loadSchedule(shiftId);
      const searchId = empId.toLowerCase().trim();
      const empIndex = data.findIndex(e => 
        (e.id && e.id.toString().toLowerCase().trim() === searchId) || 
        (e.stt && e.stt.toString().toLowerCase().trim() === searchId) ||
        (e.name && e.name.toString().toLowerCase().trim() === searchId)
      );
      
      if (empIndex >= 0) {
        if (data[empIndex].status === 'confirmed') {
          throw new Error('Nhân viên này đã điểm danh rồi!');
        }
        
        data[empIndex].status = 'confirmed';
        data[empIndex].timestamp = Utils.formatTime();
        data[empIndex].phone = phone;
        
        const emp = data[empIndex];
        const isUnassigned = (!emp.viTri1 || emp.viTri1 === 'Chưa xếp') && 
                            (!emp.viTri2 || emp.viTri2 === 'Chưa xếp') && 
                            (!emp.viTri3 || emp.viTri3 === 'Chưa xếp');
                            
        await DataManager.saveSchedule(shiftId, data);
        
        return {
          employeeData: emp,
          isUnassigned: isUnassigned
        };
      } else {
        throw new Error('Không tìm thấy mã nhân viên trong ca này.');
      }
    } else {
      // Gửi API Google Sheets
      try {
        const response = await fetch(CONFIG.API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'checkin',
            shiftId: shiftId,
            empId: empId,
            phone: phone
          })
        });
        const res = await response.json();
        
        if (res.error) {
          throw new Error(res.error);
        }
        
        const emp = DataManager.normalizeEmp(res.employee);
        const isUnassigned = (!emp.viTri1 || emp.viTri1.toLowerCase().includes('chưa')) &&
                            (!emp.viTri2 || emp.viTri2.toLowerCase().includes('chưa')) &&
                            (!emp.viTri3 || emp.viTri3.toLowerCase().includes('chưa'));
                            
        return { employeeData: emp, isUnassigned: isUnassigned };
      } catch (error) {
        console.error("Lỗi điểm danh qua API:", error);
        throw new Error(error.message || "Lỗi kết nối hệ thống.");
      }
    }
  },

  // Gửi yêu cầu xin nghỉ / xin lên ca lên Google Sheets
  submitRequest: async (payload) => {
    // Lưu vào localStorage để highlight admin
    const requests = JSON.parse(localStorage.getItem('agr_requests') || '[]');
    requests.push({ empId: payload.empId.toLowerCase().trim(), type: payload.type, date: payload.date, ts: Date.now() });
    localStorage.setItem('agr_requests', JSON.stringify(requests));

    if (!CONFIG.DEMO_MODE) {
      try {
        const response = await fetch(CONFIG.API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'request',
            ...payload
          })
        });
        const res = await response.json();
        if (res.error) throw new Error(res.error);
        return res;
      } catch (error) {
        console.error("Lỗi gửi yêu cầu:", error);
        throw new Error(error.message || "Lỗi kết nối hệ thống.");
      }
    }
    return { success: true };
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

        const result = await DataManager.updateAttendance(State.selectedShiftId, idStr, phoneStr);
        
        // Hiện Success
        EmployeeApp.showSuccess(result.employeeData, result.isUnassigned);
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

    // ---- Xin Nghỉ / Xin Lên Ca Buttons ----
    document.getElementById('openLeaveRequestBtn').addEventListener('click', () => {
      document.getElementById('req_type').value = 'XIN OFF';
      document.getElementById('requestModalTitle').textContent = '📋 Xin Nghỉ / Xin Off';
      document.getElementById('requestModal').classList.remove('hidden');
      document.getElementById('req_date').valueAsDate = new Date();
    });

    document.getElementById('openExtraShiftBtn').addEventListener('click', () => {
      document.getElementById('req_type').value = 'XIN LÊN CA';
      document.getElementById('requestModalTitle').textContent = '⬆️ Xin Lên Ca';
      document.getElementById('requestModal').classList.remove('hidden');
      document.getElementById('req_date').valueAsDate = new Date();
    });

    document.getElementById('requestModalCloseBtn').addEventListener('click', () => {
      document.getElementById('requestModal').classList.add('hidden');
      document.getElementById('requestForm').reset();
    });

    document.getElementById('requestForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const empId = document.getElementById('req_empId').value.trim();
      const name = document.getElementById('req_name').value.trim().toUpperCase();
      const phone = document.getElementById('req_phone').value.trim();
      const date = document.getElementById('req_date').value;
      const reason = document.getElementById('req_reason').value.trim();
      const note = document.getElementById('req_note').value.trim();
      const type = document.getElementById('req_type').value;

      if (!empId || !name || !phone || !date || !reason) {
        Utils.showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
        return;
      }

      try {
        const btn = document.getElementById('requestSubmitBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang gửi...';

        // Format timestamp kiểu DD/MM/YYYY HH:mm:ss
        const now = new Date();
        const ts = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        
        // Format ngày DD/MM/YYYY
        const [y,m,d2] = date.split('-');
        const dateFormatted = `${d2}/${m}/${y}`;

        await DataManager.submitRequest({ empId, name, phone, type, reason, date: dateFormatted, note, timestamp: ts });

        document.getElementById('requestModal').classList.add('hidden');
        document.getElementById('requestForm').reset();
        Utils.showToast(`✅ Đã gửi yêu cầu ${type} thành công!`, 'success');
      } catch (err) {
        Utils.showToast('Lỗi gửi yêu cầu: ' + err.message, 'error');
      } finally {
        const btn = document.getElementById('requestSubmitBtn');
        btn.disabled = false;
        btn.textContent = '📤 Gửi Yêu Cầu';
      }
    });
  },

  showSuccess: (empData, isUnassigned) => {
    EmployeeApp.goToPhase('phaseSuccess');
    
    document.getElementById('successName').textContent = empData.name;
    document.getElementById('successCode').textContent = empData.id;
    document.getElementById('successTs').textContent = empData.timestamp;

    if (isUnassigned) {
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
        <div class="prc-slot">
          <span class="prc-slot-lbl">Xuất Tải</span>
          <span class="prc-slot-val">${empData.xuatTai || '—'}</span>
        </div>
        <div class="prc-slot" style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 5px;">
          <span class="prc-slot-lbl">Ghi chú (NOTE)</span>
          <span class="prc-slot-val" style="color:#aaa">${empData.note || 'Không có ghi chú'}</span>
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

  startAutoRefresh: () => {
    AdminApp.stopAutoRefresh();
    AdminApp.refreshTimer = setInterval(() => {
      // Chỉ tự tải lại khi đang ở tab danh sách (không phải lúc đang preview)
      if (document.getElementById('previewContainer').classList.contains('hidden')) {
        AdminApp.loadData(true); // true = silent refresh
      }
    }, CONFIG.REFRESH_INTERVAL);
  },

  stopAutoRefresh: () => {
    if (AdminApp.refreshTimer) clearInterval(AdminApp.refreshTimer);
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
    AdminApp.startAutoRefresh();
  },

  switchToEmployee: () => {
    State.isAdminMode = false;
    document.getElementById('adminView').classList.remove('active');
    document.getElementById('employeeView').classList.add('active');
    AdminApp.stopAutoRefresh();
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
    document.getElementById('settingsCloseBtn').addEventListener('click', AdminApp.closeSettings);
    document.getElementById('settingsCancelBtn').addEventListener('click', AdminApp.closeSettings);
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

  loadData: async (isSilent = false) => {
    try {
      if(!isSilent) {
        document.getElementById('connectionStatus').className = 'status-dot loading';
        document.getElementById('connectionText').textContent = 'Đang tải...';
      }

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
      document.getElementById('connectionText').textContent = CONFIG.API_URL ? '⚡ Realtime (Google Sheets)' : '⭕ Offline (Local)';
    } catch (err) {
      if(!isSilent) Utils.showToast('Lỗi tải dữ liệu', 'error');
      document.getElementById('connectionStatus').className = 'status-dot error';
      document.getElementById('connectionText').textContent = 'Lỗi kết nối';
    }
  },

  renderTable: () => {
    const tbody = document.getElementById('scheduleBody');
    if (!State.scheduleData || State.scheduleData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu lịch ca này. Vui lòng thêm bằng tính năng Quản lý.</td></tr>`;
      return;
    }

    // Lấy danh sách ID đã xin nghỉ/lên ca từ localStorage
    const requests = JSON.parse(localStorage.getItem('agr_requests') || '[]');
    const offIds = new Set(requests.filter(r => r.type === 'XIN OFF').map(r => r.empId));
    const extraIds = new Set(requests.filter(r => r.type === 'XIN LÊN CA').map(r => r.empId));

    tbody.innerHTML = State.scheduleData.map(emp => {
      const empIdLower = (emp.id || '').toLowerCase().trim();
      const isOff = offIds.has(empIdLower);
      const isExtra = extraIds.has(empIdLower);
      const rowClass = isOff ? 'xin-off-row' : (emp.status === 'confirmed' ? 'attended' : '');

      let confirmCell = '';
      if (isOff) {
        confirmCell = `<span class="xin-off-badge">📋 Xin Off</span>`;
      } else if (isExtra) {
        confirmCell = `<span class="xin-len-ca-badge">⬆️ Xin Lên Ca</span>`;
      } else if (emp.status === 'confirmed') {
        confirmCell = `<div class="confirm-badge confirmed" title="Đã điểm danh lúc ${emp.timestamp}">✓</div>`;
      } else {
        confirmCell = `<div class="confirm-badge pending"></div>`;
      }

      return `
      <tr class="${rowClass}">
        <td>${emp.stt}</td>
        <td><span class="employee-code">${emp.id}</span></td>
        <td style="font-weight:500">${emp.name}</td>
        <td><span class="dinhDanh-badge">${emp.dinhDanh || ''}</span></td>
        ${(emp.positions || []).map(p => `<td><span class="position-tag ${!p ? 'empty' : ''}">${p || 'Chưa xếp'}</span></td>`).join('')}
        <td><span style="font-size:12px; color:var(--text-muted)">${emp.note || ''}</span></td>
        <td class="confirm-cell">${confirmCell}</td>
      </tr>`;
    }).join('');

    // Cập nhật header bảng theo ca hiện tại
    const shift = State.shifts.find(s => s.id === State.selectedShiftId);
    const thead = document.getElementById('scheduleHead');
    if (thead && shift) {
      const posHeaders = shift.colHeaders.map(h => `<th>${h}</th>`).join('');
      thead.innerHTML = `<tr><th>STT</th><th>Mã CTV</th><th>Họ tên</th><th>Định danh</th>${posHeaders}<th>Note</th><th>Xác nhận</th></tr>`;
    }
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
    document.getElementById('apiLinkInput').value = State.apiLink;
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
    document.getElementById('settingsModal').classList.remove('hidden');
  },

  closeSettings: () => {
    document.getElementById('settingsModal').classList.add('hidden');
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

    // Save API Link
    const newApiLink = document.getElementById('apiLinkInput').value.trim();
    if (newApiLink !== State.apiLink) {
      State.apiLink = newApiLink;
      localStorage.setItem('agr_api_url', newApiLink);
    }
    
    AdminApp.closeSettings();
    // Reload current tab and data
    AdminApp.loadData();
    Utils.showToast('Đã lưu cài đặt', 'success');
  },

  parsePastedData: () => {
    const text = document.getElementById('pasteDataArea').value.trim();
    if (!text) {
      Utils.showToast('Vui lòng dán dữ liệu vào ô trống', 'warning');
      return;
    }

    const shift = State.shifts.find(s => s.id === State.selectedShiftId);
    if (!shift || !shift.colHeaders) {
      Utils.showToast('Không tìm thấy cấu hình ca làm việc!', 'error');
      return;
    }

    const rows = text.split('\n');
    const parsedData = [];
    
    // Bỏ qua dòng tiêu đề nếu có
    let startIndex = 0;
    while (startIndex < rows.length && 
          (rows[startIndex].toLowerCase().includes('stt') || 
           rows[startIndex].toLowerCase().includes('mã') ||
           rows[startIndex].split('\t').length < 3)) {
      startIndex++;
    }

    for (let i = startIndex; i < rows.length; i++) {
      const cols = rows[i].split('\t'); // TSV từ Excel/Sheets
      if (cols.length >= 3 && cols[1].trim() !== '') {
        // Đọc positions[] theo số lượng colHeaders của ca
        const positions = shift.colHeaders.map((_, pi) => (cols[4 + pi]?.trim() || ''));
        parsedData.push({
          stt: cols[0]?.trim() || (i + 1 - startIndex),
          id: cols[1]?.trim() || '',
          name: cols[2]?.trim() || '',
          dinhDanh: cols[3]?.trim() || '',
          positions: positions,
          note: cols[shift.noteColIndex]?.trim() || '',
          status: 'pending',
          timestamp: ''
        });
      }
    }

    if (parsedData.length === 0) {
      Utils.showToast('Không phân tích được dòng dữ liệu nào hợp lệ. Đảm bảo copy từ Excel/Google Sheets.', 'error');
      return;
    }

    // Hiển thị preview với cột đúng theo ca
    document.getElementById('previewCount').textContent = `(${parsedData.length} nhân viên)`;
    document.getElementById('previewContainer').classList.remove('hidden');
    
    const previewCols = ['STT', 'Mã NV', 'Họ Tên', ...shift.colHeaders.slice(0, 3), 'Ghi Chú'];
    const thead = `<tr>${previewCols.map(h => `<th>${h}</th>`).join('')}</tr>`;
    const tbody = parsedData.slice(0, 5).map(r => {
      const pos = r.positions || [];
      return `<tr><td>${r.stt}</td><td>${r.id}</td><td>${r.name}</td>${pos.slice(0,3).map(p=>`<td>${p}</td>`).join('')}<td>${r.note}</td></tr>`;
    }).join('');
    
    document.getElementById('previewTableWrap').innerHTML = `
      <table class="preview-table">
        ${thead}
        <tbody>
          ${tbody}
          ${parsedData.length > 5 ? `<tr><td colspan="${previewCols.length}" style="text-align:center;color:var(--text-muted);font-style:italic">... và ${parsedData.length - 5} dòng nữa</td></tr>` : ''}
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

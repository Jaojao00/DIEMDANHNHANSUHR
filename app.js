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
      colHeaders: ['Vị Trí Đầu Ca', 'Vị Trí 2', 'Vị Trí 3', 'Vị Trí 4', 'Vị Trí 5'],
      noteColIndex: 9
    },
    { 
      id: '06:00-15:00', label: 'Ca OS Sáng', icon: '🚀', color: '#43e97b',
      colHeaders: ['6h-7h (1)', '6h-7h (2)', '12h-13h (1)', '12h-13h (2)', '13h-15h'],
      noteColIndex: 9
    },
    { 
      id: '15:00-22:00', label: 'Ca Chiều', icon: '🌇', color: '#ffbd3a',
      colHeaders: ['13h-15h', '15h-17h', '17h-17h30', '17h30-18h', '18h-19h', '19h-20h', '21h-22h'],
      noteColIndex: 11
    },
    { 
      id: '18:00-22:00', label: 'Ca Tối', icon: '🌃', color: '#ff8c42',
      colHeaders: ['13h-15h', '15h-17h', '17h-17h30', '17h30-18h', '18h-19h', '19h-20h', '21h-22h'],
      noteColIndex: 11
    },
    { 
      id: '22:00-06:00', label: 'Ca Đêm', icon: '🌙', color: '#b980f0',
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
  apiLink: localStorage.getItem('agr_api_url') || (typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : ''),
  clockTimer: null
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
  isWithinTimeWindow: (shiftId) => {
    const scheduleDateStr = localStorage.getItem('agr_schedule_date');
    const scheduleDate = scheduleDateStr ? new Date(scheduleDateStr) : new Date();
    scheduleDate.setHours(0, 0, 0, 0);

    let start = new Date(scheduleDate);
    let end = new Date(scheduleDate);

    if (shiftId === '18:00-22:00') {
      // Ca Tối: 13h - 14h cùng ngày
      start.setHours(13, 0, 0);
      end.setHours(14, 0, 0);
    } else if (shiftId === '22:00-06:00') {
      // Ca Đêm: 14h - 18h cùng ngày
      start.setHours(14, 0, 0);
      end.setHours(18, 0, 0);
    } else if (shiftId === '15:00-22:00') {
      // Ca Chiều: 9h - 12h cùng ngày
      start.setHours(9, 0, 0);
      end.setHours(12, 0, 0);
    } else if (shiftId === '06:00-10:00' || shiftId === '06:00-15:00') {
      // Ca Sáng & OS Sáng: trước 19h ngày hôm trước
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(19, 0, 0);
    } else {
      start.setHours(0, 0, 0);
      end.setHours(23, 59, 59);
    }

    const now = new Date();
    
    return {
      isAllowed: now >= start && now <= end,
      isOver: now > end,
      startStr: Utils.formatTime(start).substring(0, 5),
      endStr: Utils.formatTime(end).substring(0, 5)
    };
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
  normalizeEmp: (emp) => {
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
  },

  loadSchedule: (shiftId) => {
    return new Promise(async (resolve) => {
      if (CONFIG.DEMO_MODE) {
        const key = Utils.getShiftStorageKey(shiftId);
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            const normalized = Array.isArray(parsed) ? parsed.map(DataManager.normalizeEmp) : [];
            resolve(normalized);
          } else {
            const demo = DataManager.getDemoData();
            localStorage.setItem(key, JSON.stringify(demo));
            resolve(demo.map(DataManager.normalizeEmp));
          }
        } catch (e) {
          console.error("Lỗi đọc demo data hoặc cache ca:", e);
          const demo = DataManager.getDemoData();
          resolve(demo.map(DataManager.normalizeEmp));
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
          try {
            const stored = localStorage.getItem(Utils.getShiftStorageKey(shiftId));
            if (stored) {
              const parsed = JSON.parse(stored);
              const normalized = Array.isArray(parsed) ? parsed.map(DataManager.normalizeEmp) : [];
              resolve(normalized);
            } else {
              resolve([]);
            }
          } catch (err) {
            console.error("Lỗi đọc cache local dự phòng:", err);
            resolve([]);
          }
        }
      }
    });
  },

  loadRegistrations: async (shiftId) => {
    return new Promise(async (resolve) => {
      try {
        const url = `${CONFIG.API_URL}?action=get_shift_registrations&shiftId=${shiftId}`;
        const response = await fetch(url);
        const json = await response.json();
        if (json.periods && Array.isArray(json.periods)) {
          resolve(json);
        } else if (json.data && Array.isArray(json.data)) {
          resolve({ periods: [{ id: 'current', name: 'Kỳ hiện tại', headers: json.headers || [], data: json.data }] });
        } else {
          resolve({ periods: [] });
        }
      } catch (error) {
        console.error("Lỗi tải danh sách đăng ký:", error);
        resolve({ periods: [] });
      }
    });
  },

  loadRequests: async () => {
    if (CONFIG.DEMO_MODE) {
      return JSON.parse(localStorage.getItem('agr_requests') || '[]');
    }
    try {
      const url = `${CONFIG.API_URL}?action=load_requests`;
      const response = await fetch(url);
      const data = await response.json();
      if (Array.isArray(data)) {
        // Cập nhật lại localStorage để dự phòng offline và để renderTable dùng chung logic
        // Ta có thể merge hoặc ghi đè. Tốt nhất là merge theo empId và timestamp hoặc cứ ghi đè.
        // Ghi đè bằng dữ liệu server là an toàn nhất.
        localStorage.setItem('agr_requests', JSON.stringify(data));
        return data;
      }
      return [];
    } catch (error) {
      console.error("Lỗi tải danh sách request từ Google Sheets:", error);
      try {
        return JSON.parse(localStorage.getItem('agr_requests') || '[]');
      } catch (e) {
        return [];
      }
    }
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
          const shift = State.shifts.find(s => s.id === shiftId);
          const headers = shift ? [...shift.colHeaders] : [];

          const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({
              action: 'save',
              shiftId: shiftId,
              headers: headers,
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
    const searchId = empId.toLowerCase().trim();
    
    // 1. Try to find in local cache first for Instant response
    const localKey = Utils.getShiftStorageKey(shiftId);
    let localData = [];
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        localData = Array.isArray(parsed) ? parsed.map(DataManager.normalizeEmp) : [];
      }
    } catch(e) {}

    const empIndex = localData.findIndex(e => 
      (e.id && e.id.toString().toLowerCase().trim() === searchId) || 
      (e.stt && e.stt.toString().toLowerCase().trim() === searchId) ||
      (e.name && e.name.toString().toLowerCase().trim() === searchId)
    );

    let localEmp = null;
    let localUnassigned = false;

    if (empIndex >= 0) {
      if (localData[empIndex].status === 'confirmed') {
        throw new Error('Nhân viên này đã điểm danh rồi!');
      }
      
      localData[empIndex].status = 'confirmed';
      localData[empIndex].timestamp = Utils.formatTime();
      localData[empIndex].phone = phone;
      
      const emp = DataManager.normalizeEmp(localData[empIndex]);
      const positions = emp.positions || [];
      localUnassigned = positions.length === 0 || positions.every(p => !p || p.toLowerCase().includes('chưa'));
      localEmp = emp;
      
      // Update cache immediately
      localStorage.setItem(localKey, JSON.stringify(localData));
      
      // Firebase Relay for Admin Real-time
      if (window.FirebaseDB?.db) {
        const { collection, addDoc } = window.FirebaseDB;
        addDoc(collection(window.FirebaseDB.db, "checkins"), {
          empId: localData[empIndex].id || empId,
          shiftId: shiftId,
          status: 'confirmed',
          timestamp: localData[empIndex].timestamp,
          phone: phone,
          serverTimestamp: Date.now()
        }).catch(e => console.error("Firebase relay error:", e));
      }
    }

    if (CONFIG.DEMO_MODE) {
      if (!localEmp) throw new Error('Không tìm thấy mã nhân viên trong ca này.');
      return { employeeData: localEmp, isUnassigned: localUnassigned };
    }

    // 2. Prepare background sync to Google Sheets
    const fetchPromise = fetch(CONFIG.API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'checkin',
        shiftId: shiftId,
        empId: empId,
        phone: phone
      })
    }).then(res => res.json());

    // 3. Optimistic UI: Return instantly if found locally
    if (localEmp) {
      fetchPromise.catch(err => console.error("Lỗi đồng bộ ngầm điểm danh:", err));
      return { employeeData: localEmp, isUnassigned: localUnassigned };
    }

    // 4. Fallback: If not found locally, wait for server response
    try {
      const res = await fetchPromise;
      if (res.error) {
        throw new Error(res.error);
      }
      
      const emp = DataManager.normalizeEmp(res.employee);
      const positions = emp.positions || [];
      const isUnassigned = positions.length === 0 || positions.every(p => !p || p.toLowerCase().includes('chưa'));
                          
      // Update local cache with this new employee
      localData.push(emp);
      localStorage.setItem(localKey, JSON.stringify(localData));

      return { employeeData: emp, isUnassigned: isUnassigned };
    } catch (error) {
      console.error("Lỗi điểm danh qua API:", error);
      throw new Error(error.message || "Lỗi kết nối hệ thống.");
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
    // Tự động dọn dẹp API URL cũ nếu còn lưu trong localStorage
    try {
      const currentLocalUrl = localStorage.getItem('agr_api_url');
      const oldUrl1 = 'https://script.google.com/macros/s/AKfycbxvVmnXSyKdEJt-H7Ag8AKlrMRaScStA5iQbWsspRjT-8r-MHopM5Tylg5wjNJXtHsm/exec';
      const oldUrl2 = 'https://script.google.com/macros/s/AKfycbxsQNg5OhchJ3P9MuWJF1wctPDfgRlhh2t-fWw_KNwUXyvpbCrpiTqdEMEaFsZi51kc/exec';
      const oldUrl3 = 'https://script.google.com/macros/s/AKfycbyI46Xny1nRIe8EDiBk79yq2ot-7PafmrWKU3dkLIh6lUoF7b0qS08J9RF6iJeHU6tq/exec';
      const oldUrl4 = 'https://script.google.com/macros/s/AKfycbzhLm9d6ewMZ4n4QYdMrx1NpUHTwBNgw1Ji0wmK5MwKcRt8KTNnem9-9pRpY__q0qZl/exec';
      const oldUrl5 = 'https://script.google.com/macros/s/AKfycbwsmUIhLTtsRscpeBIxBCuA5Rt3emjY1wcHyKTQ-Ju_0gd7vZHCjYs50JSGAM91AF08/exec';
      if (currentLocalUrl && (currentLocalUrl.trim() === oldUrl1 || currentLocalUrl.trim() === oldUrl2 || currentLocalUrl.trim() === oldUrl3 || currentLocalUrl.trim() === oldUrl4 || currentLocalUrl.trim() === oldUrl5)) {
        localStorage.removeItem('agr_api_url');
      }
      State.apiLink = localStorage.getItem('agr_api_url') || (typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : '');
    } catch (e) {
      console.error("Lỗi dọn dẹp url cũ:", e);
    }

    let savedTimes = null;
    try {
      const stored = localStorage.getItem('agr_shift_times');
      if (stored) savedTimes = JSON.parse(stored);
    } catch (e) {
      console.error("Lỗi đọc agr_shift_times:", e);
    }
    try {
      const savedDate = localStorage.getItem('agr_schedule_date');
      if (savedDate) {
        const d = new Date(savedDate);
        if (!isNaN(d.getTime())) State.scheduleDate = d;
      }
    } catch (e) {
      console.error(e);
    }
  },

  startClock: () => {
    const update = () => {
      const savedDate = localStorage.getItem('agr_schedule_date');
      const d = savedDate ? new Date(savedDate) : new Date();
      const empDateEl = document.getElementById('empDate');
      const empTimeEl = document.getElementById('empTime');
      const attClockSmEl = document.getElementById('attClockSm');
      if (empDateEl) empDateEl.textContent = Utils.formatDate(d);
      
      const now = new Date();
      if (empTimeEl) empTimeEl.textContent = Utils.formatTime(now);
      if (attClockSmEl) attClockSmEl.textContent = Utils.formatTime(now);
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
      
      // Preload data in background to enable instant checkin
      if (!CONFIG.DEMO_MODE) {
        DataManager.loadSchedule(State.selectedShiftId).catch(e => console.error('Lỗi preload schedule:', e));
      }
    }
  },

  setupEvents: () => {
    // Back to shifts
    const backToShiftsBtn = document.getElementById('backToShifts');
    if (backToShiftsBtn) {
      backToShiftsBtn.addEventListener('click', () => {
        EmployeeApp.goToPhase('phaseShift');
      });
    }

    // Manual Form Submit
    const attendanceForm = document.getElementById('attendanceForm');
    if (attendanceForm) {
      attendanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const shift = State.shifts.find(s => s.id === State.selectedShiftId);
        const timeStatus = Utils.isWithinTimeWindow(shift.id);
        
        if (!timeStatus.isAllowed) {
          Utils.showToast(`Hiện không trong thời gian điểm danh của ca ${shift.label} (Giờ cho phép: ${timeStatus.startStr} - ${timeStatus.endStr})`, 'error');
          return;
        }
        
        const idInput = document.getElementById('employeeId');
        const nameInput = document.getElementById('employeeName');
        const phoneInput = document.getElementById('employeePhone');
        if (!idInput || !nameInput || !phoneInput) return;

        const idStr = idInput.value.trim();
        const nameStr = nameInput.value.trim();
        const phoneStr = phoneInput.value.trim();

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
        const btn = document.getElementById('submitBtn');
        try {
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span> Đang xử lý...';
          }

          const result = await DataManager.updateAttendance(State.selectedShiftId, idStr, phoneStr);
          
          // Hiện Success
          EmployeeApp.showSuccess(result.employeeData, result.isUnassigned);
          attendanceForm.reset();
        } catch (error) {
          Utils.showToast(error.message, 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Xác Nhận Điểm Danh';
          }
        }
      });
    }

    // Admin Access Button
    const adminAccessBtn = document.getElementById('adminAccessBtn');
    if (adminAccessBtn) {
      adminAccessBtn.addEventListener('click', () => {
        const loginModal = document.getElementById('adminLoginModal');
        const passInput = document.getElementById('adminPasswordInput');
        if (loginModal) loginModal.classList.remove('hidden');
        if (passInput) passInput.focus();
      });
    }

    // Success Done Btn
    const successDoneBtn = document.getElementById('successDoneBtn');
    if (successDoneBtn) {
      successDoneBtn.addEventListener('click', () => {
        EmployeeApp.goToPhase('phaseShift');
      });
    }

    // ---- Xin Nghỉ / Xin Lên Ca Buttons ----
    const openLeaveRequestBtn = document.getElementById('openLeaveRequestBtn');
    if (openLeaveRequestBtn) {
      openLeaveRequestBtn.addEventListener('click', () => {
        const now = new Date();
        const hour = now.getHours();
        if (hour >= 18 || hour < 6) {
          Utils.showToast('Hệ thống khóa Xin Off trong thời gian từ 18:00 đến 06:00 sáng hôm sau!', 'error');
          return;
        }

        const typeEl = document.getElementById('req_type');
        const titleEl = document.getElementById('requestModalTitle');
        const modalEl = document.getElementById('requestModal');
        const dateEl = document.getElementById('req_date');
        const shiftGroup = document.getElementById('req_target_shift_group');
        const shiftLabel = document.getElementById('req_target_shift_label');
        const shiftSelect = document.getElementById('req_target_shift');
        if (typeEl) typeEl.value = 'XIN OFF';
        if (titleEl) titleEl.textContent = '⏱️ Xin Nghỉ / Xin Off';
        if (modalEl) modalEl.classList.remove('hidden');
        if (dateEl) {
          const savedDate = localStorage.getItem('agr_schedule_date');
          if (savedDate) dateEl.value = savedDate;
          else dateEl.valueAsDate = new Date();
        }
        if (shiftGroup) shiftGroup.style.display = 'block';
        if (shiftLabel) shiftLabel.innerHTML = 'Chọn Ca Xin Off <span style="color:#ff5c5c">*</span>';
        if (shiftSelect && shiftSelect.options.length > 0) {
          shiftSelect.options[0].style.display = 'block';
          shiftSelect.value = 'ALL';
        }
        
        const reasonLabel = document.getElementById('req_reason_label');
        if (reasonLabel) reasonLabel.innerHTML = 'Lý Do <span style="color:#ff5c5c">*</span>';
      });
    }

    const openExtraShiftBtn = document.getElementById('openExtraShiftBtn');
    if (openExtraShiftBtn) {
      openExtraShiftBtn.addEventListener('click', () => {
        const typeEl = document.getElementById('req_type');
        const titleEl = document.getElementById('requestModalTitle');
        const modalEl = document.getElementById('requestModal');
        const dateEl = document.getElementById('req_date');
        const shiftGroup = document.getElementById('req_target_shift_group');
        const shiftLabel = document.getElementById('req_target_shift_label');
        const shiftSelect = document.getElementById('req_target_shift');
        if (typeEl) typeEl.value = 'XIN LÊN CA';
        if (titleEl) titleEl.textContent = '⬆️ Xin Lên Ca';
        if (modalEl) modalEl.classList.remove('hidden');
        if (dateEl) {
          const savedDate = localStorage.getItem('agr_schedule_date');
          if (savedDate) dateEl.value = savedDate;
          else dateEl.valueAsDate = new Date();
        }
        if (shiftGroup) shiftGroup.style.display = 'block';
        if (shiftLabel) shiftLabel.innerHTML = 'Chọn Ca Xin Lên <span style="color:#ff5c5c">*</span>';
        if (shiftSelect && shiftSelect.options.length > 0) {
          shiftSelect.options[0].style.display = 'none';
          shiftSelect.value = '06:00-10:00';
        }
        
        const reasonLabel = document.getElementById('req_reason_label');
        if (reasonLabel) reasonLabel.innerHTML = 'Lý Do (Tùy chọn)';
      });
    }

    const requestModalCloseBtn = document.getElementById('requestModalCloseBtn');
    if (requestModalCloseBtn) {
      requestModalCloseBtn.addEventListener('click', () => {
        const modalEl = document.getElementById('requestModal');
        const formEl = document.getElementById('requestForm');
        if (modalEl) modalEl.classList.add('hidden');
        if (formEl) formEl.reset();
      });
    }

    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
      requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const empIdEl = document.getElementById('req_empId');
        const nameEl = document.getElementById('req_name');
        const phoneEl = document.getElementById('req_phone');
        const dateEl = document.getElementById('req_date');
        const reasonEl = document.getElementById('req_reason');
        const noteEl = document.getElementById('req_note');
        const typeEl = document.getElementById('req_type');
        const targetShiftEl = document.getElementById('req_target_shift');
        if (!empIdEl || !nameEl || !phoneEl || !dateEl || !reasonEl || !typeEl) return;

        const empId = empIdEl.value.trim();
        const name = nameEl.value.trim().toUpperCase();
        const phone = phoneEl.value.trim();
        const date = dateEl.value;
        const reason = reasonEl.value.trim();
        const type = typeEl.value;
        let note = noteEl ? noteEl.value.trim() : '';
        let targetShift = '';
        
        if (type === 'XIN OFF') {
          const now = new Date();
          const hour = now.getHours();
          if (hour >= 18 || hour < 6) {
            Utils.showToast('Hệ thống khóa Xin Off trong thời gian từ 18:00 đến 06:00 sáng hôm sau!', 'error');
            return;
          }
        }

        if ((type === 'XIN LÊN CA' || type === 'XIN OFF') && targetShiftEl) {
           targetShift = targetShiftEl.value;
           let shiftName = targetShiftEl.options[targetShiftEl.selectedIndex].text;
           if (targetShift === 'ALL') shiftName = 'Tất cả các ca';
           note = `[${type === 'XIN OFF' ? 'Xin Off' : 'Xin ca'}: ${shiftName}] ` + note;
        }

        if (!empId || !name || !phone || !date || (type === 'XIN OFF' && !reason)) {
          Utils.showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
          return;
        }

        const btn = document.getElementById('requestSubmitBtn');
        try {
          if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ Đang gửi...';
          }

          // Format timestamp kiểu DD/MM/YYYY HH:mm:ss
          const now = new Date();
          const ts = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
          
          // Format ngày DD/MM/YYYY
          const [y,m,d2] = date.split('-');
          const dateFormatted = `${d2}/${m}/${y}`;

          await DataManager.submitRequest({ empId, name, phone, type, reason, date: dateFormatted, note, targetShift, timestamp: ts });

          const modalEl = document.getElementById('requestModal');
          if (modalEl) modalEl.classList.add('hidden');
          requestForm.reset();
          
          // Tự động tải lại bảng để thấy ngay người vừa xin lên ca
          const refreshBtn = document.getElementById('refreshBtn');
          if (refreshBtn) refreshBtn.click();

          // Hiển thị thông tin lên bảng thông báo thành công
          const reqSuccessModal = document.getElementById('requestSuccessModal');
          if (reqSuccessModal) {
            const successTypeEl = document.getElementById('reqSuccessType');
            const successTypeLabelEl = document.getElementById('reqSuccessTypeLabel');
            const successIdEl = document.getElementById('reqSuccessId');
            const successNameEl = document.getElementById('reqSuccessName');
            const successPhoneEl = document.getElementById('reqSuccessPhone');
            const successDateEl = document.getElementById('reqSuccessDate');
            const successReasonEl = document.getElementById('reqSuccessReason');
            const successNoteRowEl = document.getElementById('reqSuccessNoteRow');
            const successNoteEl = document.getElementById('reqSuccessNote');

            if (successTypeEl) successTypeEl.textContent = type === 'XIN OFF' ? 'OFF' : 'LÊN CA';
            if (successTypeLabelEl) {
              successTypeLabelEl.textContent = type;
              successTypeLabelEl.style.color = type === 'XIN OFF' ? '#ffbe00' : '#4fc3f7';
            }
            if (successIdEl) successIdEl.textContent = empId.toUpperCase();
            if (successNameEl) successNameEl.textContent = name;
            if (successPhoneEl) successPhoneEl.textContent = phone;
            if (successDateEl) successDateEl.textContent = dateFormatted;
            if (successReasonEl) successReasonEl.textContent = reason;
            
            if (successNoteRowEl) {
              if (note) {
                successNoteRowEl.style.display = 'flex';
                if (successNoteEl) successNoteEl.textContent = note;
              } else {
                successNoteRowEl.style.display = 'none';
              }
            }
            
            reqSuccessModal.classList.remove('hidden');
          }

          Utils.showToast(`✅ Đăng ký ${type} thành công!`, 'success');
        } catch (err) {
          Utils.showToast('Lỗi gửi yêu cầu: ' + err.message, 'error');
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = '📤 Gửi Yêu Cầu';
          }
        }
      });
    }

    // Close Request Success Modal
    const reqSuccessCloseBtn = document.getElementById('reqSuccessCloseBtn');
    if (reqSuccessCloseBtn) {
      reqSuccessCloseBtn.addEventListener('click', () => {
        const successModal = document.getElementById('requestSuccessModal');
        if (successModal) successModal.classList.add('hidden');
      });
    }
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
      
      const shift = State.shifts.find(s => s.id === State.selectedShiftId);
      const positions = empData.positions || [];
      
      // Render vị trí đầu tiên làm chính
      document.getElementById('prcMain').textContent = positions[0] || 'Chưa xếp lịch';
      
      let slotsHTML = `
        <div class="prc-slot">
          <span class="prc-slot-lbl">Định danh</span>
          <span class="prc-slot-val">${empData.dinhDanh || '—'}</span>
        </div>
      `;

      if (shift && shift.colHeaders) {
        shift.colHeaders.forEach((header, index) => {
          slotsHTML += `
            <div class="prc-slot">
              <span class="prc-slot-lbl">${header}</span>
              <span class="prc-slot-val">${positions[index] || '—'}</span>
            </div>
          `;
        });
      }

      slotsHTML += `
        <div class="prc-slot" style="grid-column: 1 / -1; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 5px;">
          <span class="prc-slot-lbl">Ghi chú (NOTE)</span>
          <span class="prc-slot-val" style="color:#aaa">${empData.note || 'Không có ghi chú'}</span>
        </div>
      `;

      const prcSlotsEl = document.getElementById('prcSlots');
      if (prcSlotsEl) prcSlotsEl.innerHTML = slotsHTML;
    }
  }
};

// ==========================================
// GIAO DIỆN QUẢN TRỊ (ADMIN UI)
// ==========================================
const AdminApp = {
  currentViewMode: 'final', // 'final' (Đã Chốt) hoặc 'registration' (Lịch Đăng Ký)
  checkinUnsubscribe: null,
  
  listenToCheckins: () => {
    if (!window.FirebaseDB?.db) return;
    const { collection, query, where, onSnapshot } = window.FirebaseDB;
    const db = window.FirebaseDB.db;
    
    // We only want events that happen NOW onwards to update the UI
    const startTime = Date.now() - 5000; 

    const q = query(collection(db, "checkins"), where("serverTimestamp", ">=", startTime));
    if (AdminApp.checkinUnsubscribe) {
      AdminApp.checkinUnsubscribe();
    }
    AdminApp.checkinUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          // If the admin is currently viewing the shift that got updated
          if (AdminApp.currentViewMode === 'final' && State.selectedShiftId === data.shiftId) {
            // Find employee in State.scheduleData
            const emp = State.scheduleData.find(e => {
              const eId = (e.id || e.stt || '').toString().toLowerCase().trim();
              const dId = (data.empId || '').toString().toLowerCase().trim();
              return eId === dId;
            });
            
            if (emp) {
              emp.status = 'confirmed';
              emp.timestamp = data.timestamp;
              if (data.phone) emp.phone = data.phone;
              // Save to local cache
              DataManager.saveSchedule(State.selectedShiftId, State.scheduleData);
              // Re-render
              AdminApp.renderTable();
            }
          }
        }
      });
    });
  },

  init: () => {
    try {
      AdminApp.setupEvents();
      AdminApp.listenToCheckins();
      
      // Khôi phục tài khoản đăng nhập nếu có
      const savedEmail = localStorage.getItem('admin_email');
      if (savedEmail) {
        const emailInput = document.getElementById('adminEmailInput');
        const changeBtn = document.getElementById('changeAdminAccountBtn');
        if (emailInput && changeBtn) {
          emailInput.value = savedEmail;
          emailInput.setAttribute('readonly', 'true');
          changeBtn.classList.remove('hidden');
        }
      }
    } catch (e) {
      console.error("Lỗi setupEvents:", e);
    }
    try {
      AdminApp.renderShiftTabs();
    } catch (e) {
      console.error("Lỗi renderShiftTabs:", e);
    }
    try {
      AdminApp.startClock();
    } catch (e) {
      console.error("Lỗi startClock:", e);
    }
    
    // Clear search and filter values on startup to prevent browser autofill bugs
    try {
      const searchInput = document.getElementById('adminQuerySearch') || document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) statusFilter.value = 'all';
    } catch (e) {
      console.error("Lỗi reset ô lọc:", e);
    }
  },

  startAutoRefresh: () => {
    AdminApp.stopAutoRefresh();
    AdminApp.refreshTimer = setInterval(() => {
      // Chỉ tự tải lại khi đang ở tab danh sách (không phải lúc đang preview)
      const preview = document.getElementById('previewContainer');
      if (preview && preview.classList.contains('hidden')) {
        AdminApp.loadData(true); // true = silent refresh
      }
    }, CONFIG.REFRESH_INTERVAL);
  },

  stopAutoRefresh: () => {
    if (AdminApp.refreshTimer) clearInterval(AdminApp.refreshTimer);
  },

  startClock: () => {
    const update = () => {
      const savedDate = localStorage.getItem('agr_schedule_date');
      const d = savedDate ? new Date(savedDate) : new Date();
      const dateEl = document.getElementById('currentDate');
      const timeEl = document.getElementById('currentTime');
      if (dateEl) dateEl.textContent = Utils.formatDate(d);
      
      const now = new Date();
      if (timeEl) timeEl.textContent = Utils.formatTime(now);
    };
    update();
    setInterval(update, 1000);
  },

  switchToAdmin: () => {
    State.isAdminMode = true;
    const empView = document.getElementById('employeeView');
    const admView = document.getElementById('adminView');
    const empBottomNav = document.getElementById('empBottomNav');
    if (empView) empView.classList.remove('active');
    if (admView) admView.classList.add('active');
    if (empBottomNav) empBottomNav.classList.add('hidden');
    
    AdminApp.loadData();
    // Auto refresh cho admin
    AdminApp.startAutoRefresh();
  },

  switchToEmployee: () => {
    State.isAdminMode = false;
    const empView = document.getElementById('employeeView');
    const admView = document.getElementById('adminView');
    const empBottomNav = document.getElementById('empBottomNav');
    if (admView) admView.classList.remove('active');
    if (empView) empView.classList.add('active');
    if (empBottomNav) empBottomNav.classList.remove('hidden');
    AdminApp.stopAutoRefresh();
  },

  setupEvents: () => {
    // Modal Login
    const loginCancelBtn = document.getElementById('adminLoginCancelBtn');
    if (loginCancelBtn) {
      loginCancelBtn.addEventListener('click', () => {
        const loginModal = document.getElementById('adminLoginModal');
        const passInput = document.getElementById('adminPasswordInput');
        if (loginModal) loginModal.classList.add('hidden');
        if (passInput) passInput.value = '';
      });
    }

    const changeAdminAccountBtn = document.getElementById('changeAdminAccountBtn');
    const adminEmailInput = document.getElementById('adminEmailInput');
    if (changeAdminAccountBtn && adminEmailInput) {
      changeAdminAccountBtn.addEventListener('click', () => {
        localStorage.removeItem('admin_email');
        adminEmailInput.value = '';
        adminEmailInput.removeAttribute('readonly');
        changeAdminAccountBtn.classList.add('hidden');
        adminEmailInput.focus();
      });
    }
    
    const loginSubmitBtn = document.getElementById('adminLoginSubmitBtn');
    if (loginSubmitBtn) {
      loginSubmitBtn.addEventListener('click', () => {
        const passInput = document.getElementById('adminPasswordInput');
        const emailInput = document.getElementById('adminEmailInput');
        const errorEl = document.getElementById('adminLoginError');
        
        const email = emailInput ? emailInput.value.trim() : '';
        const pass = passInput ? passInput.value : '';
        
        if (!email || !pass) {
          if (errorEl) {
            errorEl.textContent = 'Vui lòng nhập đầy đủ Email và Mật khẩu';
            errorEl.classList.remove('hidden');
          }
          return;
        }

        const originalText = loginSubmitBtn.innerHTML;
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML = '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;margin-right:8px;border-color:rgba(255,255,255,0.3);border-top-color:#fff;display:inline-block;border-radius:50%;animation:spin 1s linear infinite;"></span> Đang xử lý...';
        if (errorEl) errorEl.classList.add('hidden');

        fetch(CONFIG.APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: "admin_login", email: email, password: pass })
        })
        .then(res => res.json())
        .then(json => {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.innerHTML = originalText;
          if (json.success) {
            localStorage.setItem('admin_email', email);
            if (adminEmailInput) adminEmailInput.setAttribute('readonly', 'true');
            if (changeAdminAccountBtn) changeAdminAccountBtn.classList.remove('hidden');
            
            const loginModal = document.getElementById('adminLoginModal');
            if (loginModal) loginModal.classList.add('hidden');
            if (passInput) passInput.value = '';
            AdminApp.switchToAdmin();
          } else {
            if (errorEl) {
              errorEl.textContent = json.error || 'Đăng nhập thất bại';
              errorEl.classList.remove('hidden');
            }
          }
        })
        .catch(err => {
          console.error("Login Error:", err);
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.innerHTML = originalText;
          if (errorEl) {
            errorEl.textContent = 'Lỗi kết nối máy chủ';
            errorEl.classList.remove('hidden');
          }
        });
      });
    }

    // View Mode Toggle
    const btnViewModeFinal = document.getElementById('viewModeFinal');
    const btnViewModeReg = document.getElementById('viewModeReg');
    if (btnViewModeFinal && btnViewModeReg) {
      btnViewModeFinal.addEventListener('click', () => {
        AdminApp.currentViewMode = 'final';
        btnViewModeFinal.style.background = 'var(--primary)';
        btnViewModeFinal.style.color = 'white';
        btnViewModeFinal.classList.remove('btn-ghost');
        btnViewModeReg.style.background = 'transparent';
        btnViewModeReg.style.color = 'var(--text-secondary)';
        btnViewModeReg.classList.add('btn-ghost');
        AdminApp.loadData();
      });
      btnViewModeReg.addEventListener('click', () => {
        AdminApp.currentViewMode = 'registration';
        btnViewModeReg.style.background = 'var(--primary)';
        btnViewModeReg.style.color = 'white';
        btnViewModeReg.classList.remove('btn-ghost');
        btnViewModeFinal.style.background = 'transparent';
        btnViewModeFinal.style.color = 'var(--text-secondary)';
        btnViewModeFinal.classList.add('btn-ghost');
        AdminApp.loadData();
      });
    }

    // Exit Admin
    const exitAdminBtn = document.getElementById('exitAdminBtn');
    if (exitAdminBtn) {
      exitAdminBtn.addEventListener('click', AdminApp.switchToEmployee);
    }

    // Settings Modal
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', AdminApp.openSettingsModal);
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    if (settingsCloseBtn) settingsCloseBtn.addEventListener('click', AdminApp.closeSettings);
    const settingsCancelBtn = document.getElementById('settingsCancelBtn');
    if (settingsCancelBtn) settingsCancelBtn.addEventListener('click', AdminApp.closeSettings);
    const settingsSaveBtn = document.getElementById('settingsSaveBtn');
    if (settingsSaveBtn) settingsSaveBtn.addEventListener('click', AdminApp.saveSettings);
    
    const btnResetRegistrations = document.getElementById('btnResetRegistrations');
    if (btnResetRegistrations) btnResetRegistrations.addEventListener('click', AdminApp.resetRegistrations);

    // Refresh & Search
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        AdminApp.loadData().then(() => {
          setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
        });
      });
    }

    const searchInput = document.getElementById('adminQuerySearch') || document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', AdminApp.filterScheduleTable);
    }

    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', AdminApp.filterScheduleTable);
    }

    const regPeriodSelect = document.getElementById('regPeriodSelect');
    if (regPeriodSelect) {
      regPeriodSelect.addEventListener('change', () => {
        if (AdminApp.allRegistrationPeriods && AdminApp.allRegistrationPeriods.length > 0) {
          const idx = parseInt(regPeriodSelect.value, 10);
          if (!isNaN(idx) && AdminApp.allRegistrationPeriods[idx]) {
            AdminApp.renderRegistrationTable(AdminApp.allRegistrationPeriods[idx]);
          }
        }
      });
    }

    // Manager Panel (Update Schedule)
    const managerBtn = document.getElementById('managerBtn');
    if (managerBtn) {
      managerBtn.addEventListener('click', () => {
        AdminApp.openManagerModal();
      });
    }

    const syncRegistrationBtn = document.getElementById('syncRegistrationBtn');
    if (syncRegistrationBtn) {
      syncRegistrationBtn.addEventListener('click', async () => {
        if (!confirm('Hệ thống sẽ tự động tổng hợp tất cả những người đăng ký WORK vào Lịch làm việc. Bạn có chắc chắn muốn chạy ngay bây giờ?')) return;
        
        const originalText = syncRegistrationBtn.innerHTML;
        syncRegistrationBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;margin-right:6px"></span> Đang đồng bộ...';
        syncRegistrationBtn.disabled = true;
        
        try {
          const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'sync_roster', shiftId: State.selectedShiftId })
          });
          const result = await res.json();
          if (result.success) {
            alert(result.message || 'Đã đồng bộ lịch thành công!');
            // Reload data
            if (AdminApp.currentViewMode === 'final') {
              AdminApp.loadScheduleData(State.selectedShiftId);
            }
          } else {
            alert('Lỗi: ' + result.error);
          }
        } catch (err) {
          alert('Lỗi kết nối: ' + err.message);
        } finally {
          syncRegistrationBtn.innerHTML = originalText;
          syncRegistrationBtn.disabled = false;
        }
      });
    }
    const managerCloseBtn = document.getElementById('managerCloseBtn');
    if (managerCloseBtn) {
      managerCloseBtn.addEventListener('click', () => {
        const modal = document.getElementById('managerModal');
        if (modal) modal.classList.add('hidden');
      });
    }
    const managerLogoutBtn = document.getElementById('managerLogoutBtn');
    if (managerLogoutBtn) {
      managerLogoutBtn.addEventListener('click', () => {
        const modal = document.getElementById('managerModal');
        if (modal) modal.classList.add('hidden');
      });
    }

    const parsePasteBtn = document.getElementById('parsePasteBtn');
    if (parsePasteBtn) parsePasteBtn.addEventListener('click', AdminApp.parsePastedData);
    
    const clearPasteBtn = document.getElementById('clearPasteBtn');
    if (clearPasteBtn) {
      clearPasteBtn.addEventListener('click', () => {
        const pasteArea = document.getElementById('pasteDataArea');
        const preview = document.getElementById('previewContainer');
        const saveBtn = document.getElementById('saveScheduleBtn');
        if (pasteArea) pasteArea.value = '';
        if (preview) preview.classList.add('hidden');
        if (saveBtn) saveBtn.disabled = true;
      });
    }

    const saveScheduleBtn = document.getElementById('saveScheduleBtn');
    if (saveScheduleBtn) saveScheduleBtn.addEventListener('click', AdminApp.savePastedSchedule);
    
    const clearScheduleBtn = document.getElementById('clearScheduleBtn');
    if (clearScheduleBtn) {
      clearScheduleBtn.addEventListener('click', async () => {
        if (confirm('Bạn có chắc chắn muốn XÓA LỊCH CA này và trở về dữ liệu Demo ban đầu?')) {
          try {
            localStorage.removeItem(Utils.getShiftStorageKey(State.selectedShiftId));
            Utils.showToast('Đã khôi phục dữ liệu Demo.', 'info');
            const modal = document.getElementById('managerModal');
            if (modal) modal.classList.add('hidden');
            AdminApp.loadData();
          } catch (e) {
            console.error("Lỗi xóa ca:", e);
          }
        }
      });
    }
  },

  renderShiftTabs: () => {
    const list = document.getElementById('shiftTabsList');
    if (!list) return;
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
        const statusDot = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionText');
        if (statusDot) statusDot.className = 'status-dot loading';
        if (statusText) statusText.textContent = 'Đang tải...';
      }

      // Update badge
      const shift = State.shifts.find(s => s.id === State.selectedShiftId);
      const badge = document.getElementById('shiftBadge');
      if (badge && shift) {
        badge.textContent = shift.label.toUpperCase();
        badge.style.background = `linear-gradient(135deg, ${shift.color}, #222)`;
      }

      const requestsData = await DataManager.loadRequests();
      
      let data = [];
      const filterSelect = document.getElementById('statusFilter');
      const regPeriodSelect = document.getElementById('regPeriodSelect');
      
      if (AdminApp.currentViewMode === 'final') {
        data = await DataManager.loadSchedule(State.selectedShiftId);
        State.scheduleData = data;
        AdminApp.renderTable();
        if (filterSelect) filterSelect.style.display = 'inline-block';
        if (regPeriodSelect) regPeriodSelect.style.display = 'none';
      } else {
        const regRes = await DataManager.loadRegistrations(State.selectedShiftId);
        if (filterSelect) filterSelect.style.display = 'none';
        
        AdminApp.allRegistrationPeriods = regRes.periods || [];
        if (regPeriodSelect) {
           regPeriodSelect.innerHTML = '';
           if (AdminApp.allRegistrationPeriods.length > 0) {
              regPeriodSelect.style.display = 'inline-block';
              AdminApp.allRegistrationPeriods.forEach((p, idx) => {
                 const opt = document.createElement('option');
                 opt.value = idx;
                 opt.textContent = p.name || p.id;
                 regPeriodSelect.appendChild(opt);
              });
              const defaultIdx = AdminApp.allRegistrationPeriods.length - 1;
              regPeriodSelect.value = defaultIdx;
              AdminApp.renderRegistrationTable(AdminApp.allRegistrationPeriods[defaultIdx]);
           } else {
              regPeriodSelect.style.display = 'none';
              AdminApp.renderRegistrationTable({ headers: [], data: [] });
           }
        } else {
           AdminApp.renderRegistrationTable(AdminApp.allRegistrationPeriods[AdminApp.allRegistrationPeriods.length - 1] || { headers: [], data: [] });
        }
      }
      
      const adminSearch = document.getElementById('adminQuerySearch');
      if (adminSearch) {
         adminSearch.value = '';
      }
      AdminApp.renderStats();
      AdminApp.renderLogs();

      const statusDot = document.getElementById('connectionStatus');
      const statusText = document.getElementById('connectionText');
      if (statusDot) statusDot.className = 'status-dot online';
      if (statusText) statusText.textContent = CONFIG.API_URL ? '⚡ Realtime (Google Sheets)' : '⭕ Offline (Local)';
    } catch (err) {
      if(!isSilent) Utils.showToast('Lỗi tải dữ liệu', 'error');
      const statusDot = document.getElementById('connectionStatus');
      const statusText = document.getElementById('connectionText');
      if (statusDot) statusDot.className = 'status-dot error';
      if (statusText) statusText.textContent = 'Lỗi kết nối';
    }
  },

  renderRegistrationTable: (payload) => {
    AdminApp.currentRegPayload = payload;
    const dataList = payload.data || [];
    let dateHeaders = payload.headers || [];
    
    const tbody = document.getElementById('scheduleBody');
    const thead = document.getElementById('scheduleHead');
    if (!tbody) return;
    
    // Update counters
    const totalCount = dataList.length;
    const statTotal = document.getElementById('totalEmployees');
    const statPresent = document.getElementById('confirmedCount');
    const statAbsent = document.getElementById('pendingCount');
    const statOff = document.getElementById('xinOffCountTop');
    
    if (statTotal) statTotal.innerText = totalCount;
    if (statPresent) statPresent.innerText = '0';
    if (statAbsent) statAbsent.innerText = totalCount;
    if (statOff) statOff.innerText = '0';

    if (dataList.length === 0) {
      if (thead) {
        thead.innerHTML = `<tr><th>STT</th><th>Mã NV</th><th>Họ Tên</th><th>Thời gian gửi</th></tr>`;
      }
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding:24px; color:var(--text-secondary)">Chưa có ai đăng ký ca này</td></tr>`;
      return;
    }

    // Fallback if API doesn't provide headers
    if (dateHeaders.length === 0 && dataList[0].selections && Array.isArray(dataList[0].selections)) {
      dateHeaders = dataList[0].selections.map(s => s.label);
    }

    // Đổi header cho chế độ Đăng Ký
    if (thead) {
      let html = `
        <tr>
          <th style="width: 40px; text-align: center;"><input type="checkbox" id="selectAllReg" style="cursor: pointer;"></th>
          <th>STT</th>
          <th>Mã NV</th>
          <th>Họ Tên</th>
          <th>Số ĐT</th>
          <th>Tên Ca</th>
      `;
      dateHeaders.forEach(date => {
        const filterVal = AdminApp.regDateFilters?.[date] || '';
        html += `
          <th style="text-align:center; min-width: 100px;">
            <div style="margin-bottom: 4px;">${date}</div>
            <select class="reg-date-filter" data-date="${date}" style="font-size: 11px; padding: 2px 4px; width: 100%; border-radius: 4px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white;">
              <option value="" style="color: black">Tất cả</option>
              <option value="WORK" style="color: black" ${filterVal === 'WORK' ? 'selected' : ''}>WORK</option>
              <option value="OFF" style="color: black" ${filterVal === 'OFF' ? 'selected' : ''}>OFF</option>
            </select>
          </th>
        `;
      });
      html += `<th>Thời gian gửi</th></tr>`;
      thead.innerHTML = html;

      // Add delete button if it doesn't exist in toolbar
      let toolbar = document.querySelector('.admin-toolbar');
      if (toolbar && !document.getElementById('btnDeleteSelectedReg')) {
        const btnHtml = `<button id="btnDeleteSelectedReg" class="btn" style="background:var(--danger); color:white; border:none; margin-left:10px; display:none; padding:8px 16px;">Xóa đã chọn</button>`;
        toolbar.insertAdjacentHTML('beforeend', btnHtml);
        
        document.getElementById('btnDeleteSelectedReg').addEventListener('click', async () => {
          const checked = document.querySelectorAll('.reg-checkbox:checked');
          if (checked.length === 0) return;
          if (!confirm(`Bạn có chắc chắn muốn xóa ${checked.length} đăng ký đã chọn trên hệ thống (không ảnh hưởng Google Sheets)?`)) return;
          
          try {
            const db = window.FirebaseDB?.db;
            if (db) {
              const { collection, query, where, getDocs, deleteDoc } = window.FirebaseDB;
              const regRef = collection(db, "registrations");
              
              for (const cb of checked) {
                const empId = cb.value;
                const shiftId = cb.dataset.shift;
                // Delete from Firebase
                const q = query(regRef, where("empId", "==", empId), where("shiftId", "==", shiftId));
                const snap = await getDocs(q);
                const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deletePromises);
              }
              Utils.showToast(`Đã xóa thành công ${checked.length} bản ghi trên hệ thống.`, 'success');
              AdminApp.loadData(); // Tải lại bảng
            } else {
              Utils.showToast('Không thể kết nối tới Firebase để xóa', 'error');
            }
          } catch (e) {
            Utils.showToast('Lỗi khi xóa: ' + e.message, 'error');
          }
        });
      }

      // Handle Select All
      document.getElementById('selectAllReg').addEventListener('change', (e) => {
        const cbs = document.querySelectorAll('.reg-checkbox');
        cbs.forEach(cb => cb.checked = e.target.checked);
        AdminApp.toggleDeleteBtn();
      });
      
      // Handle Date Filters
      document.querySelectorAll('.reg-date-filter').forEach(sel => {
        sel.addEventListener('change', (e) => {
          if (!AdminApp.regDateFilters) AdminApp.regDateFilters = {};
          AdminApp.regDateFilters[e.target.dataset.date] = e.target.value;
          AdminApp.renderRegistrationTable(AdminApp.currentRegPayload);
        });
      });
    }
    
    tbody.innerHTML = '';
    
    // Filter data based on regDateFilters
    const filteredDataList = dataList.filter(r => {
      let pass = true;
      if (!AdminApp.regDateFilters) return true;
      
      dateHeaders.forEach((date, i) => {
        const filterVal = AdminApp.regDateFilters[date];
        if (!filterVal) return; // if 'Tất cả' or no filter
        
        let choice = '';
        if (r.choices && Array.isArray(r.choices)) {
          choice = r.choices[i];
        } else if (r.selections && Array.isArray(r.selections)) {
          choice = r.selections[i]?.choice;
        }
        
        if (choice !== filterVal) pass = false;
      });
      return pass;
    });

    if (filteredDataList.length === 0 && dataList.length > 0) {
      tbody.innerHTML = `<tr><td colspan="${dateHeaders.length + 7}" class="text-center" style="padding:24px; color:var(--text-secondary)">Không có nhân sự nào khớp với bộ lọc</td></tr>`;
    }

    filteredDataList.forEach((r, idx) => {
      const tr = document.createElement('tr');
      let html = `
        <td style="text-align:center"><input type="checkbox" class="reg-checkbox" value="${r.empId}" data-shift="${r.shiftId || State.selectedShiftId}" style="cursor: pointer;"></td>
        <td style="text-align:center">${idx + 1}</td>
        <td><span class="emp-id-badge">${r.empId}</span></td>
        <td style="font-weight:600; color:var(--text-main); white-space:nowrap">${r.name || r.empName || ''}</td>
        <td>${r.empPhone || r.phone || ''}</td>
        <td>${r.shiftLabel || State.shifts.find(s => s.id === (r.shiftId || State.selectedShiftId))?.label || ''}</td>
      `;
      
      // Render selection cells (supporting both .choices and .selections API responses)
      if (r.choices && Array.isArray(r.choices)) {
        r.choices.forEach(choice => {
          const isOff = choice === 'OFF';
          const style = isOff ? 'color:var(--danger); font-weight:bold;' : 'color:var(--success); font-weight:600;';
          html += `<td style="text-align:center; ${style}">${choice || ''}</td>`;
        });
      } else if (r.selections && Array.isArray(r.selections)) {
        r.selections.forEach(sel => {
          const isOff = sel.choice === 'OFF';
          const style = isOff ? 'color:var(--danger); font-weight:bold;' : 'color:var(--success); font-weight:600;';
          html += `<td style="text-align:center; ${style}">${sel.choice || ''}</td>`;
        });
      } else {
        // If somehow no selections exist for this row, fill with empty cells
        dateHeaders.forEach(() => {
          html += `<td></td>`;
        });
      }

      // Add timestamp
      html += `
        <td style="color:var(--text-secondary); text-align:left;">
          <span style="display:inline-block; padding:2px 6px; background:rgba(255,255,255,0.1); border-radius:4px; font-size:11px;">${r.timestamp}</span>
        </td>
      `;
      
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });

    // BÁO CÁO TỔNG NHÂN SỰ ĐI LÀM TRONG CA THEO TỪNG NGÀY
    if (filteredDataList.length > 0) {
      const summaryTr = document.createElement('tr');
      summaryTr.style.background = 'rgba(255, 255, 255, 0.05)';
      
      let summaryHtml = `
        <td colspan="6" style="text-align: right; padding-right: 16px; font-weight: bold; color: var(--text-main);">TỔNG SỐ LƯỢNG (WORK):</td>
      `;
      
      dateHeaders.forEach((date, i) => {
        let workCount = 0;
        filteredDataList.forEach(r => {
          let choice = '';
          if (r.choices && Array.isArray(r.choices)) {
            choice = r.choices[i];
          } else if (r.selections && Array.isArray(r.selections)) {
            choice = r.selections[i]?.choice;
          }
          if (choice === 'WORK') workCount++;
        });
        summaryHtml += `<td style="text-align:center; color:var(--success); font-size: 16px; font-weight: bold;">${workCount}</td>`;
      });
      
      summaryHtml += `<td></td>`;
      summaryTr.innerHTML = summaryHtml;
      tbody.appendChild(summaryTr);
    }

    // Handle individual checkbox change
    document.querySelectorAll('.reg-checkbox').forEach(cb => {
      cb.addEventListener('change', AdminApp.toggleDeleteBtn);
    });
  },

  toggleDeleteBtn: () => {
    const checked = document.querySelectorAll('.reg-checkbox:checked').length;
    const btn = document.getElementById('btnDeleteSelectedReg');
    if (btn) {
      btn.style.display = checked > 0 ? 'inline-block' : 'none';
      btn.innerText = `Xóa đã chọn (${checked})`;
    }
  },

  renderTable: () => {
    const tbody = document.getElementById('scheduleBody');
    if (!tbody) return;
    const shift = State.shifts.find(s => s.id === State.selectedShiftId);
    const colCount = shift ? shift.colHeaders.length + 6 : 10;
    
    tbody.innerHTML = '';
    
    // Check view mode
    if (AdminApp.currentViewMode === 'registration') {
      AdminApp.renderRegistrationTable([]); // Should not reach here normally, but just in case
      return;
    }

    if (!State.scheduleData || State.scheduleData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu lịch ca này. Vui lòng thêm bằng tính năng Quản lý.</td></tr>`;
      return;
    }

    // Lấy danh sách ID đã xin nghỉ/lên ca từ localStorage
    let requests = [];
    try {
      const stored = localStorage.getItem('agr_requests');
      if (stored) requests = JSON.parse(stored);
      
      const scheduleDate = localStorage.getItem('agr_schedule_date');
      if (scheduleDate) {
        requests = requests.filter(r => {
          if (!r || !r.date) return false;
          let rDateStr = r.date.toString();
          if (rDateStr.includes('T')) {
            const d = new Date(rDateStr);
            rDateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
          }
          return rDateStr === scheduleDate || rDateStr.startsWith(scheduleDate);
        });
      }
    } catch (e) {
      console.error("Lỗi đọc dự án:", e);
    }
    const offIds = new Set((requests || []).filter(r => r && r.type === 'XIN OFF' && r.empId).map(r => r.empId.toLowerCase().trim()));
    const extraIds = new Set((requests || []).filter(r => r && r.type === 'XIN LÊN CA' && r.empId).map(r => r.empId.toLowerCase().trim()));

    const timeStatus = Utils.isWithinTimeWindow(State.selectedShiftId);
    const isTimeOver = timeStatus.isOver;

    tbody.innerHTML = State.scheduleData.map(emp => {
      const empIdLower = (emp.id || '').toLowerCase().trim();
      const isOff = offIds.has(empIdLower) || emp.status === 'xin off';
      const isExtra = extraIds.has(empIdLower);
      const isAutoOff = !isOff && !isExtra && emp.status !== 'confirmed' && isTimeOver;
      
      let rowClass = isOff ? 'xin-off-row' : (emp.status === 'confirmed' ? 'attended' : '');
      if (isAutoOff) rowClass = 'auto-off-row';

      let confirmCell = '';
      if (isOff) {
        confirmCell = `<span class="xin-off-badge">📋 Xin Off</span>`;
      } else if (isAutoOff) {
        confirmCell = `<span class="auto-off-badge">OFF CHƯA ĐIỂM DANH</span>`;
      } else if (isExtra) {
        confirmCell = `<span class="xin-len-ca-badge">⬆️ Xin Lên Ca</span>`;
      } else if (emp.status === 'confirmed') {
        confirmCell = `<div class="confirm-badge confirmed" title="Đã điểm danh lúc ${emp.timestamp}">✓</div>`;
      } else {
        confirmCell = `<div class="confirm-badge pending"></div>`;
      }

      const posCells = shift ? shift.colHeaders.map((_, idx) => {
        const p = emp.positions ? emp.positions[idx] : '';
        return `<td><span class="position-tag ${!p ? 'empty' : ''}">${p || 'Chưa xếp'}</span></td>`;
      }).join('') : '';

      return `
      <tr class="${rowClass}">
        <td>${emp.stt}</td>
        <td><span class="employee-code">${emp.id}</span></td>
        <td style="font-weight:500">${emp.name}</td>
        <td><span class="dinhDanh-badge">${emp.dinhDanh || ''}</span></td>
        ${posCells}
        <td><span style="font-size:12px; color:var(--text-muted)">${emp.note || ''}</span></td>
        <td class="confirm-cell">${confirmCell}</td>
      </tr>`;
    }).join('');

    // Cập nhật header bảng theo ca hiện tại
    const thead = document.getElementById('scheduleHead');
    if (thead && shift) {
      const posHeaders = shift.colHeaders.map(h => `<th>${h}</th>`).join('');
      thead.innerHTML = `<tr><th>STT</th><th>Mã CTV</th><th>Họ tên</th><th>Định danh</th>${posHeaders}<th>Note</th><th>Xác nhận</th></tr>`;
    }

    // Áp dụng bộ lọc và tìm kiếm hiện tại
    AdminApp.filterScheduleTable();
  },

  filterScheduleTable: () => {
    const searchInput = document.getElementById('adminQuerySearch') || document.getElementById('searchInput');
    if (!searchInput) return;
    let searchVal = searchInput.value.trim();
    const lowerVal = searchVal.toLowerCase();
    
    // Tự động dọn dẹp các từ khóa tiêu đề do browser autofill nhầm
    if (lowerVal === "hệ thống điểm danh" || 
        lowerVal === "hệ thống" || 
        lowerVal === "hệ thống điểm danh quản trị" || 
        lowerVal === "agr điểm danh" || 
        lowerVal === "agr | điểm danh") {
      searchInput.value = '';
      searchVal = '';
    }

    const searchValLower = searchVal.toLowerCase();
    const filterEl = document.getElementById('statusFilter');
    const filterVal = filterEl ? filterEl.value : 'all';

    document.querySelectorAll('#scheduleBody tr').forEach(row => {
      if (row.classList.contains('loading-row') || row.cells.length <= 1) return;

      const text = row.textContent.toLowerCase();
      const matchesSearch = text.includes(searchValLower);

      let matchesFilter = true;
      if (filterVal !== 'all') {
        if (filterVal === 'confirmed') {
          matchesFilter = row.classList.contains('attended');
        } else if (filterVal === 'pending') {
          matchesFilter = !row.classList.contains('attended') && !row.classList.contains('xin-off-row') && !row.querySelector('.xin-len-ca-badge');
        } else if (filterVal === 'xin-off') {
          matchesFilter = row.classList.contains('xin-off-row') || row.querySelector('.xin-off-badge') !== null;
        } else if (filterVal === 'xin-len-ca') {
          matchesFilter = row.querySelector('.xin-len-ca-badge') !== null;
        }
      }

      if (matchesSearch && matchesFilter) {
        row.classList.remove('hidden');
      } else {
        row.classList.add('hidden');
      }
    });
  },

  renderStats: () => {
    let requests = [];
    try {
      const stored = localStorage.getItem('agr_requests');
      if (stored) requests = JSON.parse(stored);
      
      const scheduleDate = localStorage.getItem('agr_schedule_date');
      if (scheduleDate) {
        requests = requests.filter(r => {
          if (!r || !r.date) return false;
          let rDateStr = r.date.toString();
          if (rDateStr.includes('T')) {
            const d = new Date(rDateStr);
            rDateStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
          }
          return rDateStr === scheduleDate || rDateStr.startsWith(scheduleDate);
        });
      }
    } catch (e) {}
    const offIds = new Set((requests || []).filter(r => r && r.type === 'XIN OFF' && r.empId).map(r => r.empId.toLowerCase().trim()));
    const extraIds = new Set((requests || []).filter(r => r && r.type === 'XIN LÊN CA' && r.empId).map(r => r.empId.toLowerCase().trim()));

    const timeStatus = Utils.isWithinTimeWindow(State.selectedShiftId);
    const isTimeOver = timeStatus.isOver;

    const total = State.scheduleData.length;
    const confirmed = State.scheduleData.filter(e => e.status === 'confirmed').length;
    
    let explicitXinOffCount = 0;
    let autoOffCount = 0;
    
    State.scheduleData.forEach(e => {
        const idLower = (e.id || '').toLowerCase().trim();
        const isOff = offIds.has(idLower) || e.status === 'xin off';
        const isExtra = extraIds.has(idLower);
        if (isOff) {
          explicitXinOffCount++;
        } else if (isTimeOver && !isExtra && e.status !== 'confirmed') {
          autoOffCount++;
        }
    });

    const xinOffCount = explicitXinOffCount + autoOffCount;
    
    const effectiveTotal = Math.max(0, total - xinOffCount);
    
    const totalEl = document.getElementById('totalEmployees');
    const confirmedEl = document.getElementById('confirmedCount');
    const pendingEl = document.getElementById('pendingCount');
    const xinOffElTop = document.getElementById('xinOffCountTop');
    
    const adminDone = document.getElementById('adminDone');
    const adminTotal = document.getElementById('adminTotal');
    const adminBar = document.getElementById('adminBar');

    if (totalEl) totalEl.textContent = effectiveTotal;
    if (confirmedEl) confirmedEl.textContent = confirmed;
    if (pendingEl) pendingEl.textContent = Math.max(0, effectiveTotal - confirmed);
    if (xinOffElTop) xinOffElTop.textContent = xinOffCount;

    if (adminDone) adminDone.textContent = confirmed;
    if (adminTotal) adminTotal.textContent = effectiveTotal;
    if (adminBar) {
      const pct = effectiveTotal === 0 ? 0 : (confirmed / effectiveTotal) * 100;
      adminBar.style.width = `${pct}%`;
    }
  },

  renderLogs: () => {
    const logList = document.getElementById('logList');
    if (!logList) return;
    const confirmed = State.scheduleData.filter(e => e.status === 'confirmed')
      .sort((a,b) => (b.timestamp || '').localeCompare(a.timestamp || '')); // Xếp mới nhất lên trên

    if (confirmed.length === 0) {
      logList.innerHTML = `<div class="log-empty">Chưa có ai điểm danh</div>`;
      return;
    }

    logList.innerHTML = confirmed.map(emp => {
      const initial = (emp.name || '').trim().charAt(0) || '?';
      return `
      <div class="log-item">
        <div class="log-avatar">${initial}</div>
        <div class="log-info">
          <div class="log-name">${emp.name || ''}</div>
          <div class="log-code">${emp.id || ''}</div>
        </div>
        <div class="log-time">${emp.timestamp || '--:--'}</div>
      </div>`;
    }).join('');
  },

  // ---- Manager Modal Logic ----
  openManagerModal: () => {
    document.getElementById('managerModal').classList.remove('hidden');
    document.getElementById('pasteDataArea').value = '';
    document.getElementById('previewContainer').classList.add('hidden');
    document.getElementById('saveScheduleBtn').disabled = true;

    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker) {
      const savedDate = localStorage.getItem('agr_schedule_date');
      if (savedDate) {
        datePicker.value = savedDate;
      } else {
        const d = new Date();
        datePicker.value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      }
    }

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
    const dfEl = document.getElementById('regDateFrom');
    const dtEl = document.getElementById('regDateTo');
    if (dfEl) dfEl.value = localStorage.getItem('agr_reg_date_from') || '';
    if (dtEl) dtEl.value = localStorage.getItem('agr_reg_date_to') || '';
    document.getElementById('settingsModal').classList.remove('hidden');
  },

  closeSettings: () => {
    document.getElementById('settingsModal').classList.add('hidden');
  },

  resetRegistrations: async () => {
    if (!confirm('Hành động này sẽ XÓA TOÀN BỘ các bảng lịch đăng ký hiện có trên Google Sheets của bạn. Bạn có chắc chắn muốn dọn dẹp để tạo kỳ đăng ký lịch mới không?')) return;
    
    const btn = document.getElementById('btnResetRegistrations');
    if (btn) btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;"></span> Đang xóa...';
    
    try {
      const url = CONFIG.API_URL;
      if (!url) throw new Error('Vui lòng thiết lập cấu hình CONFIG.API_URL trước khi xóa!');
      
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'reset_registrations' })
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      alert('Đã dọn dẹp thành công! ' + (result.message || ''));
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa lịch: ' + err.message);
    } finally {
      if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Xóa toàn bộ đăng ký lịch cũ';
    }
  },

  saveSettings: async () => {
    // Save API Link
    const newApiLink = document.getElementById('apiLinkInput').value.trim();
    if (newApiLink !== State.apiLink) {
      State.apiLink = newApiLink;
      localStorage.setItem('agr_api_url', newApiLink);
    }
    
    // Save Reg Date Range — đồng bộ lên backend trước, chỉ lưu local khi thành công
    const regFrom = document.getElementById('regDateFrom');
    const regTo   = document.getElementById('regDateTo');
    const regDateFrom = regFrom ? regFrom.value : '';
    const regDateTo = regTo ? regTo.value : '';

    if (CONFIG.API_URL && (regDateFrom || regDateTo)) {
      try {
        const resp = await fetch(CONFIG.API_URL, {
          method: 'POST',
          body: JSON.stringify({
            action: 'save_reg_config',
            regDateFrom: regDateFrom,
            regDateTo: regDateTo
          })
        });
        const json = await resp.json();
        if (json.error) {
          Utils.showToast('Lỗi lưu cấu hình đăng ký: ' + json.error, 'error');
          return; // Giữ modal mở để admin thử lại
        }
        // Backend thành công → cập nhật localStorage
        if (regDateFrom) localStorage.setItem('agr_reg_date_from', regDateFrom);
        if (regDateTo) localStorage.setItem('agr_reg_date_to', regDateTo);
        
        // Save to Firebase for employee registration screen sync
        if (window.FirebaseDB?.db) {
          const { doc, setDoc } = window.FirebaseDB;
          const configRef = doc(window.FirebaseDB.db, "config", "admin");
          setDoc(configRef, { regDateFrom, regDateTo }, { merge: true }).catch(e => console.error("Firebase config save error:", e));
        }

      } catch (err) {
        Utils.showToast('Lỗi kết nối server: ' + err.message, 'error');
        return; // Giữ modal mở để admin thử lại
      }
    } else {
      // Offline mode — chỉ lưu localStorage
      if (regFrom && regFrom.value) localStorage.setItem('agr_reg_date_from', regFrom.value);
      if (regTo   && regTo.value)   localStorage.setItem('agr_reg_date_to',   regTo.value);
      
      // Save to Firebase for employee registration screen sync
      if (window.FirebaseDB?.db) {
        const { doc, setDoc } = window.FirebaseDB;
        const configRef = doc(window.FirebaseDB.db, "config", "admin");
        setDoc(configRef, { 
          regDateFrom: regFrom ? regFrom.value : '', 
          regDateTo: regTo ? regTo.value : '' 
        }, { merge: true }).catch(e => console.error("Firebase config save error:", e));
      }
    }

    AdminApp.closeSettings();
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
    
    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
    }
    
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
  EmpNav.init();
});

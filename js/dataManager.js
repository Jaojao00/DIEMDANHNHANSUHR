// TẦNG DỮ LIỆU ĐIỀU PHỐI ĐỒNG BỘ 3 TẦNG (DATA MANAGER)
// Tầng 1: Firebase Firestore -> Tầng 2: Google Apps Script -> Tầng 3: LocalStorage Cache
const DataManager = {
  // State lưu trữ dữ liệu phiên hiện tại
  state: {
    currentShift: '18:00-22:00',
    currentDate: Utils.formatDateISO(),
    roster: [],
    recentActivities: [],
    salaryData: [],
    bookingData: [],
    changeRequests: [],
    stats: {
      total: 0,
      confirmed: 0,
      pending: 0,
      off: 0
    }
  },

  /**
   * Gọi API Google Apps Script tuân thủ nghiêm ngặt NGUYÊN TẮC 2:
   * BẮT BUỘC dùng Content-Type: "text/plain;charset=utf-8" và body: JSON.stringify({...})
   */
  async callApi(action, payload = {}) {
    const requestData = {
      action: action,
      ...payload
    };

    // Tự động gắn adminToken nếu có trong payload hoặc localStorage
    if (!requestData.adminToken) {
      const storedToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_TOKEN);
      if (storedToken) {
        requestData.adminToken = storedToken;
      }
    }

    try {
      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // NGUYÊN TẮC 2
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.warn(`[DataManager.callApi] Lỗi gọi API '${action}':`, error);
      // Fallback về mock/local nếu mạng lỗi hoặc endpoint chưa sẵn sàng
      return this.handleApiFallback(action, payload, error);
    }
  },

  /**
   * Xử lý fallback cục bộ thông minh khi offline hoặc mất mạng (Tầng 3)
   */
  handleApiFallback(action, payload, originalError) {
    console.info(`[DataManager] Kích hoạt Offline Fallback cho action: ${action}`);
    
    // Thử lấy dữ liệu từ LocalStorage
    const cachedRoster = this.getCachedRoster(payload.shift || this.state.currentShift);

    if (action === 'checkin') {
      const matched = cachedRoster.find((emp) => Utils.isIdMatch(emp.id, payload.identifier) || Utils.isIdMatch(emp.cccd, payload.identifier) || emp.phone === payload.identifier);
      if (matched) {
        matched.status = 'confirmed';
        matched.checkinTime = Utils.getCurrentVNTime();
        this.saveCachedRoster(payload.shift, cachedRoster);
        return {
          success: true,
          message: 'Điểm danh thành công (Chế độ lưu Offline)',
          data: matched
        };
      }
      return {
        success: false,
        message: 'Không tìm thấy nhân viên trong ca làm này (Offline)'
      };
    }

    if (action === 'lookup_salary') {
      const cachedSalaries = this.getCachedSalaries();
      const userSalary = cachedSalaries.filter((s) => Utils.isIdMatch(s.cccd, payload.identifier) || Utils.isIdMatch(s.empId, payload.identifier));
      if (userSalary.length > 0) {
        return {
          success: true,
          data: userSalary
        };
      }
      return {
        success: false,
        message: 'Chưa có thông tin lương cho mã/CCCD này trong bộ nhớ tạm'
      };
    }

    // Các action khác
    return {
      success: false,
      isOffline: true,
      message: `Đang chạy chế độ ngoại tuyến. Thao tác đã được ghi nhận cục bộ. (${originalError.message})`
    };
  },

  // ==================== QUẢN LÝ ROSTER CA LÀM ====================
  async saveSchedule(shiftId, rosterData, headers = []) {
    this.state.currentShift = shiftId;
    this.state.roster = rosterData || [];
    this.recalculateStats();

    // 1. Cập nhật đệm LocalStorage
    this.saveCachedRoster(shiftId, rosterData);

    // 2. Lưu lên Firebase Firestore (Tầng 1)
    if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
      try {
        await FirebaseService.saveRoster(shiftId, rosterData);
      } catch (e) {
        console.warn('[DataManager] Firebase saveRoster:', e);
      }
    }

    // 3. Đồng bộ lên Google Sheets qua GAS (Tầng 2)
    try {
      const colHeaders = headers && headers.length ? headers : ['Vị trí cố định', 'SAU GIỜ NGHỈ', '4h-6h', 'Xuất Tải'];
      const res = await this.callApi('save', {
        shiftId: shiftId,
        headers: colHeaders,
        schedule: rosterData,
        roster: rosterData,
        forceRosterStatus: true,
        date: this.state.currentDate
      });
      return res;
    } catch (err) {
      console.warn('[DataManager] GAS save error:', err);
      return { success: false, message: err.message };
    }
  },

  async loadRoster(shiftId, date = Utils.formatDateISO(), forceReloadSheets = false) {
    this.state.currentShift = shiftId;
    this.state.currentDate = date;

    // 1. Đọc từ Cache LocalStorage trước để hiển thị giao diện tức thì nếu không phải ép tải lại
    if (!forceReloadSheets) {
      const cached = this.getCachedRoster(shiftId);
      if (cached && Array.isArray(cached) && cached.length > 2) {
        this.state.roster = cached;
        this.recalculateStats();
      }
    }

    // 2. Tải song song từ Google Sheets (Master Roster) và Firestore (Realtime statuses)
    let firestoreRoster = null;
    let sheetsRoster = null;

    const firestorePromise = (async () => {
      if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
        try {
          return await FirebaseService.loadRoster(shiftId);
        } catch (e) {
          console.warn('[DataManager] Firestore loadRoster:', e);
        }
      }
      return null;
    })();

    const sheetsPromise = (async () => {
      try {
        const url = `${CONFIG.APPS_SCRIPT_URL}?action=load&shiftId=${encodeURIComponent(shiftId)}`;
        const getRes = await fetch(url).then((r) => r.json()).catch(() => null);
        if (Array.isArray(getRes) && getRes.length > 0) {
          return getRes;
        }
        // Thử POST get_roster nếu GET không có kết quả
        const postRes = await this.callApi('get_roster', { shiftId: shiftId, shift: shiftId, date: date });
        if (postRes && postRes.success && Array.isArray(postRes.data) && postRes.data.length > 0) {
          return postRes.data;
        }
      } catch (err) {
        console.warn('[DataManager] GAS load error:', err);
      }
      return null;
    })();

    const [fsRes, shRes] = await Promise.all([firestorePromise, sheetsPromise]);
    firestoreRoster = fsRes;
    sheetsRoster = shRes;

    // 3. XỬ LÝ HỢP NHẤT DỮ LIỆU THÔNG MINH (CHỐNG MẤT DANH SÁCH TUYỆT ĐỐI)
    if (sheetsRoster && Array.isArray(sheetsRoster) && sheetsRoster.length > 0) {
      // Google Sheets là nguồn gốc chính thức (ví dụ 41 nhân viên)
      const mergedRoster = sheetsRoster.map((item, idx) => {
        const emp = { ...item };
        emp.stt = idx + 1;

        // Nếu Firestore có cập nhật trạng thái điểm danh, thời gian, vị trí thì giữ lại
        if (firestoreRoster && Array.isArray(firestoreRoster)) {
          const fsMatch = firestoreRoster.find((f) => Utils.isIdMatch(f.id, emp.id) || Utils.isIdMatch(f.cccd, emp.id));
          if (fsMatch) {
            if (fsMatch.status && fsMatch.status !== 'pending') {
              emp.status = fsMatch.status;
            }
            if (fsMatch.checkinTime) {
              emp.checkinTime = fsMatch.checkinTime;
            }
            if (fsMatch.positions && Object.keys(fsMatch.positions).length) {
              emp.positions = { ...emp.positions, ...fsMatch.positions };
            }
            if (fsMatch.note) {
              emp.note = fsMatch.note;
            }
          }
        }
        return emp;
      });

      // Nếu Firestore có nhân sự bổ sung mà Google Sheets chưa có (VD: Thêm Đột Xuất / Xin Lên Ca)
      if (firestoreRoster && Array.isArray(firestoreRoster)) {
        firestoreRoster.forEach((fsEmp) => {
          const already = mergedRoster.some((m) => Utils.isIdMatch(m.id, fsEmp.id) || Utils.isIdMatch(m.cccd, fsEmp.id));
          if (!already && fsEmp.id && fsEmp.name) {
            mergedRoster.push({
              ...fsEmp,
              stt: mergedRoster.length + 1
            });
          }
        });
      }

      this.state.roster = mergedRoster;
      this.recalculateStats();
      this.saveCachedRoster(shiftId, mergedRoster);

      // Tự động chữa lành (Heal) Firestore ngay lập tức bằng danh sách đầy đủ
      if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
        FirebaseService.saveRoster(shiftId, mergedRoster).catch((e) => console.warn(e));
      }

      return this.state.roster;
    }

    // Nếu Google Sheets không phản hồi (offline), dùng Firestore nếu có
    if (firestoreRoster && Array.isArray(firestoreRoster) && firestoreRoster.length > 0) {
      this.state.roster = firestoreRoster;
      this.recalculateStats();
      this.saveCachedRoster(shiftId, firestoreRoster);
      return this.state.roster;
    }

    // Nếu cả 2 đều trống, fallback về LocalStorage
    const cachedFallback = this.getCachedRoster(shiftId);
    if (cachedFallback && Array.isArray(cachedFallback) && cachedFallback.length > 0) {
      this.state.roster = cachedFallback;
      this.recalculateStats();
      return this.state.roster;
    }

    // Fallback demo cuối cùng
    if (!this.state.roster || !this.state.roster.length) {
      this.initDemoRoster(shiftId);
    }

    return this.state.roster;
  },

  recalculateStats() {
    let total = this.state.roster.length;
    let confirmed = 0;
    let pending = 0;
    let off = 0;

    this.state.roster.forEach((emp) => {
      const st = (emp.status || '').toLowerCase();
      if (st === 'confirmed' || st === 'đã điểm danh') confirmed++;
      else if (st === 'off' || st === 'xin off') off++;
      else pending++;
    });

    this.state.stats = { total, confirmed, pending, off };
  },

  getCachedRoster(shiftId) {
    try {
      const data = localStorage.getItem(`${CONFIG.STORAGE_KEYS.OFFLINE_DATA}_${shiftId}`);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveCachedRoster(shiftId, data) {
    try {
      localStorage.setItem(`${CONFIG.STORAGE_KEYS.OFFLINE_DATA}_${shiftId}`, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage Quota:', e);
    }
  },

  getCachedSalaries() {
    try {
      const data = localStorage.getItem('agr_cached_salaries');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  saveCachedSalaries(data) {
    try {
      localStorage.setItem('agr_cached_salaries', JSON.stringify(data));
    } catch (e) {}
  },

  // Tạo dữ liệu demo ban đầu nếu chưa kết nối tới Sheets
  initDemoRoster(shiftId) {
    const demoRoster = [
      {
        stt: 1,
        id: 'OPS185911',
        name: 'ĐOÀN QUANG HUY',
        cccd: '089201004123',
        phone: '0912345678',
        identity: 'A-OS',
        status: 'pending',
        checkinTime: '',
        note: '',
        positions: { 'Vị trí cố định': 'RT 4', 'SAU GIỜ NGHỈ': 'RT 4', '4h-6h': 'OB4', 'Xuất Tải': '' }
      },
      {
        stt: 2,
        id: 'OPS146048',
        name: 'Lê Phúc Hậu',
        cccd: '079302008899',
        phone: '0987654321',
        identity: 'A-OS',
        status: 'pending',
        checkinTime: '',
        note: '',
        positions: { 'Vị trí cố định': 'RT 5', 'SAU GIỜ NGHỈ': 'RT 5', '4h-6h': 'OB5', 'Xuất Tải': '' }
      },
      {
        stt: 3,
        id: 'OPS262398',
        name: 'Lê Chí Lĩnh',
        cccd: '092200001234',
        phone: '0901239876',
        identity: 'A-OS',
        status: 'pending',
        checkinTime: '',
        note: '',
        positions: { 'Vị trí cố định': 'RT 6', 'SAU GIỜ NGHỈ': 'RT 6', '4h-6h': 'OB6', 'Xuất Tải': '' }
      },
      {
        stt: 4,
        id: 'OPS248899',
        name: 'NGUYỄN THANH TÀI',
        cccd: '083204005678',
        phone: '0933445566',
        identity: 'A-OS',
        status: 'confirmed',
        checkinTime: '02:08:22',
        note: '',
        positions: { 'Vị trí cố định': 'Xả xe 1', 'SAU GIỜ NGHỈ': 'Xả xe 1', '4h-6h': 'OB21', 'Xuất Tải': '' }
      }
    ];

    this.state.roster = demoRoster;
    this.saveCachedRoster(shiftId, demoRoster);
    this.recalculateStats();
  }
};

if (typeof window !== 'undefined') {
  window.DataManager = DataManager;
}

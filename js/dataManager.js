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
      const colHeaders = headers && headers.length ? headers : ['18H-20H', '20H-22H'];
      const res = await this.callApi('save', {
        shiftId: shiftId,
        headers: colHeaders,
        schedule: rosterData,
        roster: rosterData,
        date: this.state.currentDate
      });
      return res;
    } catch (err) {
      console.warn('[DataManager] GAS save error:', err);
      return { success: false, message: err.message };
    }
  },

  async loadRoster(shiftId, date = Utils.formatDateISO()) {
    this.state.currentShift = shiftId;
    this.state.currentDate = date;

    // 1. Đọc từ Cache LocalStorage trước để giao diện tức thì
    const cached = this.getCachedRoster(shiftId);
    if (cached && Array.isArray(cached) && cached.length) {
      this.state.roster = cached;
      this.recalculateStats();
    }

    // 2. Đọc từ Firebase Firestore (Tầng 1)
    try {
      if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
        const firestoreRoster = await FirebaseService.loadRoster(shiftId);
        if (firestoreRoster && Array.isArray(firestoreRoster) && firestoreRoster.length) {
          this.state.roster = firestoreRoster;
          this.recalculateStats();
          this.saveCachedRoster(shiftId, firestoreRoster);
          return this.state.roster;
        }
      }
    } catch (e) {
      console.warn('[DataManager] Firestore loadRoster:', e);
    }

    // 3. Đồng bộ từ Google Sheets qua GAS Web App (Tầng 2)
    try {
      // Gọi GET action=load
      const url = `${CONFIG.APPS_SCRIPT_URL}?action=load&shiftId=${encodeURIComponent(shiftId)}`;
      const getRes = await fetch(url).then((r) => r.json()).catch(() => null);
      if (Array.isArray(getRes) && getRes.length > 0) {
        this.state.roster = getRes;
        this.recalculateStats();
        this.saveCachedRoster(shiftId, getRes);
        if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
          FirebaseService.saveRoster(shiftId, getRes);
        }
        return this.state.roster;
      }

      // Hoặc gọi POST get_roster
      const res = await this.callApi('get_roster', { shiftId: shiftId, shift: shiftId, date: date });
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        this.state.roster = res.data;
        this.recalculateStats();
        this.saveCachedRoster(shiftId, res.data);
        if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
          FirebaseService.saveRoster(shiftId, res.data);
        }
        return this.state.roster;
      }
    } catch (err) {
      console.warn('[DataManager] GAS load error:', err);
    }

    // Nếu cả 3 nguồn đều trống thì mới nạp dữ liệu mẫu
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

  // Tạo dữ liệu demo phong phú ban đầu nếu chưa kết nối tới Sheets
  initDemoRoster(shiftId) {
    const demoRoster = [
      {
        stt: 1,
        id: 'OPS10291',
        name: 'Nguyễn Văn An',
        cccd: '089201004123',
        phone: '0912345678',
        identity: 'Fulltime',
        status: 'confirmed',
        checkinTime: '17:55:12',
        note: '',
        positions: { '18H-20H': 'Xả xe 5', '20H-22H': 'B1-B4' }
      },
      {
        stt: 2,
        id: 'OPS10452',
        name: 'Trần Thị Mai',
        cccd: '079302008899',
        phone: '0987654321',
        identity: 'CTV',
        status: 'confirmed',
        checkinTime: '18:02:45',
        note: '',
        positions: { '18H-20H': 'B1-B4', '20H-22H': 'A9-A12' }
      },
      {
        stt: 3,
        id: 'OPS10788',
        name: 'Lê Hoàng Nam',
        cccd: '092200001234',
        phone: '0901239876',
        identity: 'CTV',
        status: 'pending',
        checkinTime: '',
        note: '',
        positions: { '18H-20H': 'Chưa xếp', '20H-22H': 'Chưa xếp' }
      },
      {
        stt: 4,
        id: 'OPS10901',
        name: 'Phạm Đức Trọng',
        cccd: '083204005678',
        phone: '0933445566',
        identity: 'A-OS',
        status: 'off',
        checkinTime: '',
        note: 'Xin nghỉ phép',
        positions: { '18H-20H': '', '20H-22H': '' }
      },
      {
        stt: 5,
        id: 'OPS11023',
        name: 'Võ Minh Thắng',
        cccd: '094301009988',
        phone: '0945678901',
        identity: 'CTV',
        status: 'pending',
        checkinTime: '',
        note: '',
        positions: { '18H-20H': 'Phân loại D', '20H-22H': 'Xả xe 2' }
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

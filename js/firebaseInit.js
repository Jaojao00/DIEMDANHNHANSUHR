// KHỞI TẠO FIREBASE SDK & REALTIME LISTENER (TẦNG 1: REALTIME LAYER)
const FirebaseService = {
  db: null,
  isInitialized: false,
  listeners: [],

  init() {
    try {
      if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        if (!firebase.apps.length) {
          firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
        }
        this.db = firebase.firestore();
        
        // Hỗ trợ multi-tab persistence
        this.db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
          if (err.code === 'failed-precondition') {
            console.warn('[Firebase] Multiple tabs open, persistence enabled in first tab only');
          } else if (err.code === 'unimplemented') {
            console.warn('[Firebase] Current browser does not support persistence');
          }
        });

        this.isInitialized = true;
        console.log('[Firebase] Realtime Firestore initialized successfully');
      } else {
        console.info('[Firebase] SDK not loaded or offline fallback mode');
      }
    } catch (e) {
      console.warn('[Firebase] Init fallback:', e.message);
      this.isInitialized = false;
    }
  },

  /**
   * Chuẩn hóa ShiftId an toàn cho Document Reference của Firestore (Tránh lỗi 1 segment)
   */
  cleanShift(shiftId) {
    if (!shiftId) return 'shift_default';
    const cleaned = String(shiftId).trim().replace(/:/g, '').replace(/-/g, '_');
    return cleaned || 'shift_default';
  },

  /**
   * Lắng nghe cập nhật điểm danh thời gian thực theo Ca làm việc
   */
  listenToShiftCheckins(shiftId, callback) {
    if (!this.isInitialized || !this.db) {
      return null;
    }

    try {
      const today = Utils.formatDateISO();
      const cleanId = this.cleanShift(shiftId);
      const docPath = `shifts/${today}_${cleanId}`;
      
      const unsubscribe = this.db.doc(docPath).onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          callback(data);
        }
      }, (err) => {
        console.warn('[Firebase] Snapshot error:', err);
      });

      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (err) {
      console.warn('[Firebase] listen error:', err);
      return null;
    }
  },

  /**
   * Ghi nhận điểm danh tức thì lên Firestore (< 100ms)
   */
  async recordCheckinRealtime(shiftId, employee) {
    if (!this.isInitialized || !this.db || !employee) return false;

    try {
      const today = Utils.formatDateISO();
      const cleanId = this.cleanShift(shiftId);
      const docRef = this.db.doc(`shifts/${today}_${cleanId}`);
      
      await docRef.set({
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        employees: firebase.firestore.FieldValue.arrayUnion({
          id: employee.id || employee.empId || '',
          name: employee.name || '',
          timestamp: Utils.getCurrentVNTime(),
          status: 'confirmed'
        })
      }, { merge: true });

      return true;
    } catch (err) {
      console.warn('[Firebase] Record checkin failed:', err);
      return false;
    }
  },

  /**
   * Cập nhật trạng thái điểm danh thủ công từ Admin lên Firestore
   */
  async logCheckin(shiftId, empId, empName, isConfirmed) {
    if (!this.isInitialized || !this.db) return false;
    try {
      const today = Utils.formatDateISO();
      const cleanId = this.cleanShift(shiftId);
      const docRef = this.db.doc(`shifts/${today}_${cleanId}`);
      await docRef.set({
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        employees: firebase.firestore.FieldValue.arrayUnion({
          id: empId,
          name: empName,
          timestamp: Utils.getCurrentVNTime(),
          status: isConfirmed ? 'confirmed' : 'pending'
        })
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn('[Firebase] logCheckin error:', e);
      return false;
    }
  },

  /**
   * Lưu toàn bộ Roster lên Firestore để đồng bộ giữa các máy Admin và Nhân viên
   */
  async saveRoster(shiftId, rosterData) {
    if (!this.isInitialized || !this.db) return false;
    try {
      const today = Utils.formatDateISO();
      const cleanId = this.cleanShift(shiftId);
      const payload = {
        date: today,
        shiftId: shiftId || 'shift_default',
        employees: rosterData || [],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await Promise.all([
        this.db.doc(`rosters/${today}_${cleanId}`).set(payload, { merge: true }),
        this.db.doc(`rosters/${cleanId}`).set(payload, { merge: true })
      ]);
      return true;
    } catch (e) {
      console.warn('[Firebase] saveRoster error:', e);
      return false;
    }
  },

  /**
   * Đọc Roster trực tiếp từ Firestore nếu có
   */
  async loadRoster(shiftId) {
    if (!this.isInitialized || !this.db) return null;
    try {
      const today = Utils.formatDateISO();
      const cleanId = this.cleanShift(shiftId);
      
      let snap = await this.db.doc(`rosters/${today}_${cleanId}`).get();
      if (snap.exists) {
        const data = snap.data();
        if (Array.isArray(data.employees) && data.employees.length > 0) {
          return data.employees;
        }
      }

      snap = await this.db.doc(`rosters/${cleanId}`).get();
      if (snap.exists) {
        const data = snap.data();
        if (Array.isArray(data.employees) && data.employees.length > 0) {
          return data.employees;
        }
      }
      return null;
    } catch (e) {
      console.warn('[Firebase] loadRoster error:', e);
      return null;
    }
  },

  /**
   * Hủy tất cả listeners khi chuyển ca
   */
  clearListeners() {
    this.listeners.forEach((unsub) => {
      if (typeof unsub === 'function') unsub();
    });
    this.listeners = [];
  }
};

if (typeof window !== 'undefined') {
  window.FirebaseService = FirebaseService;
}

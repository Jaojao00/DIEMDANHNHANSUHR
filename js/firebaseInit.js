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
   * Lắng nghe cập nhật điểm danh thời gian thực theo Ca làm việc
   */
  listenToShiftCheckins(shiftId, callback) {
    if (!this.isInitialized || !this.db) {
      return null;
    }

    try {
      const today = Utils.formatDateISO();
      const docPath = `shifts/${today}_${shiftId}`;
      
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
    if (!this.isInitialized || !this.db) return false;

    try {
      const today = Utils.formatDateISO();
      const docRef = this.db.doc(`shifts/${today}_${shiftId}`);
      
      await docRef.set({
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        employees: firebase.firestore.FieldValue.arrayUnion({
          id: employee.id,
          name: employee.name,
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

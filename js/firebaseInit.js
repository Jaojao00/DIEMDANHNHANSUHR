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
   * Lưu cấu hình chu kỳ đăng ký lịch lên Firestore để đồng bộ tức thì cho tất cả máy nhân viên
   */
  async saveRegistrationConfig(dateFrom, dateTo) {
    if (!this.isInitialized || !this.db) return false;
    try {
      await this.db.doc('settings/registration_cycle').set({
        dateFrom: dateFrom,
        dateTo: dateTo,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('[Firebase] Đã lưu cấu hình chu kỳ lên Firestore:', dateFrom, dateTo);
      return true;
    } catch (e) {
      console.warn('[Firebase] saveRegistrationConfig error:', e);
      return false;
    }
  },

  /**
   * Lắng nghe thời gian thực cấu hình chu kỳ đăng ký lịch
   */
  listenToRegistrationConfig(callback) {
    if (!this.isInitialized || !this.db) return null;
    try {
      const unsubscribe = this.db.doc('settings/registration_cycle').onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          if (data && data.dateFrom && data.dateTo) {
            callback(data);
          }
        }
      }, (err) => {
        console.warn('[Firebase] listenToRegistrationConfig snapshot error:', err);
      });
      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[Firebase] listenToRegistrationConfig error:', e);
      return null;
    }
  },

  /**
   * Tải cấu hình chu kỳ từ Firestore một lần
   */
  async getRegistrationConfig() {
    if (!this.isInitialized || !this.db) return null;
    try {
      const snap = await this.db.doc('settings/registration_cycle').get();
      if (snap.exists) {
        const data = snap.data();
        if (data && data.dateFrom && data.dateTo) {
          return data;
        }
      }
      return null;
    } catch (e) {
      console.warn('[Firebase] getRegistrationConfig error:', e);
      return null;
    }
  },
  
  /**
   * Hủy tất cả listeners khi chuyển ca
   */

  // ============================================================
  // PHÂN HỆ THÔNG BÁO & BÌNH CHỌN (ANNOUNCEMENTS & POLLS)
  // ============================================================

  /**
   * Lắng nghe danh sách thông báo & bình chọn thời gian thực
   */
  listenToAnnouncements(callback) {
    if (!this.isInitialized || !this.db) return null;
    try {
      const unsubscribe = this.db.collection('announcements')
        .onSnapshot((snapshot) => {
          const items = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({ id: doc.id, ...data });
          });
          // Sắp xếp: Ghim (pinned) lên đầu, sau đó theo createdAt giảm dần
          items.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
            const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
            return timeB - timeA;
          });
          callback(items);
        }, (err) => {
          console.warn('[Firebase] listenToAnnouncements error:', err);
        });
      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[Firebase] listenToAnnouncements error:', e);
      return null;
    }
  },

  /**
   * Lưu (Tạo mới hoặc Cập nhật) Thông Báo / Bình Chọn
   */
  async saveAnnouncement(data) {
    if (!this.isInitialized || !this.db) return false;
    try {
      const id = data.id || ('ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));
      const docRef = this.db.collection('announcements').doc(id);

      const payload = {
        title: data.title || '',
        content: data.content || '',
        type: data.type || 'announcement', // 'announcement' | 'poll'
        pinned: !!data.pinned,
        status: data.status || 'active', // 'active' | 'closed'
        allowComments: data.allowComments !== false,
        imageUrl: data.imageUrl || '',
        author: data.author || 'Phòng Nhân Sự',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!data.id) {
        // Tạo mới
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        payload.reads = [];
        payload.commentCount = 0;
        if (data.type === 'poll') {
          payload.pollType = data.pollType || 'single'; // 'single' | 'multiple'
          payload.maxChoices = data.maxChoices || 1;
          payload.showResults = data.showResults || 'always'; // 'always' | 'after_vote' | 'hidden'
          payload.options = data.options || [];
          payload.votes = {}; // { [empId]: { optionIds: ['opt_1'], empName: '...', votedAt: ... } }
        }
        await docRef.set(payload);
      } else {
        // Cập nhật
        if (data.type === 'poll' && data.options) {
          payload.options = data.options;
          payload.pollType = data.pollType || 'single';
          payload.maxChoices = data.maxChoices || 1;
          payload.showResults = data.showResults || 'always';
        }
        await docRef.set(payload, { merge: true });
      }

      return id;
    } catch (e) {
      console.error('[Firebase] saveAnnouncement error:', e);
      return false;
    }
  },

  /**
   * Xóa Thông Báo / Bình Chọn
   */
  async deleteAnnouncement(announcementId) {
    if (!this.isInitialized || !this.db || !announcementId) return false;
    try {
      await this.db.collection('announcements').doc(announcementId).delete();
      return true;
    } catch (e) {
      console.error('[Firebase] deleteAnnouncement error:', e);
      return false;
    }
  },

  /**
   * Đổi trạng thái Ghim bài
   */
  async togglePinAnnouncement(announcementId, isPinned) {
    if (!this.isInitialized || !this.db || !announcementId) return false;
    try {
      await this.db.collection('announcements').doc(announcementId).update({
        pinned: !isPinned,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error('[Firebase] togglePinAnnouncement error:', e);
      return false;
    }
  },

  /**
   * Đổi trạng thái Đóng / Mở lại Bình Chọn
   */
  async toggleCloseAnnouncement(announcementId, isClosed) {
    if (!this.isInitialized || !this.db || !announcementId) return false;
    try {
      await this.db.collection('announcements').doc(announcementId).update({
        status: isClosed ? 'active' : 'closed',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error('[Firebase] toggleCloseAnnouncement error:', e);
      return false;
    }
  },

  /**
   * Ghi nhận bình chọn (Vote) của nhân viên
   */
  async submitVote(announcementId, empId, empName, optionIds) {
    if (!this.isInitialized || !this.db || !announcementId || !empId || !optionIds || !optionIds.length) return false;
    try {
      const docRef = this.db.collection('announcements').doc(announcementId);
      
      return await this.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        if (!doc.exists) throw new Error('Bài bình chọn không tồn tại');
        const data = doc.data();

        if (data.status === 'closed') {
          throw new Error('Bình chọn này đã kết thúc');
        }

        const votes = data.votes || {};
        const options = (data.options || []).map(opt => ({ ...opt }));

        // Kiểm tra xem nhân viên này đã vote trước đó chưa
        const prevVote = votes[empId];
        if (prevVote && prevVote.optionIds) {
          // Trừ phiếu cũ
          prevVote.optionIds.forEach(prevOptId => {
            const opt = options.find(o => o.id === prevOptId);
            if (opt && opt.count > 0) opt.count--;
          });
        }

        // Cộng phiếu mới
        optionIds.forEach(newOptId => {
          const opt = options.find(o => o.id === newOptId);
          if (opt) {
            opt.count = (opt.count || 0) + 1;
          }
        });

        // Ghi lại vote của user
        votes[empId] = {
          empId: empId,
          empName: empName || 'Nhân viên',
          optionIds: optionIds,
          votedAt: new Date().toISOString()
        };

        transaction.update(docRef, {
          votes: votes,
          options: options,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        return true;
      });
    } catch (e) {
      console.error('[Firebase] submitVote error:', e);
      throw e;
    }
  },

  /**
   * Đánh dấu nhân viên đã đọc bài viết
   */
  async markAnnouncementRead(announcementId, empId) {
    if (!this.isInitialized || !this.db || !announcementId || !empId) return false;
    try {
      const docRef = this.db.collection('announcements').doc(announcementId);
      await docRef.update({
        reads: firebase.firestore.FieldValue.arrayUnion(empId)
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Lắng nghe bình luận của một bài viết theo thời gian thực
   */
  listenToComments(announcementId, callback) {
    if (!this.isInitialized || !this.db || !announcementId) return null;
    try {
      const unsubscribe = this.db.collection('announcements').doc(announcementId)
        .collection('comments')
        .onSnapshot((snapshot) => {
          const comments = [];
          snapshot.forEach((doc) => {
            comments.push({ id: doc.id, ...doc.data() });
          });
          comments.sort((a, b) => {
            const timeA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
            const timeB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
            return timeA - timeB;
          });
          callback(comments);
        }, (err) => {
          console.warn('[Firebase] listenToComments error:', err);
        });
      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (e) {
      console.warn('[Firebase] listenToComments error:', e);
      return null;
    }
  },

  /**
   * Thêm bình luận mới (Có hỗ trợ tùy chọn Ẩn danh)
   */
  async addComment(announcementId, commentData) {
    if (!this.isInitialized || !this.db || !announcementId || !commentData.content) return false;
    try {
      const commentsCol = this.db.collection('announcements').doc(announcementId).collection('comments');
      await commentsCol.add({
        empId: commentData.empId || '',
        empName: commentData.empName || 'Nhân sự',
        isAnonymous: !!commentData.isAnonymous,
        content: commentData.content.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'active'
      });

      // Tăng commentCount trên bài viết
      const docRef = this.db.collection('announcements').doc(announcementId);
      await docRef.update({
        commentCount: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return true;
    } catch (e) {
      console.error('[Firebase] addComment error:', e);
      return false;
    }
  },

  /**
   * Xóa một bình luận (Admin moderation)
   */
  async deleteComment(announcementId, commentId) {
    if (!this.isInitialized || !this.db || !announcementId || !commentId) return false;
    try {
      await this.db.collection('announcements').doc(announcementId).collection('comments').doc(commentId).delete();
      const docRef = this.db.collection('announcements').doc(announcementId);
      await docRef.update({
        commentCount: firebase.firestore.FieldValue.increment(-1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error('[Firebase] deleteComment error:', e);
      return false;
    }
  },

  /**
   * Tự động khởi tạo dữ liệu mẫu nếu Firestore chưa có bài viết nào
   */
  async seedInitialAnnouncementsIfEmpty() {
    if (!this.isInitialized || !this.db) return;
    try {
      const snap = await this.db.collection('announcements').limit(1).get();
      if (snap.empty) {
        console.log('[Firebase] Seeding initial announcement...');
        // Bài thông báo mẫu
        await this.saveAnnouncement({
          title: '📢 Chào Mừng Đến Với Hệ Thống AGARI HR - SPX Partner',
          content: 'Kính gửi toàn thể Anh/Chị/Em nhân sự kho SW SOC,\n\nHệ thống AGARI HR chính thức đưa vào vận hành phân hệ "Thông Báo & Bình Chọn". Tại đây, Ban Quản trị sẽ cập nhật kịp thời các thông tin ca trực, chế độ phúc lợi, chính sách mới và lắng nghe mọi ý kiến đóng góp từ nhân viên.\n\nNhân viên có thể tương tác bình luận công khai hoặc ẩn danh để chia sẻ ý kiến một cách thoải mái nhất!',
          type: 'announcement',
          pinned: true,
          status: 'active',
          allowComments: true,
          author: 'Ban Quản Trị AGARI HR'
        });
      }
    } catch (e) {
      console.warn('[Firebase] seedInitialAnnouncements error:', e);
    }
  },

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

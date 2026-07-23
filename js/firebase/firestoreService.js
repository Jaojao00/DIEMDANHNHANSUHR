/**
 * AGR - Firestore Service
 * Module trung tâm quản lý tất cả tương tác với Firestore.
 * Thay thế toàn bộ fetch() calls đến Google Apps Script.
 *
 * Sử dụng: window.FirestoreService.<method>()
 */

const FirestoreService = {
  // =============================================
  // HELPER - Kiểm tra Firebase sẵn sàng
  // =============================================
  _getDB() {
    const db = window.FirebaseDB?.db;
    if (!db) {
      throw new Error("Firebase chưa được khởi tạo. Kiểm tra firebaseInit.js");
    }
    return db;
  },

  _getFirebase() {
    const fb = window.FirebaseDB;
    if (!fb || !fb.db) {
      throw new Error("Firebase chưa được khởi tạo");
    }
    return fb;
  },

  // =============================================
  // CONFIG — Thay thế get_reg_config / save_reg_config
  // =============================================

  /**
   * Đọc cấu hình đăng ký (ngày bắt đầu / kết thúc)
   * @returns {{ regDateFrom: string, regDateTo: string } | null}
   */
  async getConfig() {
    try {
      const fb = this._getFirebase();
      const docRef = fb.doc(fb.db, "config", "admin");
      const snap = await fb.getDoc(docRef);
      if (snap.exists) {
        const data = snap.data();
        return {
          regDateFrom: data.regDateFrom || "",
          regDateTo: data.regDateTo || "",
        };
      }
      return null;
    } catch (err) {
      console.error("FirestoreService.getConfig error:", err);
      return null;
    }
  },

  /**
   * Lưu cấu hình đăng ký
   */
  async saveConfig(regDateFrom, regDateTo) {
    try {
      const fb = this._getFirebase();
      const docRef = fb.doc(fb.db, "config", "admin");
      await fb.setDoc(docRef, { regDateFrom, regDateTo }, { merge: true });
      return { success: true };
    } catch (err) {
      console.error("FirestoreService.saveConfig error:", err);
      return { success: false, error: err.message };
    }
  },

  // =============================================
  // REGISTRATIONS — Thay thế submit_registration / get_registration
  // =============================================

  /**
   * Đăng ký lịch làm việc
   * @param {Object} payload - { empId, empName, empPhone, osGender, shiftId, shiftLabel, selections, period, timestamp }
   */
  async submitRegistration(payload) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      const regRef = fb.collection(db, "registrations");

      // Chuẩn hóa empId
      const normalizedEmpId = (payload.empId || "").trim().toUpperCase();

      // Kiểm tra trùng lặp
      const q = fb.query(
        regRef,
        fb.where("empId", "==", normalizedEmpId),
        fb.where("period", "==", payload.period),
        fb.where("shiftId", "==", payload.shiftId)
      );
      const existing = await fb.getDocs(q);
      if (!existing.empty) {
        return {
          success: false,
          error: `Bạn đã đăng ký ca ${payload.shiftLabel || payload.shiftId} trong kỳ ${payload.period} rồi!`,
        };
      }

      // Lưu đăng ký mới
      const docData = {
        ...payload,
        empId: normalizedEmpId,
        timestamp: new Date().toISOString(),
        syncedToSheets: false,
        createdAt: fb.serverTimestamp(),
      };

      const docRef = await fb.addDoc(regRef, docData);

      // Lưu vào localStorage làm backup offline
      try {
        localStorage.setItem(
          `agr_reg_${normalizedEmpId}`,
          JSON.stringify({
            empId: normalizedEmpId,
            period: payload.period,
            shiftId: payload.shiftId,
            shiftLabel: payload.shiftLabel,
            selections: payload.selections,
            timestamp: docData.timestamp,
          })
        );
      } catch (e) { /* localStorage full, ignore */ }

      return {
        success: true,
        message: "Đăng ký thành công!",
        docId: docRef.id,
      };
    } catch (err) {
      console.error("FirestoreService.submitRegistration error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Lấy lịch đăng ký của nhân viên theo empId
   * @param {string} empId
   * @returns {{ periods: Array }}
   */
  async getRegistrations(empId) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      const normalizedEmpId = (empId || "").trim().toUpperCase();

      const q = fb.query(
        fb.collection(db, "registrations"),
        fb.where("empId", "==", normalizedEmpId)
      );
      const snapshot = await fb.getDocs(q);

      if (snapshot.empty) {
        return { periods: [] };
      }

      const periods = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Tạo headers từ selections
        const headers = [
          "Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT",
          "Giới tính OS", "Ca", "Tên Ca",
        ];
        const dateHeaders = (data.selections || []).map(
          (s) => s.label || s.date
        );
        headers.push(...dateHeaders);

        // Tạo data row
        const row = [
          data.timestamp || "",
          data.empId || "",
          data.empName || "",
          data.empPhone || "",
          data.osGender || "",
          data.shiftId || "",
          data.shiftLabel || "",
        ];
        (data.selections || []).forEach((s) => {
          row.push(s.choice || "OFF");
        });

        periods.push({
          id: doc.id,
          name: `${data.shiftLabel || data.shiftId} (${data.period || ""})`,
          headers: headers,
          data: [row],
        });
      });

      return { periods };
    } catch (err) {
      console.error("FirestoreService.getRegistrations error:", err);
      return { periods: [] };
    }
  },

  /**
   * Lấy tất cả đăng ký theo shiftId (Admin)
   * @param {string} shiftId
   */
  async getShiftRegistrations(shiftId) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      const q = fb.query(
        fb.collection(db, "registrations"),
        fb.where("shiftId", "==", shiftId)
      );
      const snapshot = await fb.getDocs(q);

      if (snapshot.empty) {
        return { periods: [] };
      }

      // Gom theo period
      const periodMap = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const key = data.period || "unknown";
        if (!periodMap[key]) {
          const dateHeaders = (data.selections || []).map((s) => s.label || s.date);
          periodMap[key] = {
            name: `${data.shiftLabel || data.shiftId} (${key})`,
            headers: [
              "Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT",
              "Giới tính OS", "Ca", "Tên Ca", ...dateHeaders,
            ],
            data: [],
          };
        }
        const row = [
          data.timestamp || "",
          data.empId || "",
          data.empName || "",
          data.empPhone || "",
          data.osGender || "",
          data.shiftId || "",
          data.shiftLabel || "",
        ];
        (data.selections || []).forEach((s) => {
          row.push(s.choice || "OFF");
        });
        periodMap[key].data.push(row);
      });

      return { periods: Object.values(periodMap) };
    } catch (err) {
      console.error("FirestoreService.getShiftRegistrations error:", err);
      return { periods: [] };
    }
  },

  /**
   * Xóa tất cả đăng ký (Admin reset)
   */
  async resetRegistrations() {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      const snapshot = await fb.getDocs(fb.collection(db, "registrations"));

      if (snapshot.empty) return { success: true, message: "Không có dữ liệu để xóa" };

      // Batch delete (tối đa 500 docs mỗi batch)
      const batchSize = 500;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = fb.writeBatch();
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }

      return { success: true, message: `Đã xóa ${docs.length} đăng ký` };
    } catch (err) {
      console.error("FirestoreService.resetRegistrations error:", err);
      return { success: false, error: err.message };
    }
  },

  // =============================================
  // CHECK-IN / ATTENDANCE — Thay thế checkin
  // =============================================

  /**
   * Điểm danh nhân viên
   */
  async checkin(shiftId, empId, phone) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      const checkinData = {
        empId: (empId || "").trim().toUpperCase(),
        shiftId: shiftId,
        status: "confirmed",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour12: false }),
        phone: phone || "",
        serverTimestamp: Date.now(),
        date: new Date().toISOString().split("T")[0],
      };

      await fb.addDoc(fb.collection(db, "checkins"), checkinData);

      return { success: true, data: checkinData };
    } catch (err) {
      console.error("FirestoreService.checkin error:", err);
      return { success: false, error: err.message };
    }
  },

  // =============================================
  // REQUESTS — Thay thế request / load_requests
  // =============================================

  /**
   * Gửi yêu cầu nghỉ / thế ca
   */
  async submitRequest(payload) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      const requestData = {
        empId: (payload.empId || "").trim().toUpperCase(),
        empName: payload.name || payload.empName || "",
        phone: payload.phone || "",
        type: payload.type || "XIN OFF",
        date: payload.date || "",
        reason: payload.reason || "",
        note: payload.note || "",
        targetShift: payload.targetShift || "",
        shiftId: payload.shiftId || "",
        status: "pending",
        timestamp: new Date().toISOString(),
        createdAt: fb.serverTimestamp(),
      };

      await fb.addDoc(fb.collection(db, "requests"), requestData);
      return { success: true };
    } catch (err) {
      console.error("FirestoreService.submitRequest error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Lấy danh sách yêu cầu nghỉ / thế ca
   */
  async loadRequests() {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      const snapshot = await fb.getDocs(fb.collection(db, "requests"));
      const requests = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        requests.push({
          id: doc.id,
          timestamp: d.timestamp || "",
          empId: d.empId || "",
          empName: d.empName || "",
          phone: d.phone || "",
          type: d.type || "",
          reason: d.reason || "",
          date: d.date || "",
          note: d.note || "",
          targetShift: d.targetShift || "",
          status: d.status || "pending",
        });
      });

      return { success: true, requests };
    } catch (err) {
      console.error("FirestoreService.loadRequests error:", err);
      return { success: false, requests: [] };
    }
  },

  // =============================================
  // CHANGE REQUESTS — Thay thế submit/get/approve/reject change_request
  // =============================================

  async submitChangeRequest(payload) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      const reqId = `CR_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const crData = {
        reqId: reqId,
        empId: (payload.empId || "").trim().toUpperCase(),
        empName: payload.empName || "",
        shiftId: payload.shiftId || "",
        shiftLabel: payload.shiftLabel || "",
        period: payload.period || "",
        oldSelections: payload.oldSelections || [],
        selections: payload.selections || [],
        status: "pending",
        timestamp: new Date().toISOString(),
        createdAt: fb.serverTimestamp(),
      };

      await fb.addDoc(fb.collection(db, "change_requests"), crData);
      return { success: true, reqId };
    } catch (err) {
      console.error("FirestoreService.submitChangeRequest error:", err);
      return { success: false, error: err.message };
    }
  },

  async getChangeRequests() {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      const q = fb.query(
        fb.collection(db, "change_requests"),
        fb.where("status", "==", "pending")
      );
      const snapshot = await fb.getDocs(q);
      const requests = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() });
      });

      return { success: true, requests };
    } catch (err) {
      console.error("FirestoreService.getChangeRequests error:", err);
      return { success: false, requests: [] };
    }
  },

  async approveChangeRequest(reqDocId, empId, shiftId, newSelections) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;

      // 1. Cập nhật status change_request
      const crRef = fb.doc(db, "change_requests", reqDocId);
      await fb.updateDoc(crRef, {
        status: "approved",
        approvedAt: new Date().toISOString(),
      });

      // 2. Cập nhật đăng ký gốc nếu có
      const normalizedEmpId = (empId || "").trim().toUpperCase();
      const regQuery = fb.query(
        fb.collection(db, "registrations"),
        fb.where("empId", "==", normalizedEmpId),
        fb.where("shiftId", "==", shiftId)
      );
      const regSnap = await fb.getDocs(regQuery);
      if (!regSnap.empty) {
        const regDoc = regSnap.docs[0];
        await fb.updateDoc(regDoc.ref, {
          selections: newSelections,
          lastModified: new Date().toISOString(),
        });
      }

      return { success: true };
    } catch (err) {
      console.error("FirestoreService.approveChangeRequest error:", err);
      return { success: false, error: err.message };
    }
  },

  async rejectChangeRequest(reqDocId) {
    try {
      const fb = this._getFirebase();
      const crRef = fb.doc(fb.db, "change_requests", reqDocId);
      await fb.updateDoc(crRef, {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (err) {
      console.error("FirestoreService.rejectChangeRequest error:", err);
      return { success: false, error: err.message };
    }
  },

  // =============================================
  // ROSTERS — Thay thế load / save (Ca_<shiftId>)
  // =============================================

  /**
   * Lưu roster hàng ngày
   */
  async saveRoster(shiftId, data, headers) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      const today = new Date().toISOString().split("T")[0];
      const docId = `${today}_${shiftId}`;

      const rosterData = {
        date: today,
        shiftId: shiftId,
        headers: headers || [],
        employees: data || [],
        updatedAt: new Date().toISOString(),
      };

      const rosterRef = fb.doc(db, "rosters", docId);
      await fb.setDoc(rosterRef, rosterData, { merge: true });

      return { success: true };
    } catch (err) {
      console.error("FirestoreService.saveRoster error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Đọc roster hàng ngày
   */
  async loadRoster(shiftId) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      const today = new Date().toISOString().split("T")[0];
      const docId = `${today}_${shiftId}`;

      const rosterRef = fb.doc(db, "rosters", docId);
      const snap = await fb.getDoc(rosterRef);

      if (snap.exists) {
        const data = snap.data();
        return {
          success: true,
          headers: data.headers || [],
          schedule: data.employees || [],
        };
      }
      return { success: true, headers: [], schedule: [] };
    } catch (err) {
      console.error("FirestoreService.loadRoster error:", err);
      return { success: false, headers: [], schedule: [] };
    }
  },

  // =============================================
  // ADMIN LOGS
  // =============================================

  async addAdminLog(action, details, adminEmail) {
    try {
      const fb = this._getFirebase();
      await fb.addDoc(fb.collection(fb.db, "admin_logs"), {
        adminEmail: adminEmail || localStorage.getItem("admin_email") || "unknown",
        action: action,
        details: details,
        timestamp: new Date().toISOString(),
        createdAt: fb.serverTimestamp(),
      });
    } catch (err) {
      console.error("FirestoreService.addAdminLog error:", err);
    }
  },

  async getAdminLogs(limit = 100) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      // Firestore compat: just get all and slice
      const snapshot = await fb.getDocs(fb.collection(db, "admin_logs"));
      const logs = [];
      snapshot.forEach((doc) => {
        logs.push({ id: doc.id, ...doc.data() });
      });
      // Sort by timestamp descending, take latest
      logs.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
      return { success: true, logs: logs.slice(0, limit) };
    } catch (err) {
      console.error("FirestoreService.getAdminLogs error:", err);
      return { success: false, logs: [] };
    }
  },

  // =============================================
  // REAL-TIME LISTENERS
  // =============================================

  /**
   * Lắng nghe thay đổi checkin realtime (cho Admin dashboard)
   * @returns {Function} unsubscribe function
   */
  onCheckinChange(shiftId, callback) {
    try {
      const fb = this._getFirebase();
      const db = fb.db;
      const startTime = Date.now() - 5000;

      const q = fb.query(
        fb.collection(db, "checkins"),
        fb.where("serverTimestamp", ">=", startTime)
      );

      return fb.onSnapshot(q, (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data();
            if (!shiftId || data.shiftId === shiftId) {
              callback(data);
            }
          }
        });
      });
    } catch (err) {
      console.error("FirestoreService.onCheckinChange error:", err);
      return () => {};
    }
  },

  /**
   * Lắng nghe thay đổi config (cho Employee registration screen)
   */
  onConfigChange(callback) {
    try {
      const fb = this._getFirebase();
      const docRef = fb.doc(fb.db, "config", "admin");
      return fb.onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists) {
          callback(snapshot.data());
        }
      });
    } catch (err) {
      console.error("FirestoreService.onConfigChange error:", err);
      return () => {};
    }
  },
};

// Export globally
window.FirestoreService = FirestoreService;

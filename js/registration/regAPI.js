// js/registration/regAPI.js
/**
 * API and Firebase interaction logic
 */

const RegAPI = {
  getApiLink() {
    return localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
  },

  async loadConfig() {
    try {
      const apiLink = this.getApiLink();
      if (!apiLink) return;

      const res = await fetch(`${apiLink}?action=get_reg_config`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          if (data.regDateFrom) localStorage.setItem('agr_reg_date_from', data.regDateFrom);
          else localStorage.removeItem('agr_reg_date_from');
          
          if (data.regDateTo) localStorage.setItem('agr_reg_date_to', data.regDateTo);
          else localStorage.removeItem('agr_reg_date_to');
        }
      }
    } catch (e) {
      console.error('Lỗi tải cấu hình đăng ký từ server:', e);
    }
  },
  
  async getRegistrations(empId) {
    let allRegs = [];
    const normalizedEmpId = empId.toLowerCase();
    
    try {
      const db = window.FirebaseDB?.db;
      if (db) {
        const { collection, query, where, getDocs } = window.FirebaseDB;
        const q = query(collection(db, "registrations"), where("empId", "==", normalizedEmpId));
        const qSnap = await getDocs(q);
        const data = qSnap.docs.map(d => d.data());
        if (data.length > 0) {
          return data;
        }
      } 
      
      // Fallback to Google Sheets
      const apiLink = this.getApiLink();
      if (apiLink) {
        const url = `${apiLink}?action=get_registration&empId=${encodeURIComponent(normalizedEmpId)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            return data;
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      }
    } catch (e) { 
      console.warn('Lỗi getRegistrations (API/Firebase):', e);
    }

    // Fallback: localStorage
    if (allRegs.length === 0) {
      const key = `agr_reg_${normalizedEmpId}`;
      allRegs = JSON.parse(localStorage.getItem(key) || '[]');
    }
    return allRegs;
  },

  async getChangeRequests() {
    const apiLink = this.getApiLink();
    if (!apiLink) return [];
    
    try {
      const resReq = await fetch(apiLink, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_change_requests' }) 
      });
      if (resReq.ok) {
        const reqData = await resReq.json();
        return reqData.data || [];
      }
      return [];
    } catch(e) {
      console.warn("Lỗi get_change_requests:", e);
      return [];
    }
  },

  async submitToFirebase(payload) {
    try {
      const db = window.FirebaseDB?.db;
      if (!db) {
        return { success: false, error: "Firebase DB not initialized" };
      }
      const { collection, addDoc, query, where, getDocs } = window.FirebaseDB;
      const regRef = collection(db, "registrations");
      
      // Double check on Firebase to prevent cross-device duplicate quickly
      const q = query(regRef, where("empId", "==", payload.empId.toLowerCase()), where("period", "==", payload.period), where("shiftId", "==", payload.shiftId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        // This is a critical validation error, should throw
        return { success: false, error: 'Bạn đã đăng ký ca này rồi, không được đăng ký lại!' };
      }
      
      // Save to Firebase as a "lock"
      await addDoc(regRef, payload);
      return { success: true };
    } catch (e) {
      console.warn('Firebase save failed (non-critical):', e);
      // Return true for system stability, error is just logged
      return { success: false, error: e.message };
    }
  },

  async submitToGoogleSheets(payload) {
    const apiLink = this.getApiLink();
    if (!apiLink) return { success: false, error: 'Chưa cấu hình API URL' };

    try {
      const resp = await fetch(apiLink, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!resp.ok) {
         return { success: false, error: `HTTP Error ${resp.status}` };
      }
      
      const result = await resp.json();
      if (result.error) {
        return { success: false, error: result.error };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  async submitRegistration(payload) {
    // Normalize empId for payload
    payload.empId = payload.empId.toLowerCase();

    // 1. Gửi lên Firebase (có Error Boundary)
    const fbResult = await this.submitToFirebase(payload);
    if (!fbResult.success && fbResult.error === 'Bạn đã đăng ký ca này rồi, không được đăng ký lại!') {
        return fbResult; // Abort if duplicate found in Firebase
    }

    // 2. Gửi lên Google Sheets (Luôn luôn thực hiện dù Firebase fail)
    const sheetResult = await this.submitToGoogleSheets(payload);
    
    return {
      firebaseSuccess: fbResult.success,
      sheetSuccess: sheetResult.success,
      error: sheetResult.error || (fbResult.success ? null : "Firebase error ignored")
    };
  },
  
  async submitChangeRequest(payload) {
    const apiLink = this.getApiLink();
    if (!apiLink) return { success: false, error: 'Lỗi kết nối máy chủ!' };
    
    // Normalize empId
    payload.empId = payload.empId.toLowerCase();
    
    try {
      const res = await fetch(apiLink, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
         return { success: false, error: `HTTP Error ${res.status}` };
      }
      
      const data = await res.json();
      
      if (data.status === 'success') {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Lỗi không xác định từ máy chủ' };
      }
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
};

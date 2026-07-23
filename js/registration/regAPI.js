// js/registration/regAPI.js
/**
 * API interaction logic for Registration module.
 * Strategy: Firebase-first, Google Sheets as sync/fallback.
 */

const RegAPI = {
  getApiLink() {
    return localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
  },

  /**
   * Load registration config (date range).
   * Firebase-first, GAS fallback.
   */
  async loadConfig() {
    try {
      // 1. Try Firebase
      if (window.FirestoreService) {
        const config = await window.FirestoreService.getConfig();
        if (config) {
          if (config.regDateFrom) localStorage.setItem('agr_reg_date_from', config.regDateFrom);
          else localStorage.removeItem('agr_reg_date_from');
          if (config.regDateTo) localStorage.setItem('agr_reg_date_to', config.regDateTo);
          else localStorage.removeItem('agr_reg_date_to');
          return;
        }
      }
    } catch (e) {
      console.warn('Firebase loadConfig failed, falling back to GAS:', e);
    }

    // 2. Fallback to Google Apps Script
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
      console.error('Lỗi tải cấu hình đăng ký:', e);
    }
  },

  /**
   * Get employee registrations.
   * Firebase-first → GAS fallback → localStorage fallback.
   */
  async getRegistrations(empId) {
    const normalizedEmpId = (empId || "").trim().toUpperCase();

    // 1. Try Firebase (via FirestoreService)
    try {
      if (window.FirestoreService) {
        const result = await window.FirestoreService.getRegistrations(normalizedEmpId);
        if (result && result.length > 0) {
          return result;
        }
      }
    } catch (e) {
      console.warn('Firebase getRegistrations failed:', e);
    }

    // 2. Fallback to Google Apps Script
    try {
      const apiLink = this.getApiLink();
      if (apiLink) {
        const url = `${apiLink}?action=get_registration&empId=${encodeURIComponent(normalizedEmpId)}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          if (data && !data.error) {
            return data;
          }
        }
      }
    } catch (e) {
      console.warn('GAS getRegistrations failed:', e);
    }

    // 3. Fallback: localStorage
    try {
      const key = `agr_reg_${normalizedEmpId}`;
      const cached = JSON.parse(localStorage.getItem(key) || 'null');
      if (cached) return cached;
    } catch (e) { /* ignore */ }

    return [];
  },

  /**
   * Get pending change requests.
   * Firebase-first, GAS fallback.
   */
  async getChangeRequests() {
    // 1. Try Firebase
    try {
      if (window.FirestoreService) {
        const result = await window.FirestoreService.getChangeRequests();
        if (result.success) {
          return result.requests;
        }
      }
    } catch (e) {
      console.warn('Firebase getChangeRequests failed:', e);
    }

    // 2. Fallback to GAS
    const apiLink = this.getApiLink();
    if (!apiLink) return [];
    try {
      const resReq = await fetch(apiLink, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'get_change_requests' })
      });
      if (resReq.ok) {
        const reqData = await resReq.json();
        return reqData.data || [];
      }
      return [];
    } catch (e) {
      console.warn("Lỗi get_change_requests:", e);
      return [];
    }
  },

  /**
   * Submit registration.
   * Firebase-first (primary), GAS sync in background.
   */
  async submitRegistration(payload) {
    // Normalize empId to UPPERCASE for Firestore consistency
    payload.empId = (payload.empId || "").trim().toUpperCase();

    // 1. Submit to Firebase (Primary)
    if (window.FirestoreService) {
      try {
        const fbResult = await window.FirestoreService.submitRegistration(payload);
        if (!fbResult.success) {
          return fbResult; // Duplicate or error from Firebase = hard stop
        }

        // 2. Background sync to Google Sheets (fire-and-forget)
        this._syncToGoogleSheets({
          ...payload,
          action: 'submit_registration'
        });

        return {
          success: true,
          message: fbResult.message || "Đăng ký thành công!",
          source: "firebase"
        };
      } catch (e) {
        console.warn('Firebase submitRegistration failed, trying GAS:', e);
      }
    }

    // 3. Fallback: Submit directly to Google Sheets
    return await this._submitToGoogleSheets(payload);
  },

  /**
   * Submit change request.
   * Firebase-first, GAS fallback.
   */
  async submitChangeRequest(payload) {
    payload.empId = (payload.empId || "").trim().toUpperCase();

    // 1. Try Firebase
    if (window.FirestoreService) {
      try {
        const result = await window.FirestoreService.submitChangeRequest(payload);
        if (result.success) {
          // Background sync to GAS
          this._syncToGoogleSheets({
            ...payload,
            action: 'submit_change_request'
          });
          return { success: true };
        }
      } catch (e) {
        console.warn('Firebase submitChangeRequest failed:', e);
      }
    }

    // 2. Fallback to GAS
    const apiLink = this.getApiLink();
    if (!apiLink) return { success: false, error: 'Lỗi kết nối máy chủ!' };

    try {
      const res = await fetch(apiLink, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...payload, action: 'submit_change_request' })
      });
      if (!res.ok) return { success: false, error: `HTTP Error ${res.status}` };
      const data = await res.json();
      if (data.status === 'success') return { success: true };
      return { success: false, error: data.error || 'Lỗi không xác định' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // =============================================
  // INTERNAL: Google Sheets sync (background)
  // =============================================

  /**
   * Fire-and-forget sync to Google Sheets for HR reporting.
   * This is non-blocking and failures are logged but not shown to user.
   */
  _syncToGoogleSheets(payload) {
    const apiLink = this.getApiLink();
    if (!apiLink) return;

    fetch(apiLink, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(res => {
      if (!res.ok) console.warn('GAS sync failed:', res.status);
    }).catch(e => {
      console.warn('GAS sync error (non-critical):', e.message);
    });
  },

  /**
   * Direct submit to Google Sheets (fallback path only).
   */
  async _submitToGoogleSheets(payload) {
    const apiLink = this.getApiLink();
    if (!apiLink) return { success: false, error: 'Chưa cấu hình API URL' };

    try {
      const resp = await fetch(apiLink, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...payload, action: 'submit_registration' })
      });
      if (!resp.ok) return { success: false, error: `HTTP Error ${resp.status}` };
      const result = await resp.json();
      if (result.error) return { success: false, error: result.error };
      return { success: true, source: "google_sheets" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
};

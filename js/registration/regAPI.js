// API CLIENT CHO PHÂN HỆ ĐĂNG KÝ LỊCH LÀM VIỆC (REG API)
const RegAPI = {
  async submitRegistration(payload) {
    return DataManager.callApi('submit_registration', {
      ...payload,
      timestamp: Utils.getCurrentVNTime()
    });
  },

  async submitChangeRequest(payload) {
    return DataManager.callApi('submit_change_request', {
      ...payload,
      timestamp: Utils.getCurrentVNTime()
    });
  },

  async getRegistration(empId) {
    if (!empId) return [];
    const normalizedEmpId = empId.trim().toUpperCase();

    // 1. Thử gọi trực tiếp GET đến Apps Script (rất nhanh và chuẩn)
    try {
      const url = `${CONFIG.APPS_SCRIPT_URL}?action=get_registration&empId=${encodeURIComponent(normalizedEmpId)}`;
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          try { localStorage.setItem(`agari_reg_cache_${normalizedEmpId}`, JSON.stringify(data)); } catch (e) {}
          return data;
        }
      }
    } catch (err) {
      console.warn('[RegAPI.getRegistration] Lỗi GET Apps Script:', err);
    }

    // 2. Thử gọi qua DataManager.callApi (POST)
    try {
      const resPost = await DataManager.callApi('get_registration', { empId: normalizedEmpId });
      if (Array.isArray(resPost)) {
        try { localStorage.setItem(`agari_reg_cache_${normalizedEmpId}`, JSON.stringify(resPost)); } catch (e) {}
        return resPost;
      }
      if (resPost && Array.isArray(resPost.data)) {
        return resPost.data;
      }
    } catch (errPost) {
      console.warn('[RegAPI.getRegistration] Lỗi POST DataManager:', errPost);
    }

    // 3. Fallback lấy từ Cache nếu offline
    try {
      const cached = localStorage.getItem(`agari_reg_cache_${normalizedEmpId}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    return [];
  },

  async getRegistrationConfig() {
    return DataManager.callApi('get_reg_config');
  }
};

if (typeof window !== 'undefined') {
  window.RegAPI = RegAPI;
}

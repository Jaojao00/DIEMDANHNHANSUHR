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

  async getRegistrationConfig() {
    return DataManager.callApi('get_reg_config');
  }
};

if (typeof window !== 'undefined') {
  window.RegAPI = RegAPI;
}

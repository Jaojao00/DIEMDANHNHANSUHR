// js/registration/regValidation.js
/**
 * Validation logic for Registration module
 * Can be used in Node.js tests or browser
 */

const RegValidation = {
  getEmployeeIdRegex() {
    return (typeof CONFIG !== 'undefined' && CONFIG.EMPLOYEE_ID_REGEX) 
      ? CONFIG.EMPLOYEE_ID_REGEX 
      : /^Ops\d{5,6}$/i;
  },
  
  getPhoneRegex() {
    return (typeof CONFIG !== 'undefined' && CONFIG.PHONE_REGEX) 
      ? CONFIG.PHONE_REGEX 
      : /^(03|05|07|08|09)\d{8}$/;
  },
  
  validateEmployeeId(empId) {
    if (!empId) return false;
    return this.getEmployeeIdRegex().test(empId.trim());
  },
  
  validatePhone(phone) {
    if (!phone) return false;
    return this.getPhoneRegex().test(phone.trim());
  },
  
  validateInputs(empId, empName, empPhone, osGender) {
    const errors = [];
    if (!empId || !empName || !empPhone || !osGender) {
      errors.push('Vui lòng nhập đầy đủ mã NV, họ tên, số điện thoại và giới tính OS');
      return errors; // Return early if missing fields
    }
    
    if (!this.validateEmployeeId(empId)) {
      errors.push('Mã nhân viên không hợp lệ (Ví dụ: Ops123456)');
    }
    
    if (!this.validatePhone(empPhone)) {
      errors.push('Số điện thoại không hợp lệ (10 số, bắt đầu 03/05/07/08/09)');
    }
    
    return errors;
  }
};

// Export for Node.js testing, attach to window in browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RegValidation;
} else if (typeof window !== 'undefined') {
  window.RegValidation = RegValidation;
}

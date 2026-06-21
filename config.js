/**
 * AGR - Hệ Thống Điểm Danh & Lịch Làm Việc
 * File cấu hình - Chỉnh sửa các giá trị này trước khi deploy
 */

const CONFIG = {
  // =============================================
  // GOOGLE SHEETS / APPS SCRIPT
  // =============================================
  // Dán URL Google Apps Script Web App vào đây sau khi deploy
  // Xem hướng dẫn trong README.md
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzGzzwfxPrYVnqh5y1UT3tZC--fbCcd5ru8BhUZ1UoE_hOH5e5WxQR6gZRCfLIj0a4/exec',

  // Tự động BẬT realtime nếu APPS_SCRIPT_URL đã được cài đặt
  get DEMO_MODE() {
    const localUrl = localStorage.getItem('agr_api_url');
    return !(this.APPS_SCRIPT_URL || localUrl);
  },

  // Trả về URL được öu tiên nhất
  get API_URL() {
    return this.APPS_SCRIPT_URL || localStorage.getItem('agr_api_url') || '';
  },

  // =============================================
  // THỜI GIAN LÀM MỚI
  // =============================================
  REFRESH_INTERVAL: 15000, // 15 giây

  // =============================================
  // VALIDATION
  // =============================================
  // Định dạng mã nhân viên: Ops/OPS/ops + 5-6 chữ số
  EMPLOYEE_ID_REGEX: /^[Oo][Pp][Ss]\d{5,6}$/,

  // Số điện thoại Việt Nam (10 số, bắt đầu 03/05/07/08/09)
  PHONE_REGEX: /^(0[35789])\d{8}$/,

  // Tên tối thiểu 5 ký tự
  MIN_NAME_LENGTH: 5,

  // =============================================
  // CAMERA & SCANNING
  // =============================================
  // Thời gian chờ giữa 2 lần quét (ms) - chống spam
  SCAN_COOLDOWN: 3000,

  // Thời gian hiển thị kết quả quét (ms)
  SCAN_RESULT_DISPLAY: 2000,

  // Ưu tiên camera sau (rear-facing)
  PREFER_REAR_CAMERA: true,

  // =============================================
  // UI & UX
  // =============================================
  // Tự động làm mới lịch mỗi X ms (60s)
  REFRESH_INTERVAL: 60000,

  // Thời gian hiển thị toast notification (ms)
  TOAST_DURATION: 4000,

  // Thời gian hiển thị success overlay (ms)
  SUCCESS_DISPLAY: 3000,

  // =============================================
  // ANTI-FRAUD
  // =============================================
  // Số lần thử tối đa trước khi khóa (trong 1 phiên)
  MAX_ATTEMPTS: 10,

  // Thời gian khóa sau khi vượt giới hạn (ms)
  LOCKOUT_DURATION: 300000, // 5 phút

  // =============================================
  // MANAGER AUTHENTICATION
  // =============================================
  // Mật khẩu dành cho quản lý (thay đổi mật khẩu này!)
  MANAGER_PASSWORD: '016850Tai@',

  // =============================================
  // APP INFO
  // =============================================
  APP_NAME: 'Tyler Nguyen HR Điểm Danh',
  VERSION: '1.0.0',
  COMPANY: 'Tyler Nguyen HR',
};

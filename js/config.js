// CẤU HÌNH HỆ THỐNG AGARI HR (DIEMDANHNHANSUHR - v78)
const CONFIG = {
  VERSION: 'v78',
  APP_NAME: 'Agari HR Operations Portal',
  
  // Google Apps Script REST API Web App Endpoint
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxX_YKQ-Ym6LKzJjbG3_s5D3VB2Cg2A-eW4aZWLH0QLVlaaLleoowndTtOdswPmquqr/exec',
  
  // Google Spreadsheet Master ID
  SPREADSHEET_ID: '1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI',
  
  // Google Drive Thư mục lưu ảnh khiếu nại
  GDRIVE_FOLDER_ID: '18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu',
  
  // Script Id Clasp
  CLASP_SCRIPT_ID: '1SXNObczmGkhwAPIHSG_UtDj6PULKXabByHMYfWzE-9Leipe5ieZF1lRU',
  
  // Danh sách các ca làm việc
  SHIFTS: [
    { id: '18:00-22:00', label: '18:00 - 22:00 (Ca Tối - Mặc định)', name: 'Ca Tối', isDefault: true },
    { id: '22:00-06:00', label: '22:00 - 06:00 (Ca Đêm)', name: 'Ca Đêm' },
    { id: '06:00-11:00', label: '06:00 - 11:00 (Ca Sáng)', name: 'Ca Sáng' },
    { id: '06:00-15:00', label: '06:00 - 15:00 (Ca OS Sáng)', name: 'Ca OS Sáng' },
    { id: '13:00-22:00', label: '13:00 - 22:00 (Ca Chiều)', name: 'Ca Chiều' },
  ],

  // Cấu hình Firebase Realtime Sync
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyDummyKeyForAgariHrRealtimeListener_v78",
    authDomain: "agari-hr-ops.firebaseapp.com",
    projectId: "agari-hr-ops",
    storageBucket: "agari-hr-ops.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  },

  // Token & Storage Keys
  STORAGE_KEYS: {
    ADMIN_TOKEN: 'agr_admin_token', // BẮT BUỘC theo Nguyên tắc 3
    ADMIN_INFO: 'agr_admin_info',
    LAST_CHECKIN: 'agr_last_checkin',
    OFFLINE_DATA: 'agr_offline_roster',
    USER_PREF: 'agr_user_preference'
  },

  // Cấu hình Session Admin
  ADMIN_TOKEN_TTL_MS: 60 * 60 * 1000, // 60 phút

  // Múi giờ
  TIMEZONE: 'Asia/Ho_Chi_Minh'
};

// Export to window if not using ES modules
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

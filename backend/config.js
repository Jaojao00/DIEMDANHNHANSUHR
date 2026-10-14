/**
 * BACKEND CẤU HÌNH GOOGLE APPS SCRIPT (AGARI HR - v78)
 */
var CONFIG = {
  SPREADSHEET_ID: '1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI',
  GDRIVE_FOLDER_ID: '18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu',
  TIMEZONE: 'Asia/Ho_Chi_Minh',
  ADMIN_ACCOUNTS: [
    { email: 'tainguyenhr.dev@gmail.com', role: 'SUPER_ADMIN' },
    { email: 'ptbt472@gmail.com', role: 'ADMIN' }
  ],
  TOKEN_EXPIRY_MINUTES: 60,
  SHEETS: {
    CONFIG: 'CONFIG',
    CA_PREFIX: 'Ca_',
    VITRI: 'Sheet_ViTri',
    XIN_OFF: 'XIN_OFF',
    CHANGE_REQUESTS: 'ChangeRequests',
    REGISTRATIONS_PREFIX: 'T__',
    SOC_SOUTH: 'SOC_South',
    BANG_LUONG: 'BangLuong',
    KHIEU_NAI: 'KhieuNai',
    CAP_DOI_AO_THE: 'Cấp Đổi Áo Thẻ',
    ADMIN_LOGS: 'AdminLogs'
  }
};

var CONFIG = {
  SPREADSHEET_ID: "1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI",
  TIMEZONE: "Asia/Ho_Chi_Minh",
  ADMIN_EXPIRY_MINUTES: 60
};

function setupInitialAdminConfig() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var admins = {
    "tainguyenhr.dev@gmail.com": "016850@admin",
    "ptbt472@gmail.com": "Tran90111@admin1"
  };
  scriptProperties.setProperty("ADMIN_CREDS", JSON.stringify(admins));
}

function getConfigSheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("CONFIG");
  if (!sheet) {
    sheet = ss.insertSheet("CONFIG");
    sheet.appendRow(["Key", "Value"]);
  }
  return sheet;
}

// Hàm xử lý POST requests (Lưu lịch, Cập nhật điểm danh)
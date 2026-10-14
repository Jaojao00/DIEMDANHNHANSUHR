/**
 * BACKEND UTILITIES (AGARI HR)
 */

function sendJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sendSuccessResponse(data, message) {
  return sendJsonResponse({
    success: true,
    message: message || 'Thao tác thành công',
    data: data || null,
    timestamp: new Date().toISOString()
  });
}

function sendErrorResponse(message, code) {
  return sendJsonResponse({
    success: false,
    message: message || 'Đã có lỗi xảy ra',
    code: code || 500,
    timestamp: new Date().toISOString()
  });
}

function getMasterSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getOrCreateSheet(sheetName) {
  var ss = getMasterSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function sanitizeEmployeeId(id) {
  if (!id) return '';
  return String(id).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatVNTime(date) {
  return Utilities.formatDate(date || new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function isCccdMatch(id1, id2) {
  var a = sanitizeEmployeeId(id1);
  var b = sanitizeEmployeeId(id2);
  if (!a || !b) return false;
  if (a === b) return true;
  // Xử lý mất số 0 đầu 11 vs 12 số (Nguyên tắc 8)
  if (a.length === 11 && b.length === 12 && '0' + a === b) return true;
  if (a.length === 12 && b.length === 11 && a === '0' + b) return true;
  return false;
}

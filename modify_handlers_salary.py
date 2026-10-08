import re

with open('backend/handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_handler = '''

// Handle Salary Lookup
function handleLookupSalary(data) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("BangLuong");
    if (!sheet) {
      return sendErrorResponse("Chưa cấu hình trang tính BangLuong");
    }
    
    var searchId = (data.empId || "").toString().trim().toUpperCase();
    if (!searchId) return sendErrorResponse("Vui lòng nhập mã");
    
    var dataRange = sheet.getDataRange().getValues();
    if (dataRange.length < 2) {
      return sendSuccessResponse({ records: [] });
    }
    
    var headers = dataRange[0];
    var records = [];
    
    // Find index of CCCD and Mã CTV
    var cccdIdx = -1;
    var ctvIdx = -1;
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].toString().trim().toUpperCase();
      if (h === "CCCD") cccdIdx = i;
      if (h.indexOf("MÃ CTV") !== -1) ctvIdx = i;
    }
    
    for (var i = 1; i < dataRange.length; i++) {
      var row = dataRange[i];
      var match = false;
      if (cccdIdx !== -1 && row[cccdIdx] != null && row[cccdIdx].toString().trim().toUpperCase() === searchId) match = true;
      if (ctvIdx !== -1 && row[ctvIdx] != null && row[ctvIdx].toString().trim().toUpperCase() === searchId) match = true;
      
      if (match) {
        var record = {};
        for (var j = 0; j < headers.length; j++) {
          var val = row[j];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, CONFIG.TIMEZONE, "dd/MM/yyyy");
          }
          record[headers[j]] = val;
        }
        records.push(record);
      }
    }
    
    return sendSuccessResponse({ records: records });
  } catch (e) {
    return sendErrorResponse("Lỗi: " + e.toString());
  }
}
'''
content += new_handler

with open('backend/handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated handlers.js for salary lookup")

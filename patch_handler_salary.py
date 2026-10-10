with open("backend/handlers.js", "r", encoding="utf-8") as f:
    content = f.read()

handler_code = """
  function handleGetSalaryList(data) {
    try {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sheet = ss.getSheetByName("BangLuong");
      if (!sheet) {
        return sendErrorResponse("Khong tim thay sheet BangLuong");
      }
      
      var vals = sheet.getDataRange().getDisplayValues();
      if (vals.length < 2) {
        return sendSuccessResponse({ salaries: [] });
      }
      
      var headers = vals[0].map(function(h) { return h.toString().trim(); });
      var salaries = [];
      for (var i = 1; i < vals.length; i++) {
        var row = vals[i];
        if (!row[0] && !row[1] && !row[2]) continue; // Skip empty rows
        
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j];
        }
        salaries.push(obj);
      }
      
      return sendSuccessResponse({ salaries: salaries });
    } catch (e) {
      return sendErrorResponse("Loi lay bang luong: " + e.toString());
    }
  }
"""

if "function handleGetSalaryList" not in content:
    with open("backend/handlers.js", "a", encoding="utf-8") as f:
        f.write(handler_code)
    print("Added handleGetSalaryList")
else:
    print("Already exists")

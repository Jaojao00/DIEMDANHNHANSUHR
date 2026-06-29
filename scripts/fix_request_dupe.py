import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_logic = '''        var reqType = data.type || "XIN OFF";
        var reqDate = data.date || "";
        var reqEmpId = (data.empId || "").toString().toLowerCase().trim();
        
        if (reqSheet.getLastRow() > 1) {
          var reqData = reqSheet.getDataRange().getValues();
          for (var i = 1; i < reqData.length; i++) {
             var rowId = (reqData[i][1] || "").toString().toLowerCase().trim();
             var rowType = (reqData[i][4] || "").toString();
             var rowDate = (reqData[i][6] || "").toString();
             
             if (rowId === reqEmpId && rowType === reqType && rowDate === reqDate) {
               return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã gửi yêu cầu " + reqType + " cho ngày " + reqDate + " rồi. Vui lòng không gửi nhiều lần!" })).setMimeType(ContentService.MimeType.JSON);
             }
          }
        }'''

new_logic = '''        var reqType = data.type || "XIN OFF";
        var reqDate = data.date || ""; // VD: "24/06/2026"
        var reqEmpId = (data.empId || "").toString().toLowerCase().trim();
        var reqTargetShift = data.targetShift || "";
        
        if (reqSheet.getLastRow() > 1) {
          var reqData = reqSheet.getDataRange().getValues();
          for (var i = 1; i < reqData.length; i++) {
             var rowId = (reqData[i][1] || "").toString().toLowerCase().trim();
             var rowType = (reqData[i][4] || "").toString().trim();
             
             // Xử lý Date object từ Google Sheets
             var rawDate = reqData[i][6];
             var rowDate = "";
             if (rawDate instanceof Date) {
               rowDate = Utilities.formatDate(rawDate, CONFIG.TIMEZONE, "dd/MM/yyyy");
             } else {
               rowDate = (rawDate || "").toString().trim();
             }
             
             var rowTargetShift = (reqData[i][8] || "").toString().trim();
             
             if (rowId === reqEmpId && rowType === reqType && rowDate === reqDate) {
               if (reqType === "XIN LÊN CA") {
                 // Nếu xin lên ca thì phải check trùng ca đích
                 if (rowTargetShift === reqTargetShift) {
                   return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã đăng ký " + reqType + " cho ca này vào ngày " + reqDate + " thành công rồi, vui lòng không điền lại!" })).setMimeType(ContentService.MimeType.JSON);
                 }
               } else {
                 // Xin off thì chỉ check ngày
                 return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã gửi yêu cầu " + reqType + " cho ngày " + reqDate + " thành công rồi, vui lòng không điền lại!" })).setMimeType(ContentService.MimeType.JSON);
               }
             }
          }
        }'''

if old_logic in code:
    code = code.replace(old_logic, new_logic)
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced logic successfully")
else:
    print("Could not find old logic")

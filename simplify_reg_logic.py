import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = re.compile(r'// Thu thập danh sách các ca và ngày đã đăng ký.*?(?=\s+// Append new row)', re.DOTALL)

new_logic = '''// Thu thập danh sách các ca đã đăng ký
        var allSheets = regSs.getSheets();
        var userRegisteredShifts = [];
        
        for (var s = 0; s < allSheets.length; s++) {
          var sName = allSheets[s].getName();
          if (sName.indexOf("LỊCHT" + month + "_") === 0) {
            var shiftName = sName.replace("LỊCHT" + month + "_", "");
            var sData = allSheets[s].getDataRange().getValues();
            
            for (var r = 1; r < sData.length; r++) {
              var rId = (sData[r][1] || "").toString().toLowerCase().trim();
              if (rId === searchId) {
                userRegisteredShifts.push(shiftName);
                break;
              }
            }
          }
        }
        
        var reqShift = data.shiftId || "";
        
        // Chỉ duy nhất 1 luật: Không được đăng ký cùng 1 ca tới 2 lần
        if (userRegisteredShifts.indexOf(reqShift) !== -1) {
          return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã đăng ký ca " + reqShift + " trong kỳ này rồi, không được đăng ký lại!" })).setMimeType(ContentService.MimeType.JSON);
        }'''

if pattern.search(code):
    code = pattern.sub(new_logic, code)
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced logic successfully")
else:
    print("Could not find old logic")

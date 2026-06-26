import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = re.compile(r'// Ki[ểe]m tra xem.*?(?=// Append new row)', re.DOTALL)

new_logic = '''// Thu thập danh sách các ca và ngày đã đăng ký
        var allSheets = regSs.getSheets();
        var userRegisteredShifts = [];
        var bookedDatesByShift = {};
        
        for (var s = 0; s < allSheets.length; s++) {
          var sName = allSheets[s].getName();
          if (sName.indexOf("LỊCHT" + month + "_") === 0) {
            var shiftName = sName.replace("LỊCHT" + month + "_", "");
            var sData = allSheets[s].getDataRange().getValues();
            var header = sData[0];
            
            for (var r = 1; r < sData.length; r++) {
              var rId = (sData[r][1] || "").toString().toLowerCase().trim();
              if (rId === searchId) {
                userRegisteredShifts.push(shiftName);
                bookedDatesByShift[shiftName] = [];
                // Thu thập các ngày đã tick YES (từ cột 7 trở đi)
                for (var c = 7; c < header.length; c++) {
                  if (sData[r][c] === "YES") {
                    bookedDatesByShift[shiftName].push(header[c]);
                  }
                }
                break;
              }
            }
          }
        }
        
        var reqShift = data.shiftId || "";
        
        // Rule 1: Không đăng ký trùng ca đã có
        if (userRegisteredShifts.indexOf(reqShift) !== -1) {
          return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã đăng ký ca " + reqShift + " trong kỳ này rồi!" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // Phân loại ca
        var FT_SHIFTS = ['06:00-15:00', '15:00-22:00', '22:00-06:00'];
        var PT_SHIFTS = ['06:00-10:00', '18:00-22:00'];
        
        var ftCount = 0;
        var ptCount = 0;
        userRegisteredShifts.forEach(function(sh) {
          if (FT_SHIFTS.indexOf(sh) !== -1) ftCount++;
          if (PT_SHIFTS.indexOf(sh) !== -1) ptCount++;
        });
        
        var isReqFT = FT_SHIFTS.indexOf(reqShift) !== -1;
        var isReqPT = PT_SHIFTS.indexOf(reqShift) !== -1;
        
        // Rule 2 & 3: Giới hạn số lượng ca
        if (isReqFT) {
          if (ftCount >= 1) {
            return ContentService.createTextOutput(JSON.stringify({ error: "Bạn chỉ được đăng ký tối đa 1 ca dài (Full-time) trong một kỳ." })).setMimeType(ContentService.MimeType.JSON);
          }
          if (ptCount >= 2) {
            return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã có 2 ca ngắn, không thể đăng ký thêm ca dài." })).setMimeType(ContentService.MimeType.JSON);
          }
        } else if (isReqPT) {
          if (ftCount >= 1 && ptCount >= 1) {
            return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã có 1 ca dài, chỉ được phép đăng ký thêm tối đa 1 ca ngắn." })).setMimeType(ContentService.MimeType.JSON);
          }
        }
        
        // Lấy danh sách các ngày user chọn YES trong form
        var reqDates = [];
        if (data.selections) {
          data.selections.forEach(function(sel) {
            if (sel.selected) reqDates.push(sel.label);
          });
        }
        
        // Rule 4: Chống trùng giờ làm trong cùng 1 ngày
        // Cặp trùng giờ: 06:00-15:00 trùng với 06:00-10:00
        // Cặp trùng giờ: 15:00-22:00 trùng với 18:00-22:00
        var overlapPairs = [
          ['06:00-15:00', '06:00-10:00'],
          ['15:00-22:00', '18:00-22:00']
        ];
        
        for (var p = 0; p < overlapPairs.length; p++) {
          var s1 = overlapPairs[p][0];
          var s2 = overlapPairs[p][1];
          
          var conflictShift = "";
          if (reqShift === s1 && userRegisteredShifts.indexOf(s2) !== -1) conflictShift = s2;
          if (reqShift === s2 && userRegisteredShifts.indexOf(s1) !== -1) conflictShift = s1;
          
          if (conflictShift) {
             var conflictDates = bookedDatesByShift[conflictShift] || [];
             for (var d = 0; d < reqDates.length; d++) {
               if (conflictDates.indexOf(reqDates[d]) !== -1) {
                 return ContentService.createTextOutput(JSON.stringify({ error: "Bạn không thể chọn ngày " + reqDates[d] + " cho ca " + reqShift + " vì bạn đã đăng ký ca " + conflictShift + " trùng giờ vào ngày này rồi!" })).setMimeType(ContentService.MimeType.JSON);
               }
             }
          }
        }
        
        '''

if pattern.search(code):
    code = pattern.sub(new_logic, code)
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced logic successfully")
else:
    print("Could not find old logic")

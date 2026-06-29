import sys

filename = 'google-apps-script.js'
with open(filename, 'r', encoding='utf-8') as f:
    content = f.read()

target = 'if (action === "get_shift_registrations") {'
replacement = '''if (action === "get_daily_booking") {
      try {
        var targetDateYMD = data.targetDate; // yyyy-MM-dd
        if (!targetDateYMD) {
          return ContentService.createTextOutput(JSON.stringify({ error: "Missing targetDate" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // Convert yyyy-MM-dd to dd/MM/yyyy for searching in LỊCH sheets
        var dateParts = targetDateYMD.split("-");
        var targetDateDMY = dateParts.length === 3 ? (dateParts[2] + "/" + dateParts[1] + "/" + dateParts[0]) : targetDateYMD;
        
        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        
        // 1. Lấy dữ liệu PLAN từ BOOKING
        var bookingSheet = ss.getSheetByName("BOOKING");
        var planData = {};
        if (bookingSheet) {
          var bData = bookingSheet.getDataRange().getValues();
          // Find indexes from headers or assume defaults
          var headers = bData.length > 0 ? bData[0] : [];
          var h2 = bData.length > 1 ? bData[1] : [];
          
          var dCol = 2; // Cột C
          var locCol = 5; // Cột F
          var shiftCol = 7; // Cột H
          var planCol = 9; // Cột J
          
          // Fallback search headers if the format shifts
          for(var i=0; i < Math.max(headers.length, h2.length); i++) {
            var val1 = (headers[i] || "").toString().toLowerCase();
            var val2 = (h2[i] || "").toString().toLowerCase();
            if (val1.indexOf("ngày") > -1 || val2.indexOf("ngày") > -1 || val1.indexOf("date") > -1 || val2.indexOf("date") > -1) dCol = i;
            if (val1.indexOf("khu") > -1 || val2.indexOf("khu") > -1 || val1.indexOf("location") > -1 || val2.indexOf("location") > -1 || val1.indexOf("bộ phận") > -1 || val2.indexOf("bộ phận") > -1) locCol = i; // Khách hàng dùng "Khu làm việc" cột F
            if (val1.indexOf("ca") > -1 || val2.indexOf("ca") > -1 || val1.indexOf("shift") > -1 || val2.indexOf("shift") > -1) shiftCol = i;
            if (val1.indexOf("total request") > -1 || val2.indexOf("total request") > -1) planCol = i;
          }

          // Force locCol = 5 (F) as requested by user just to be safe if heuristic fails, but we use heuristic primarily.
          // User said "cột F và lấy đúng giá trị là SW SOC thui"
          locCol = 5;

          for (var r = 1; r < bData.length; r++) {
            var row = bData[r];
            var loc = (row[locCol] || "").toString().trim();
            if (loc === "SW SOC") {
              var rDate = row[dCol];
              var rDateStr = "";
              if (rDate instanceof Date) {
                 var d = rDate.getDate().toString(); if(d.length==1) d="0"+d;
                 var m = (rDate.getMonth()+1).toString(); if(m.length==1) m="0"+m;
                 var y = rDate.getFullYear().toString();
                 rDateStr = y + "-" + m + "-" + d;
              } else {
                 rDateStr = (rDate || "").toString();
              }
              
              if (rDateStr.indexOf(targetDateYMD) !== -1 || rDateStr === targetDateDMY) {
                var shiftName = (row[shiftCol] || "").toString().trim();
                var planVal = parseInt(row[planCol], 10) || 0;
                
                if (shiftName) {
                  if (!planData[shiftName]) planData[shiftName] = 0;
                  planData[shiftName] += planVal;
                }
              }
            }
          }
        }
        
        // 2. Lấy dữ liệu ACTUAL từ các sheet LỊCH_...
        var actualData = {};
        var allSheets = ss.getSheets();
        for (var s = 0; s < allSheets.length; s++) {
          var sName = allSheets[s].getName();
          if (sName.indexOf("LỊCH") === 0) {
            var parts = sName.split("_");
            if (parts.length >= 2) {
              var shiftId = parts.slice(1).join("_");
              // Find matching formatted shift Name (e.g. 0600_1500 -> 06:00-15:00)
              // Actually we just read the registrations and map back
              var regData = allSheets[s].getDataRange().getValues();
              if (regData.length > 0) {
                var headers = regData[0];
                var dateColIndex = -1;
                for (var i = 0; i < headers.length; i++) {
                  if (headers[i].toString().indexOf(targetDateDMY) !== -1) {
                    dateColIndex = i;
                    break;
                  }
                }
                
                if (dateColIndex !== -1) {
                   var actualCount = 0;
                   for (var r = 1; r < regData.length; r++) {
                     var val = (regData[r][dateColIndex] || "").toString().toUpperCase();
                     if (val === "WORK") {
                       actualCount++;
                     }
                   }
                   
                   // ShiftId is like 0600_1500, convert to 06:00-15:00
                   var formattedShift = shiftId.replace("_", "-");
                   if (formattedShift.length === 9) {
                     formattedShift = formattedShift.substring(0, 2) + ":" + formattedShift.substring(2, 5) + ":" + formattedShift.substring(5);
                   }
                   actualData[formattedShift] = actualCount;
                   // Also store original shiftId in case matching is weird
                   actualData[shiftId] = actualCount;
                }
              }
            }
          }
        }
        
        // 3. Chuẩn bị response: Gộp Plan và Actual
        var resultList = [];
        var allShifts = Object.keys(planData);
        for (var key in actualData) {
          if (key.indexOf(":") !== -1 && allShifts.indexOf(key) === -1) {
            allShifts.push(key); // Add shifts that have Actual but no Plan
          }
        }
        
        for (var i = 0; i < allShifts.length; i++) {
          var shift = allShifts[i];
          var shiftIdClean = shift.replace(":", "").replace("-", "_");
          var act = actualData[shift] || actualData[shiftIdClean] || 0;
          var pl = planData[shift] || 0;
          resultList.push({
            shift: shift,
            location: "SW SOC",
            plan: pl,
            actual: act
          });
        }
        
        // Sort
        resultList.sort(function(a, b) {
          return a.shift.localeCompare(b.shift);
        });
        
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          dateYMD: targetDateYMD,
          dateDMY: targetDateDMY,
          data: resultList
        })).setMimeType(ContentService.MimeType.JSON);
        
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Lỗi get_daily_booking: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (action === "get_shift_registrations") {'''

if target in content:
    content = content.replace(target, replacement)
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched google-apps-script.js successfully!")
else:
    print("Target not found in google-apps-script.js")

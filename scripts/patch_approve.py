import os
import re

file_path = "google-apps-script.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

approve_logic = """
    // ACTION: APPROVE_CHANGE_REQUEST (Duyệt thay đổi lịch)
    if (action === "approve_change_request") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(30000);
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var month = "X";
        if (data.selections && data.selections.length > 0) {
          var firstDateLabel = data.selections[0].label;
          var match = firstDateLabel.match(/\\d{2}\\/(\\d{2})\\/\\d{4}/);
          if (match && match[1]) {
            month = parseInt(match[1], 10).toString();
          }
        }
        var searchId = (data.empId || "").toLowerCase().trim();
        
        if (data.shiftId === "CA_NGAY") {
          var subShifts = [
            { id: "06:00-15:00", label: "Ca OS Sáng" },
            { id: "06:00-10:00", label: "Ca Sáng" },
            { id: "15:00-22:00", label: "Ca Chiều" }
          ];
          for (var k = 0; k < subShifts.length; k++) {
            var subShift = subShifts[k];
            var subSelections = (data.selections || []).map(function(sel) {
              return { date: sel.date, label: sel.label, choice: (sel.choice === subShift.id) ? "WORK" : "OFF" };
            });
            var regSheetName = "LỊCHT" + month + "_" + subShift.id;
            var regSheet = regSs.getSheetByName(regSheetName);
            if (regSheet) {
              var vals = regSheet.getDataRange().getValues();
              var rowIndex = -1;
              for (var r = 1; r < vals.length; r++) {
                var rId = (vals[r][1] || "").toString().toLowerCase().trim();
                if (rId === searchId) {
                  rowIndex = r + 1;
                  break;
                }
              }
              if (rowIndex !== -1) {
                regSheet.getRange(rowIndex, 1).setValue(Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss"));
                for (var i = 0; i < subSelections.length; i++) {
                  regSheet.getRange(rowIndex, 8 + i).setValue(subSelections[i].choice);
                }
              }
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        } else {
          var reqShift = data.shiftId || "";
          var regSheetName = "LỊCHT" + month + "_" + reqShift;
          var regSheet = regSs.getSheetByName(regSheetName);
          if (!regSheet) {
            return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy sheet lịch làm việc." })).setMimeType(ContentService.MimeType.JSON);
          }
          var vals = regSheet.getDataRange().getValues();
          var rowIndex = -1;
          for (var r = 1; r < vals.length; r++) {
            var rId = (vals[r][1] || "").toString().toLowerCase().trim();
            if (rId === searchId) {
              rowIndex = r + 1;
              break;
            }
          }
          if (rowIndex === -1) {
            return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy dữ liệu đăng ký cũ của nhân sự này trên Sheet." })).setMimeType(ContentService.MimeType.JSON);
          }
          regSheet.getRange(rowIndex, 1).setValue(Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss"));
          for (var i = 0; i < data.selections.length; i++) {
            regSheet.getRange(rowIndex, 8 + i).setValue(data.selections[i].choice);
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }
"""

if "approve_change_request" not in content:
    content = content.replace('if (action === "reset_registrations") {', approve_logic + '\n    if (action === "reset_registrations") {')
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected approve_change_request into google-apps-script.js")
else:
    print("Already exists.")

const fs = require('fs');

let code = fs.readFileSync('google-apps-script.js', 'utf8');

// 1. Add CONFIG and Timezone
if (!code.includes('var CONFIG = {')) {
    const configBlock = `// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
var CONFIG = {
  SPREADSHEET_ID: "1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI",
  TIMEZONE: "Asia/Ho_Chi_Minh"
};

`;
    code = code.replace('// HELPER: Lấy hoặc tạo sheet CONFIG', configBlock + '// HELPER: Lấy hoặc tạo sheet CONFIG');
}

code = code.replace(/SpreadsheetApp\.openById\([^)]+\)/g, 'SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)');
code = code.replace(/Session\.getScriptTimeZone\(\)/g, 'CONFIG.TIMEZONE');
code = code.replace(/"Asia\/Ho_Chi_Minh"/g, 'CONFIG.TIMEZONE');

// 2. Refactor ACTION: SAVE to use UPSERT
const saveRegex = /if \(action === "save"\) \{([\s\S]*?)return ContentService\.createTextOutput\(JSON\.stringify\(\{ success: true, message: "Lưu lịch làm việc thành công" \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}/;

const saveReplacement = `if (action === "save") {
      var currentData = sheet.getDataRange().getValues();
      var existingDict = {};
      if (currentData.length > 1) {
        var headersOld = currentData[0];
        var N_old = headersOld.length - 8;
        if (N_old < 0) N_old = 0;
        for (var r = 1; r < currentData.length; r++) {
          var empIdOld = (currentData[r][1] || "").toString().toLowerCase().trim();
          existingDict[empIdOld] = {
            status: currentData[r][4 + N_old + 1],
            time: currentData[r][4 + N_old + 2],
            phone: currentData[r][4 + N_old + 3]
          };
        }
      }

      sheet.clear();
      var colHeaders = data.headers || [];
      var headers = ["STT", "Mã NV", "Họ Tên", "Định Danh"].concat(colHeaders).concat(["Ghi Chú", "Trạng Thái", "Thời Gian", "SĐT"]);
      sheet.appendRow(headers);
      
      var rows = [];
      for (var i = 0; i < data.schedule.length; i++) {
        var emp = data.schedule[i];
        var empIdStr = (emp.id || "").toString().toLowerCase().trim();
        var row = [
          emp.stt || "",
          emp.id || "",
          emp.name || "",
          emp.dinhDanh || ""
        ];
        var positions = emp.positions || [];
        for (var j = 0; j < colHeaders.length; j++) {
          row.push(positions[j] || "");
        }
        row.push(emp.note || "");
        
        if (existingDict[empIdStr] && existingDict[empIdStr].status !== "pending") {
            row.push(existingDict[empIdStr].status || "pending");
            row.push(existingDict[empIdStr].time || "");
            row.push(existingDict[empIdStr].phone || "");
        } else {
            row.push(emp.status || "pending");
            row.push(emp.timestamp || "");
            row.push(emp.phone || "");
        }
        rows.push(row);
      }
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Lưu lịch làm việc thành công" })).setMimeType(ContentService.MimeType.JSON);
    }`;

code = code.replace(saveRegex, saveReplacement);

// 3. Add LockService to ACTION: CHECKIN
const checkinRegex = /if \(action === "checkin"\) \{([\s\S]*?)return ContentService\.createTextOutput\(JSON\.stringify\(\{ success: true, employee: empObj \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}/;

const checkinReplacement = `if (action === "checkin") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000); // Wait up to 10 seconds
        
        var searchId = (data.empId || "").toString().toLowerCase().trim();
        var phone = data.phone || "";
        
        var dataRange = sheet.getDataRange();
        var values = dataRange.getValues();
        var headers = values[0];
        var N = headers.length - 8;
        if (N < 0) N = 0;
        
        var empIndex = -1;
        for (var i = 1; i < values.length; i++) {
          var rowId = (values[i][1] || "").toString().toLowerCase().trim();
          var rowStt = (values[i][0] || "").toString().toLowerCase().trim();
          var rowName = (values[i][2] || "").toString().toLowerCase().trim();
          
          if (rowId === searchId || rowStt === searchId || rowName === searchId) {
            empIndex = i;
            break;
          }
        }
        
        if (empIndex === -1) {
          lock.releaseLock();
          return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy mã nhân viên " + data.empId + " trong ca này." })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var statusIndex = 4 + N + 1;
        var timeIndex = 4 + N + 2;
        var phoneIndex = 4 + N + 3;
        
        var currentStatus = values[empIndex][statusIndex];
        if (currentStatus === "confirmed") {
          lock.releaseLock();
          return ContentService.createTextOutput(JSON.stringify({ error: "Nhân viên này đã điểm danh rồi!" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        var now = new Date();
        var timeString = Utilities.formatDate(now, CONFIG.TIMEZONE, "HH:mm:ss");
        
        // Cập nhật mảng trong bộ nhớ rồi setValues để tránh race condition giữa các ô
        values[empIndex][statusIndex] = "confirmed";
        values[empIndex][timeIndex] = timeString;
        values[empIndex][phoneIndex] = phone;
        
        dataRange.setValues(values);
        
        var rowData = values[empIndex];
        var positions = [];
        for (var j = 0; j < N; j++) {
          positions.push(rowData[4 + j] || "");
        }
        
        var empObj = {
          stt: rowData[0],
          id: rowData[1],
          name: rowData[2],
          dinhDanh: rowData[3],
          positions: positions,
          note: rowData[4 + N],
          status: rowData[statusIndex],
          timestamp: rowData[timeIndex],
          phone: rowData[phoneIndex]
        };
        
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({ success: true, employee: empObj })).setMimeType(ContentService.MimeType.JSON);
      } catch (lockErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Hệ thống đang bận, vui lòng thử lại sau vài giây!" })).setMimeType(ContentService.MimeType.JSON);
      }
    }`;

code = code.replace(checkinRegex, checkinReplacement);

// 4. Refactor ACTION: REQUEST
const requestRegex = /if \(action === "request"\) \{([\s\S]*?)return ContentService\.createTextOutput\(JSON\.stringify\(\{ success: true, message: "Gửi yêu cầu thành công!" \}\)\)\.setMimeType\(ContentService\.MimeType\.JSON\);\s*\}/;

const requestReplacement = `if (action === "request") {
      var searchId = (data.empId || "").toString().toLowerCase().trim();
      var targetSheetName = data.targetShift;
      
      if (!targetSheetName || targetSheetName.indexOf("Ca_") !== 0) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Tên ca không hợp lệ" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var reqSheetName = "YeuCauCaNhan";
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var reqSheet = ss.getSheetByName(reqSheetName);
      if (!reqSheet) {
        reqSheet = ss.insertSheet(reqSheetName);
        reqSheet.appendRow(["Thời gian", "Mã NV", "Họ và Tên", "Số ĐT", "Loại yêu cầu", "Ca", "Lý do"]);
      }
      
      var now = new Date();
      var timeString = Utilities.formatDate(now, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
      
      reqSheet.appendRow([
        timeString,
        data.empId || "",
        data.empName || "",
        data.phone || "",
        data.reqType || "",
        data.targetShift || "",
        data.reason || ""
      ]);
      
      if (data.reqType === "XIN OFF") {
        var targetSheet = ss.getSheetByName(targetSheetName);
        if (targetSheet) {
          var lock = LockService.getScriptLock();
          try {
            lock.waitLock(10000);
            var targetData = targetSheet.getDataRange().getValues();
            var N_target = targetData[0].length - 8;
            if (N_target < 0) N_target = 0;
            var updated = false;
            
            for (var r = 1; r < targetData.length; r++) {
              var rowId = (targetData[r][1] || "").toString().toLowerCase().trim();
              if (rowId === searchId) {
                targetData[r][4 + N_target + 1] = "XIN OFF";
                updated = true;
              }
            }
            if (updated) {
              targetSheet.getDataRange().setValues(targetData);
            }
            lock.releaseLock();
          } catch(e) {}
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Gửi yêu cầu thành công!" })).setMimeType(ContentService.MimeType.JSON);
    }`;

code = code.replace(requestRegex, requestReplacement);

fs.writeFileSync('google-apps-script.js', code, 'utf8');
console.log('Saved google-apps-script.js successfully.');

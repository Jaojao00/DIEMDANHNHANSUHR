/**
 * AGR - HỆ THỐNG ĐIỂM DANH - BACKEND (Google Apps Script)
 * Dán toàn bộ mã này vào Google Apps Script của bạn.
 */

// Hàm xử lý POST requests (Lưu lịch, Cập nhật điểm danh)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No post data" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var shiftId = data.shiftId;
    
    if (!shiftId && action !== "request") {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing shiftId" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheetName, sheet;
    if (shiftId) {
      sheetName = "Ca_" + shiftId.replace(":", "").replace("-", "_");
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getSheetByName(sheetName);
      
      // Tạo sheet mới nếu chưa có
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
    }

    // ACTION: SAVE (Lưu danh sách lịch làm việc từ Admin)
    if (action === "save") {
      sheet.clear();
      var colHeaders = data.headers || [];
      var headers = ["STT", "Mã NV", "Họ Tên", "Định Danh"].concat(colHeaders).concat(["Ghi Chú", "Trạng Thái", "Thời Gian", "SĐT"]);
      sheet.appendRow(headers);
      
      var rows = [];
      for (var i = 0; i < data.schedule.length; i++) {
        var emp = data.schedule[i];
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
        row.push(emp.status || "pending");
        row.push(emp.timestamp || "");
        row.push(emp.phone || "");
        
        rows.push(row);
      }
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Lưu lịch thành công" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ACTION: REQUEST (Xin Nghỉ / Xin Lên Ca)
    if (action === "request") {
      try {
        var reqSs = SpreadsheetApp.openById("1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI");
        var reqSheet = reqSs.getSheetByName("XIN_OFF");
        
        // Tạo sheet nếu chưa có
        if (!reqSheet) {
          reqSheet = reqSs.insertSheet("XIN_OFF");
        }
        
        // Tạo header nếu sheet trống
        if (reqSheet.getLastRow() === 0) {
          reqSheet.appendRow(["Dấu thời gian", "MÃ OPS", "HỌ VÀ TÊN ( viết in hoa )", "Số Điện Thoại", "XIN OFF/THẾ CA", "LÝ DO XIN OFF", "NGÀY XIN LÊN CA/XIN OFF", "GHI CHÚ"]);
        }
        
        reqSheet.appendRow([
          data.timestamp || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss"),
          data.empId || "",
          data.name || "",
          data.phone || "",
          data.type || "XIN OFF",
          data.reason || "",
          data.date || "",
          data.note || ""
        ]);
        
        // AUTO-UPDATE "XIN OFF" IN SHIFT SHEETS
        if (data.type === "XIN OFF") {
          var allSheets = reqSs.getSheets();
          var searchId = (data.empId || "").toString().toLowerCase().trim();
          var reqTime = data.timestamp || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
          
          for (var s = 0; s < allSheets.length; s++) {
            var sName = allSheets[s].getName();
            if (sName.indexOf("Ca_") === 0) {
              var dataRange = allSheets[s].getDataRange();
              var values = dataRange.getValues();
              if (values.length > 1) {
                var headers = values[0];
                var statusCol = headers.length - 2; // 1-based index (headers.length - 3 + 1)
                var timeCol = headers.length - 1;
                var phoneCol = headers.length;
                var noteCol = headers.length - 3; // 1-based index (headers.length - 4 + 1)
                
                for (var i = 1; i < values.length; i++) {
                  var empIdInSheet = (values[i][1] || "").toString().toLowerCase().trim();
                  var empStt = (values[i][0] || "").toString().toLowerCase().trim();
                  var empName = (values[i][2] || "").toString().toLowerCase().trim();
                  
                  if (empIdInSheet === searchId || empStt === searchId || empName === searchId) {
                    var currentStatus = values[i][statusCol - 1]; // 0-based index
                    if (currentStatus !== "confirmed") {
                      allSheets[s].getRange(i + 1, statusCol).setValue("XIN OFF");
                      allSheets[s].getRange(i + 1, timeCol).setValue(reqTime);
                      if (data.reason) {
                        allSheets[s].getRange(i + 1, noteCol).setValue(data.reason);
                      }
                      if (data.phone) {
                        allSheets[s].getRange(i + 1, phoneCol).setValue(data.phone);
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        // AUTO-APPEND "XIN LÊN CA" TO TARGET SHIFT SHEET
        if (data.type === "XIN LÊN CA" && data.targetShift) {
          var targetSheet = reqSs.getSheetByName(data.targetShift);
          if (targetSheet) {
            var dataRange = targetSheet.getDataRange();
            var values = dataRange.getValues();
            if (values.length > 0) {
              var headers = values[0];
              var newRow = new Array(headers.length);
              for (var k = 0; k < newRow.length; k++) newRow[k] = "";
              
              newRow[0] = values.length; // STT
              newRow[1] = data.empId || "";
              newRow[2] = data.name || "";
              newRow[3] = "A-OS"; // Định danh mặc định
              
              var noteIndex = headers.length - 4; // 0-based
              var statusIndex = headers.length - 3; // 0-based
              var timeIndex = headers.length - 2; // 0-based
              var phoneIndex = headers.length - 1; // 0-based
              
              if (noteIndex >= 4) {
                newRow[noteIndex] = data.note || data.reason || "";
                newRow[statusIndex] = "XIN LÊN CA";
                newRow[timeIndex] = data.timestamp || Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
                newRow[phoneIndex] = data.phone || "";
              }
              
              targetSheet.appendRow(newRow);
            }
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Gửi yêu cầu thành công" })).setMimeType(ContentService.MimeType.JSON);
      } catch(reqErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Lỗi ghi trang tính yêu cầu: " + reqErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // ACTION: CHECKIN (Nhân viên điểm danh)
    if (action === "checkin") {
      var searchId = (data.empId || "").toString().toLowerCase().trim();
      var phone = data.phone || "";
      
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0];
      var N = headers.length - 8; // Số cột vị trí động
      
      var empIndex = -1;
      // Duyệt qua các dòng để tìm kiếm thông minh
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
        return ContentService.createTextOutput(JSON.stringify({ error: "Không tìm thấy mã nhân viên " + data.empId + " trong ca này." })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var statusIndex = 4 + N + 1; // Trạng Thái
      var timeIndex = 4 + N + 2;  // Thời Gian
      var phoneIndex = 4 + N + 3; // SĐT
      
      var currentStatus = values[empIndex][statusIndex];
      if (currentStatus === "confirmed") {
        return ContentService.createTextOutput(JSON.stringify({ error: "Nhân viên này đã điểm danh rồi!" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Lấy ngày giờ hiện tại theo múi giờ Việt Nam
      var now = new Date();
      var timeString = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm:ss");
      
      // Ghi kết quả điểm danh vào sheet
      sheet.getRange(empIndex + 1, statusIndex + 1).setValue("confirmed");
      sheet.getRange(empIndex + 1, timeIndex + 1).setValue(timeString);
      sheet.getRange(empIndex + 1, phoneIndex + 1).setValue(phone);
      
      // Lấy thông tin đầy đủ để trả về frontend
      var rowData = sheet.getRange(empIndex + 1, 1, 1, headers.length).getValues()[0];
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
        status: rowData[4 + N + 1],
        timestamp: rowData[4 + N + 2],
        phone: rowData[4 + N + 3]
      };
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, employee: empObj })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: "Invalid POST action" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Server Error: " + e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm xử lý GET requests (Tải lịch làm việc)
function doGet(e) {
  try {
    var action = e.parameter.action;
    var shiftId = e.parameter.shiftId;
    
    if (action === "load" && shiftId) {
      var sheetName = "Ca_" + shiftId.replace(":", "").replace("-", "_");
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
      }
      
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var headers = values[0] || [];
      var N = headers.length - 8; // Số cột vị trí động
      
      if (values.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
      }
      
      var result = [];
      for (var i = 1; i < values.length; i++) {
        var r = values[i];
        if (r[0] === "" && r[1] === "" && r[2] === "") continue;
        
        var positions = [];
        for (var j = 0; j < N; j++) {
          positions.push(r[4 + j] || "");
        }
        
        result.push({
          stt: r[0] || "",
          id: r[1] || "",
          name: r[2] || "",
          dinhDanh: r[3] || "",
          positions: positions,
          note: r[4 + N] || "",
          status: r[4 + N + 1] || "pending",
          timestamp: r[4 + N + 2] || "",
          phone: r[4 + N + 3] || ""
        });
      }
      
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "load_requests") {
      try {
        var reqSs = SpreadsheetApp.openById("1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI");
        var reqSheet = reqSs.getSheetByName("XIN_OFF");
        
        if (!reqSheet || reqSheet.getLastRow() <= 1) {
          return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
        }
        var values = reqSheet.getDataRange().getValues();
        var result = [];
        for (var i = 1; i < values.length; i++) {
          var r = values[i];
          result.push({
            ts: r[0],
            empId: (r[1] || "").toString().toLowerCase().trim(),
            name: r[2],
            phone: r[3],
            type: r[4],
            reason: r[5],
            date: r[6],
            note: r[7]
          });
        }
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Pre-flight check (CORS ping)
    return ContentService.createTextOutput(JSON.stringify({ status: "AGR API is running" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Server Error: " + e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

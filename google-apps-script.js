/**
 * AGR - HỆ THỐNG ĐIỂM DANH - BACKEND (Google Apps Script)
 * Dán toàn bộ mã này vào Google Apps Script của bạn.
 */

// ==========================================
// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
var CONFIG = {
  SPREADSHEET_ID: "1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI",
  TIMEZONE: "Asia/Ho_Chi_Minh"
};

// HELPER: Lấy hoặc tạo sheet CONFIG
// ==========================================
function getConfigSheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("CONFIG");
  if (!sheet) {
    sheet = ss.insertSheet("CONFIG");
    sheet.appendRow(["Key", "Value"]);
  }
  return sheet;
}

// Hàm xử lý POST requests (Lưu lịch, Cập nhật điểm danh)
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ error: "No post data" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var shiftId = data.shiftId;
    
    // Auth Check for Admin Actions
    var adminActions = ["save_reg_config", "reset_registrations", "sync_roster", "get_change_requests", "approve_change_request", "reject_change_request", "get_booking", "get_admin_logs"];
    if (adminActions.indexOf(action) !== -1) {
      if (!verifyAdminToken(data.adminToken)) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized. Vui lòng đăng nhập lại." })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "submit_change_request" && adminActions.indexOf(action) === -1 && action !== "admin_login") {
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing shiftId" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheetName, sheet;
    if (shiftId && action !== "submit_registration") {
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
        var reqSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var reqSheet = reqSs.getSheetByName("XIN_OFF");
        
        // Tạo sheet nếu chưa có
        if (!reqSheet) {
          reqSheet = reqSs.insertSheet("XIN_OFF");
        }
        
        // Tạo header nếu sheet trống
        if (reqSheet.getLastRow() === 0) {
          reqSheet.appendRow(["Dấu thời gian", "MÃ OPS", "HỌ VÀ TÊN ( viết in hoa )", "Số Điện Thoại", "XIN OFF/THẾ CA", "LÝ DO XIN OFF", "NGÀY XIN LÊN CA/XIN OFF", "GHI CHÚ"]);
        }
        
        var reqType = data.type || "XIN OFF";
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
        }
        
        reqSheet.appendRow([
          data.timestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
          data.empId || "",
          data.name || "",
          data.phone || "",
          data.type || "XIN OFF",
          data.reason || "",
          data.date || "",
          data.note || "",
          data.targetShift || "" // Lưu ca đích để autoGenerateRoster biết
        ]);
        
        // AUTO-UPDATE "XIN OFF" IN SHIFT SHEETS
        if (data.type === "XIN OFF") {
          var allSheets = reqSs.getSheets();
          var searchId = (data.empId || "").toString().toLowerCase().trim();
          var reqTime = data.timestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
          
          for (var s = 0; s < allSheets.length; s++) {
            var sName = allSheets[s].getName();
            var isTargetMatch = true;
            if (data.targetShift && data.targetShift !== "ALL") {
               var expectedSheetName = "Ca_" + data.targetShift.replace(":", "").replace("-", "_");
               if (sName !== expectedSheetName) {
                  isTargetMatch = false;
               }
            }
            if (sName.indexOf("Ca_") === 0 && isTargetMatch) {
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
          var targetSheetName = "Ca_" + data.targetShift.replace(":", "").replace("-", "_");
          var targetSheet = reqSs.getSheetByName(targetSheetName);
          if (targetSheet) {
            var dataRange = targetSheet.getDataRange();
            var values = dataRange.getValues();
            if (values.length > 0) {
              var headers = values[0];
              var searchId = (data.empId || "").toString().toLowerCase().trim();
              var foundIndex = -1;
              
              for (var r = 1; r < values.length; r++) {
                var rId = (values[r][1] || "").toString().toLowerCase().trim();
                var rStt = (values[r][0] || "").toString().toLowerCase().trim();
                var rName = (values[r][2] || "").toString().toLowerCase().trim();
                if (rId === searchId || rStt === searchId || rName === searchId) {
                  foundIndex = r;
                  break;
                }
              }
              
              var noteIndex = headers.length - 4; // 0-based
              var statusIndex = headers.length - 3; // 0-based
              var timeIndex = headers.length - 2; // 0-based
              var phoneIndex = headers.length - 1; // 0-based
              var reqTime = data.timestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
              
              if (foundIndex > -1) {
                // Update existing row
                if (statusIndex >= 0) {
                  var currentStatus = values[foundIndex][statusIndex];
                  if (currentStatus !== "confirmed") {
                    targetSheet.getRange(foundIndex + 1, statusIndex + 1).setValue("pending");
                    targetSheet.getRange(foundIndex + 1, timeIndex + 1).setValue(reqTime);
                    if (data.note || data.reason) {
                      targetSheet.getRange(foundIndex + 1, noteIndex + 1).setValue(data.note || data.reason);
                    }
                    if (data.phone) {
                      targetSheet.getRange(foundIndex + 1, phoneIndex + 1).setValue(data.phone);
                    }
                  }
                }
              } else {
                // Append new row
                var newRow = new Array(headers.length);
                for (var k = 0; k < newRow.length; k++) newRow[k] = "";
                
                newRow[0] = values.length; // STT
                newRow[1] = data.empId || "";
                newRow[2] = data.name || "";
                newRow[3] = "A-OS"; // Định danh mặc định
                
                for (var p = 4; p < noteIndex; p++) {
                  newRow[p] = "Chưa sắp lịch";
                }
                
                if (noteIndex >= 4) {
                  newRow[noteIndex] = data.note || data.reason || "";
                  newRow[statusIndex] = "pending";
                  newRow[timeIndex] = reqTime;
                  newRow[phoneIndex] = data.phone || "";
                }
                targetSheet.appendRow(newRow);
              }
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
    }
    
    // ACTION: SUBMIT_REGISTRATION (Đăng ký lịch làm việc)
    if (action === "submit_registration") {
      var lock = LockService.getScriptLock();
      try {
        // Khóa để tránh race condition khi 2 người gửi cùng lúc
        lock.waitLock(30000);
        
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        
        // Trích xuất Tháng từ ngày đầu tiên trong mảng selections
        var month = "X";
        var startDayStr = "01";
        var endDayStr = "31";
        if (data.selections && data.selections.length > 0) {
          var firstDateLabel = data.selections[0].label;
          var lastDateLabel = data.selections[data.selections.length - 1].label;
          
          var matchFirst = firstDateLabel.match(/(\d{2})\/(\d{2})\/\d{4}/);
          var matchLast = lastDateLabel.match(/(\d{2})\/(\d{2})\/\d{4}/);
          
          if (matchFirst && matchFirst[1] && matchFirst[2] && matchLast && matchLast[1]) {
            month = parseInt(matchFirst[2], 10).toString();
            startDayStr = matchFirst[1];
            endDayStr = matchLast[1];
          }
        }
        var dateSuffix = startDayStr + endDayStr;
        
        var searchId = (data.empId || "").toLowerCase().trim();
        
        // Thu thập danh sách các ca đã đăng ký
        var allSheets = regSs.getSheets();
        var userRegisteredShifts = [];
        var sheetPrefix = "T" + month + "_";
        var currentPeriodSuffix = "_" + dateSuffix;
        
        for (var s = 0; s < allSheets.length; s++) {
          var sName = allSheets[s].getName();
          if (sName.indexOf(sheetPrefix) === 0 && sName.endsWith(currentPeriodSuffix)) {
            var shiftName = sName.substring(sheetPrefix.length, sName.length - currentPeriodSuffix.length);
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
        
        if (data.shiftId === "CA_NGAY") {
          var subShifts = [
            { id: "06:00-15:00", label: "Ca OS Sáng" },
            { id: "06:00-10:00", label: "Ca Sáng" },
            { id: "15:00-22:00", label: "Ca Chiều" }
          ];
          
          for (var k = 0; k < subShifts.length; k++) {
            var subShift = subShifts[k];
            var reqShift = subShift.id;
            
            if (userRegisteredShifts.indexOf(reqShift) !== -1) {
              continue; // Bỏ qua nếu đã đăng ký ca này rồi
            }
            
            var subSelections = (data.selections || []).map(function(sel) {
              return {
                date: sel.date,
                label: sel.label,
                choice: (sel.choice === subShift.id) ? "WORK" : "OFF"
              };
            });
            
            var regSheetName = "T" + month + "_" + subShift.id + "_" + dateSuffix;
            var regSheet = regSs.getSheetByName(regSheetName);
            
            if (!regSheet) {
              regSheet = regSs.insertSheet(regSheetName);
              var headerRow = ["Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT", "Giới tính OS", "Ca", "Tên Ca"];
              subSelections.forEach(function(sel) { headerRow.push(sel.label); });
              regSheet.appendRow(headerRow);
            } else if (regSheet.getLastRow() === 0) {
              var headerRow = ["Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT", "Giới tính OS", "Ca", "Tên Ca"];
              subSelections.forEach(function(sel) { headerRow.push(sel.label); });
              regSheet.appendRow(headerRow);
            }
            
            var newRow = [
              Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
              data.empId || "",
              data.empName || "",
              data.empPhone || "",
              data.osGender || "",
              subShift.id,
              subShift.label
            ];
            subSelections.forEach(function(sel) { newRow.push(sel.choice); });
            regSheet.appendRow(newRow);
          }
          
                    // Update status in ChangeRequests sheet
          var crSheet = regSs.getSheetByName("ChangeRequests");
          if (crSheet && data.reqId) {
            var crVals = crSheet.getDataRange().getValues();
            for (var c = 1; c < crVals.length; c++) {
              if (crVals[c][0] === data.reqId) {
                crSheet.getRange(c + 1, 6).setValue("approved");
                break;
              }
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        } else {
          var reqShift = data.shiftId || "";
          
          if (userRegisteredShifts.indexOf(reqShift) !== -1) {
            return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã đăng ký ca " + reqShift + " trong kỳ này rồi, không được đăng ký lại!" })).setMimeType(ContentService.MimeType.JSON);
          }
          
          var regSheetName = "T" + month + "_" + (data.shiftId || "UNKNOWN") + "_" + dateSuffix;
          var regSheet = regSs.getSheetByName(regSheetName);
          
          if (!regSheet) {
            regSheet = regSs.insertSheet(regSheetName);
            var headerRow = ["Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT", "Giới tính OS", "Ca", "Tên Ca"];
            (data.selections || []).forEach(function(sel) { headerRow.push(sel.label); });
            regSheet.appendRow(headerRow);
          } else if (regSheet.getLastRow() === 0) {
            var headerRow = ["Dấu thời gian", "Mã NV", "Họ và Tên", "Số ĐT", "Giới tính OS", "Ca", "Tên Ca"];
            (data.selections || []).forEach(function(sel) { headerRow.push(sel.label); });
            regSheet.appendRow(headerRow);
          }
          
          var newRow = [
            Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
            data.empId || "",
            data.empName || "",
            data.empPhone || "",
            data.osGender || "",
            data.shiftId || "",
            data.shiftLabel || ""
          ];
          (data.selections || []).forEach(function(sel) { newRow.push(sel.choice); });
          regSheet.appendRow(newRow);
          
                    // Update status in ChangeRequests sheet
          var crSheet = regSs.getSheetByName("ChangeRequests");
          if (crSheet && data.reqId) {
            var crVals = crSheet.getDataRange().getValues();
            for (var c = 1; c < crVals.length; c++) {
              if (crVals[c][0] === data.reqId) {
                crSheet.getRange(c + 1, 6).setValue("approved");
                break;
              }
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      } catch(regErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: regErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }

    // ACTION: RESET_REGISTRATIONS (Xóa tất cả các sheet lịch đăng ký cũ)
    
    
    // ACTION: SUBMIT_CHANGE_REQUEST
    if (action === "submit_change_request") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (!crSheet) {
          crSheet = regSs.insertSheet("ChangeRequests");
          crSheet.appendRow(["ID", "EmpID", "EmpName", "ShiftID", "Selections", "Status", "Timestamp"]);
        }
        var reqId = "CR_" + new Date().getTime() + "_" + Math.floor(Math.random()*1000);
        crSheet.appendRow([
          reqId,
          data.empId,
          data.empName,
          data.shiftId,
          JSON.stringify(data.selections || []),
          "pending",
          new Date().toISOString()
        ]);
        return sendJsonResponse({ status: "success", reqId: reqId });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      } finally {
        lock.releaseLock();
      }
    }


    // ACTION: REJECT_CHANGE_REQUEST
    if (action === "reject_change_request") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(10000);
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (crSheet && data.reqId) {
          var crVals = crSheet.getDataRange().getValues();
          for (var c = 1; c < crVals.length; c++) {
            if (crVals[c][0] === data.reqId) {
              crSheet.getRange(c + 1, 6).setValue("rejected");
              break;
            }
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ error: e.toString() })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }

    // ACTION: GET_BOOKING
    if (action === "get_booking") {
      try {
        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var bookingSheet = ss.getSheetByName("SOC_South");
        if (!bookingSheet) return sendJsonResponse({ status: "success", data: [] });
        
        var dataRange = bookingSheet.getDataRange().getValues();
        var bookings = [];
        
        // Skip header row (row 0)
        for (var i = 1; i < dataRange.length; i++) {
          var row = dataRange[i];
          // Check if row is empty by checking if Ticket Number (col 1) is empty
          if (!row[1] && !row[2]) continue;
          
          var dateVal = row[2]; // Ngày fulfill
          if (dateVal instanceof Date) {
            // Formatting JS Date to YYYY-MM-DD
            var y = dateVal.getFullYear();
            var m = ("0" + (dateVal.getMonth() + 1)).slice(-2);
            var d = ("0" + dateVal.getDate()).slice(-2);
            dateVal = y + "-" + m + "-" + d;
          } else {
            dateVal = dateVal.toString();
          }
          
          bookings.push({
            commit: row[0],
            ticket: row[1],
            date: dateVal,
            region: row[3],
            department: row[4],
            socName: row[5],
            area: row[6],
            shift: row[7],
            vendor: row[8],
            totalReq: row[9],
            totalKpi: row[10],
            latestCommit: row[11]
          });
        }
        return sendJsonResponse({ status: "success", data: bookings });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      }
    }

    // ACTION: GET_ADMIN_LOGS
    if (action === "get_admin_logs") {
      try {
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var logSheet = regSs.getSheetByName("AdminLogs");
        if (!logSheet) return sendJsonResponse({ status: "success", data: [] });
        
        var dataRange = logSheet.getDataRange().getValues();
        var logs = [];
        // Lấy 100 dòng gần nhất
        var limit = Math.min(dataRange.length, 101); 
        for (var i = 1; i < limit; i++) {
          logs.push({
            timestamp: dataRange[i][0],
            user: dataRange[i][1],
            sheetName: dataRange[i][2],
            cell: dataRange[i][3],
            oldVal: dataRange[i][4],
            newVal: dataRange[i][5]
          });
        }
        return sendJsonResponse({ status: "success", data: logs });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      }
    }

    // ACTION: GET_CHANGE_REQUESTS
    if (action === "get_change_requests") {
      try {
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var crSheet = regSs.getSheetByName("ChangeRequests");
        if (!crSheet) return sendJsonResponse({ status: "success", data: [] });
        var dataRange = crSheet.getDataRange().getValues();
        var requests = [];
        for (var i = 1; i < dataRange.length; i++) {
          if (dataRange[i][5] === "pending") {
            requests.push({
              id: dataRange[i][0],
              empId: dataRange[i][1],
              empName: dataRange[i][2],
              shiftId: dataRange[i][3],
              selections: JSON.parse(dataRange[i][4] || "[]"),
              status: dataRange[i][5],
              timestamp: dataRange[i][6]
            });
          }
        }
        return sendJsonResponse({ status: "success", data: requests });
      } catch (e) {
        return sendJsonResponse({ status: "error", message: e.toString() });
      }
    }

    // ACTION: APPROVE_CHANGE_REQUEST (Duyệt thay đổi lịch)
    if (action === "approve_change_request") {
      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(30000);
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var month = "X";
        var startDayStr = "01";
        var endDayStr = "31";
        if (data.selections && data.selections.length > 0) {
          var firstDateLabel = data.selections[0].label;
          var lastDateLabel = data.selections[data.selections.length - 1].label;
          
          var matchFirst = firstDateLabel.match(/(\d{2})\/(\d{2})\/\d{4}/);
          var matchLast = lastDateLabel.match(/(\d{2})\/(\d{2})\/\d{4}/);
          
          if (matchFirst && matchFirst[1] && matchFirst[2] && matchLast && matchLast[1]) {
            month = parseInt(matchFirst[2], 10).toString();
            startDayStr = matchFirst[1];
            endDayStr = matchLast[1];
          }
        }
        var dateSuffix = startDayStr + endDayStr;
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
            var regSheetName = "T" + month + "_" + subShift.id + "_" + dateSuffix;
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
                    // Update status in ChangeRequests sheet
          var crSheet = regSs.getSheetByName("ChangeRequests");
          if (crSheet && data.reqId) {
            var crVals = crSheet.getDataRange().getValues();
            for (var c = 1; c < crVals.length; c++) {
              if (crVals[c][0] === data.reqId) {
                crSheet.getRange(c + 1, 6).setValue("approved");
                break;
              }
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        } else {
          var reqShift = data.shiftId || "";
          var regSheetName = "T" + month + "_" + reqShift + "_" + dateSuffix;
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
                    // Update status in ChangeRequests sheet
          var crSheet = regSs.getSheetByName("ChangeRequests");
          if (crSheet && data.reqId) {
            var crVals = crSheet.getDataRange().getValues();
            for (var c = 1; c < crVals.length; c++) {
              if (crVals[c][0] === data.reqId) {
                crSheet.getRange(c + 1, 6).setValue("approved");
                break;
              }
            }
          }
          return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
        }
      } catch(err) {
        return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }

    if (action === "reset_registrations") {
      try {
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var allSheets = regSs.getSheets();
        var deletedCount = 0;
        
        for (var s = 0; s < allSheets.length; s++) {
          var sheet = allSheets[s];
          var sName = sheet.getName();
          // Chỉ xóa các sheet có tên bắt đầu bằng LỊCHT, T[tháng]_ hoặc DangKyLich
          if (sName.match(/^T\d+_/) || sName.indexOf("LỊCHT") === 0 || sName === "DangKyLich") {
            // Đảm bảo không xóa sheet cuối cùng của file
            if (regSs.getSheets().length > 1) {
              regSs.deleteSheet(sheet);
              deletedCount++;
            }
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã xóa " + deletedCount + " bảng lịch cũ" })).setMimeType(ContentService.MimeType.JSON);
      } catch(resErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: resErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ACTION: SAVE_REG_CONFIG (Lưu cấu hình ngày đăng ký lịch)
    if (action === "save_reg_config") {
      try {
        var configSheet = getConfigSheet();
        
        var configData = configSheet.getDataRange().getValues();
        var fromFound = false, toFound = false;
        
        for (var i = 1; i < configData.length; i++) {
          if (configData[i][0] === "reg_date_from") {
            if (data.regDateFrom) {
              var parts = data.regDateFrom.split("-");
              var dFrom = new Date(parts[0], parts[1] - 1, parts[2]);
              configSheet.getRange(i + 1, 2).setValue(dFrom);
            } else {
              configSheet.getRange(i + 1, 2).setValue("");
            }
            fromFound = true;
          }
          if (configData[i][0] === "reg_date_to") {
            if (data.regDateTo) {
              var parts = data.regDateTo.split("-");
              var dTo = new Date(parts[0], parts[1] - 1, parts[2]);
              configSheet.getRange(i + 1, 2).setValue(dTo);
            } else {
              configSheet.getRange(i + 1, 2).setValue("");
            }
            toFound = true;
          }
        }
        
        if (!fromFound) {
          if (data.regDateFrom) {
            var parts = data.regDateFrom.split("-");
            var dFrom = new Date(parts[0], parts[1] - 1, parts[2]);
            configSheet.appendRow(["reg_date_from", dFrom]);
          } else {
            configSheet.appendRow(["reg_date_from", ""]);
          }
        }
        if (!toFound) {
          if (data.regDateTo) {
            var parts = data.regDateTo.split("-");
            var dTo = new Date(parts[0], parts[1] - 1, parts[2]);
            configSheet.appendRow(["reg_date_to", dTo]);
          } else {
            configSheet.appendRow(["reg_date_to", ""]);
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã lưu cấu hình đăng ký" })).setMimeType(ContentService.MimeType.JSON);
      } catch(cfgErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Lỗi lưu cấu hình: " + cfgErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ACTION: ADMIN LOGIN (Xác thực Quản trị viên)
    if (action === "admin_login") {
      var email = (data.email || "").toLowerCase().trim();
      var password = data.password || "";
      
      var admins = {
        "tainguyenhr.dev@gmail.com": "016850@admin",
        "ptbt472@gmail.com": "Tran90111@admin1"
      };
      
      if (admins[email] && admins[email] === password) {
        var token = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email + "hr-secret-salt-2026", Utilities.Charset.UTF_8));
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đăng nhập thành công", token: token })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ error: "Email hoặc mật khẩu không đúng" })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    function verifyAdminToken(token) {
      if (!token) return false;
      var adminEmails = ["tainguyenhr.dev@gmail.com", "ptbt472@gmail.com"];
      for (var i = 0; i < adminEmails.length; i++) {
        var expected = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, adminEmails[i] + "hr-secret-salt-2026", Utilities.Charset.UTF_8));
        if (token === expected) return true;
      }
      return false;
    }

    if (action === "sync_roster") {
      try {
        var targetShifts = data.shiftId ? [data.shiftId] : null;
        autoGenerateRoster(targetShifts);
        autoSyncPositions(targetShifts);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã đồng bộ lịch và vị trí thành công!" })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Lỗi đồng bộ: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    // Pre-flight check (CORS ping)
    return ContentService.createTextOutput(JSON.stringify({ status: "AGR API is running" })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ error: "Server Error: " + e.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Hàm xử lý GET requests (Tải lịch làm việc)
function doGet(e) {
  try {
    var action = e.parameter.action;
    var shiftId = e.parameter.shiftId;
    
    // Auth Check for Admin Actions in GET
    if (action === "get_shift_registrations") {
      if (!verifyAdminToken(e.parameter.adminToken)) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    
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
        var reqSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
    
    if (action === "get_registration") {
      try {
        var empIdSearch = (e.parameter.empId || "").toLowerCase().trim();
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var allSheets = regSs.getSheets();
        var result = [];
        
        // Quét tất cả các sheet bắt đầu bằng "T[tháng]_", "LỊCHT" hoặc "DangKyLich"
        for (var s = 0; s < allSheets.length; s++) {
          var sheet = allSheets[s];
          var sName = sheet.getName();
          
          if (sName.match(/^T\d+_/) || sName.indexOf("LỊCHT") === 0 || sName === "DangKyLich") {
            if (sheet.getLastRow() <= 1) continue;
            var vals = sheet.getDataRange().getValues();
            var headers = vals[0];
            
            for (var ri = 1; ri < vals.length; ri++) {
              var rowId = (vals[ri][1] || "").toString().toLowerCase().trim();
              if (rowId !== empIdSearch) continue;
              
              var selections = [];
              for (var ci = 7; ci < headers.length; ci++) {
                selections.push({ label: headers[ci], choice: vals[ri][ci] || "OFF" });
              }
              
              result.push({
                empId: vals[ri][1],
                empName: vals[ri][2],
                shiftId: vals[ri][5],
                shiftLabel: vals[ri][6],
                selections: selections,
                timestamp: vals[ri][0]
              });
            }
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      } catch(getRegErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: getRegErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === "get_reg_config") {
      try {
        var configSheet = getConfigSheet();
        
        var configData = configSheet.getDataRange().getValues();
        var result = { regDateFrom: "", regDateTo: "" };
        
        for (var i = 1; i < configData.length; i++) {
          var val = configData[i][1];
          var strVal = "";
          if (val) {
            if (val instanceof Date) {
              strVal = Utilities.formatDate(val, CONFIG.TIMEZONE, "yyyy-MM-dd");
            } else {
              strVal = val.toString();
            }
          }
          if (configData[i][0] === "reg_date_from") result.regDateFrom = strVal;
          if (configData[i][0] === "reg_date_to") result.regDateTo = strVal;
        }
        
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      } catch(cfgErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: cfgErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    }

    if (action === "get_shift_registrations") {
      try {
        var shiftSearch = e.parameter.shiftId; 
        if (!shiftSearch) return ContentService.createTextOutput(JSON.stringify({ error: "Missing shiftId" })).setMimeType(ContentService.MimeType.JSON);
        
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var allSheets = regSs.getSheets();
        var periods = [];
        
        for (var s = 0; s < allSheets.length; s++) {
          var sheet = allSheets[s];
          var sName = sheet.getName();
          
          if (sName.match(/^T\d+_/)) {
            var parts = sName.split("_");
            if (parts.length >= 3) {
              var sMonth = parts[0].replace("T", "");
              var dateSuffix = parts[parts.length - 1];
              var sShiftId = parts.slice(1, parts.length - 1).join("_");
              
              if (sShiftId === shiftSearch) {
                var startD = dateSuffix.substring(0, 2);
                var endD = dateSuffix.substring(2, 4);
                var periodName = "Tháng " + sMonth + " (" + startD + " - " + endD + ")";
                
                var vals = sheet.getDataRange().getValues();
                var headersList = vals.length > 0 ? vals[0] : [];
                var result = [];
                for (var ri = 1; ri < vals.length; ri++) {
                  var r = vals[ri];
                  result.push({
                    timestamp: r[0],
                    empId: r[1],
                    name: r[2],
                    phone: r[3],
                    choices: r.slice(6)
                  });
                }
                periods.push({
                  id: sName,
                  name: periodName,
                  headers: headersList.slice(6),
                  data: result
                });
              }
            }
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ periods: periods })).setMimeType(ContentService.MimeType.JSON);
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

// ==========================================
// TỰ ĐỘNG HÓA 00:00 (Auto-Scheduler)
// Chạy hàm này qua Trigger vào 00:00 - 01:00 hàng ngày
// ==========================================
function autoGenerateRoster(targetShifts) {
  if (!targetShifts) targetShifts = ["06:00-15:00", "06:00-10:00", "15:00-22:00", "18:00-22:00", "22:00-06:00"];
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  
  var todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy");
  
  for (var k = 0; k < targetShifts.length; k++) {
    var shiftId = targetShifts[k];
    
    // Tìm sheet chứa shiftId và có cột ngày hôm nay
    var allSheets = ss.getSheets();
    var regSheet = null;
    var regData = null;
    var todayColIndex = -1;
    
    for (var s = 0; s < allSheets.length; s++) {
      var sName = allSheets[s].getName();
      if ((sName.match(/^T\d+_/) || sName.indexOf("LỊCH") === 0) && sName.indexOf(shiftId) !== -1) {
        var tempSheet = allSheets[s];
        var tempRegData = tempSheet.getDataRange().getValues();
        if (tempRegData.length > 0) {
          var headers = tempRegData[0];
          for (var i = 0; i < headers.length; i++) {
            if (headers[i].toString().indexOf(todayStr) !== -1) {
              regSheet = tempSheet;
              regData = tempRegData;
              todayColIndex = i;
              break;
            }
          }
        }
        if (regSheet) break;
      }
    }
    
    if (!regSheet || todayColIndex === -1 || regData.length <= 1) continue;
    
    var workersForToday = [];
    for (var r = 1; r < regData.length; r++) {
      var row = regData[r];
      if (row[todayColIndex] === "WORK") {
        workersForToday.push({
          empId: row[1] || "",
          name: row[2] || "",
          phone: row[3] || ""
        });
      }
    }
    
    var destSheetName = "Ca_" + shiftId.replace(":", "").replace("-", "_");
    var destSheet = ss.getSheetByName(destSheetName);
    
    if (!destSheet) {
      destSheet = ss.insertSheet(destSheetName);
      destSheet.appendRow(["STT", "Mã NV", "Họ Tên", "Định Danh", "Ghi Chú", "Trạng Thái", "Thời Gian", "SDT"]);
    }
    
    var currentDestData = destSheet.getDataRange().getValues();
    var destHeaders = currentDestData[0] || ["STT", "Mã NV", "Họ Tên", "Định Danh", "Ghi Chú", "Trạng Thái", "Thời Gian", "SDT"];
    
    destSheet.clear();
    destSheet.appendRow(destHeaders);
    
    var N = destHeaders.length - 8;
    if (N < 0) N = 0;
    
    var rowsToWrite = [];
    var empIndexMap = {};
    for (var w = 0; w < workersForToday.length; w++) {
      var worker = workersForToday[w];
      var newRow = [
        w + 1,
        worker.empId,
        worker.name,
        "" // Định Danh
      ];
      
      for (var pos = 0; pos < N; pos++) {
        newRow.push("");
      }
      
      newRow.push(""); // Ghi chú
      newRow.push("pending"); // Trạng Thái
      newRow.push(""); // Thời gian
      newRow.push(worker.phone); // SDT
      
      rowsToWrite.push(newRow);
      empIndexMap[worker.empId.toString().toLowerCase().trim()] = rowsToWrite.length - 1;
    }
    
    // Đọc XIN_OFF để áp dụng các đơn của NGÀY HÔM NAY
    var reqSheet = ss.getSheetByName("XIN_OFF");
    if (reqSheet && reqSheet.getLastRow() > 1) {
      var reqData = reqSheet.getDataRange().getValues();
      for (var r = 1; r < reqData.length; r++) {
        var rowType = (reqData[r][4] || "").toString().trim();
        var rowDate = (reqData[r][6] || "").toString().trim();
        var rowTargetShift = (reqData[r][8] || "").toString().trim(); // Cột I chứa targetShift
        
        if (rowDate === todayStr) {
          var rEmpId = (reqData[r][1] || "").toString().toLowerCase().trim();
          var rReason = (reqData[r][5] || "") + " " + (reqData[r][7] || "");
          var rPhone = reqData[r][3] || "";
          var rTime = reqData[r][0] || "";
          
          if (rowType === "XIN OFF") {
            // Xin Off: nếu có targetShift thì phải khớp, không thì áp dụng hết
            var applyOff = true;
            if (rowTargetShift && rowTargetShift !== "ALL" && rowTargetShift !== shiftId) {
              applyOff = false;
            }
            if (applyOff && empIndexMap.hasOwnProperty(rEmpId)) {
              var tIdx = empIndexMap[rEmpId];
              rowsToWrite[tIdx][4 + N + 1] = "XIN OFF"; // Trạng Thái
              rowsToWrite[tIdx][4 + N + 2] = rTime; // Thời gian
              rowsToWrite[tIdx][4 + N] = rReason.trim(); // Ghi chú
              if (rPhone) rowsToWrite[tIdx][4 + N + 3] = rPhone;
            }
          } else if (rowType === "XIN LÊN CA") {
            // Xin Lên Ca: chỉ áp dụng nếu đúng ca đích
            if (rowTargetShift === shiftId) {
              if (empIndexMap.hasOwnProperty(rEmpId)) {
                // Đã có trong lịch, update status nếu cần
                var tIdx = empIndexMap[rEmpId];
                rowsToWrite[tIdx][4 + N] = rReason.trim();
              } else {
                // Thêm người mới vào cuối danh sách
                var rName = reqData[r][2] || "";
                var newRow = [
                  rowsToWrite.length + 1,
                  rEmpId,
                  rName,
                  "A-OS" // Định danh
                ];
                for (var pos = 0; pos < N; pos++) {
                  newRow.push("");
                }
                newRow.push(rReason.trim()); // Ghi chú
                newRow.push("pending"); // Trạng Thái
                newRow.push(rTime); // Thời gian
                newRow.push(rPhone); // SDT
                
                rowsToWrite.push(newRow);
                empIndexMap[rEmpId] = rowsToWrite.length - 1;
              }
            }
          }
        }
      }
    }
    
    if (rowsToWrite.length > 0) {
      destSheet.getRange(2, 1, rowsToWrite.length, rowsToWrite[0].length).setValues(rowsToWrite);
    }
  }
}

// ==========================================
// TỰ ĐỘNG HÓA 06:00 (Auto-Sync Positions)
// Chạy hàm này qua Trigger vào 06:00 - 07:00 hàng ngày
// ==========================================
function autoSyncPositions(targetShifts) {
    if (!targetShifts) targetShifts = ["18:00-22:00", "22:00-06:00"];
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var vitriSheet = ss.getSheetByName("Sheet_ViTri");
    if (!vitriSheet) return;
    
    var vitriData = vitriSheet.getDataRange().getValues();
    
    // Khai báo giới hạn dòng cho từng ca
    var rowMapping = {
      "06:00-15:00": { start: 22, end: 72 },
      "06:00-10:00": { start: 76, end: 117 },
      "15:00-22:00": { start: 149, end: 200 },
      "18:00-22:00": { start: 203, end: 258 },
      "22:00-06:00": { start: 296, end: 430 }
    };
    
    for (var k = 0; k < targetShifts.length; k++) {
      var shiftId = targetShifts[k];
      
      // Tạo từ điển vị trí (posDict) DÀNH RIÊNG cho ca này dựa trên số dòng đã cấp
      var posDict = {};
      var mapping = rowMapping[shiftId];
      if (mapping) {
        // Trừ 1 vì index trong mảng bắt đầu từ 0
        var startIdx = mapping.start - 1;
        var endIdx = mapping.end - 1;
        
        for (var r = startIdx; r <= endIdx && r < vitriData.length; r++) {
          var empId = (vitriData[r][1] || "").toString().toLowerCase().trim();
          if (!empId) continue;
          
          var positions = [];
          // Vị trí nằm ở cột E đến J (tức là index 4 đến 9)
          for (var c = 4; c <= 9; c++) {
            positions.push(vitriData[r][c] || "");
          }
          posDict[empId] = positions;
        }
      } else {
        // Nếu không có thông số dòng thì bỏ qua ca này
        continue;
      }
      
      var destSheetName = "Ca_" + shiftId.replace(":", "").replace("-", "_");
      var destSheet = ss.getSheetByName(destSheetName);
      
      if (!destSheet) continue;
      
      var destData = destSheet.getDataRange().getValues();
      if (destData.length <= 1) continue;
      
      var destHeaders = destData[0];
      var N = destHeaders.length - 8;
      if (N < 0) N = 0;
      
      var updatedRows = [];
      for (var r = 1; r < destData.length; r++) {
        var row = destData[r];
        var empId = (row[1] || "").toString().toLowerCase().trim();
        
        if (posDict[empId]) {
          for (var p = 0; p < Math.min(N, posDict[empId].length); p++) {
            row[4 + p] = posDict[empId][p];
          }
        }
        updatedRows.push(row);
      }
      
      if (updatedRows.length > 0) {
        destSheet.getRange(2, 1, updatedRows.length, destHeaders.length).setValues(updatedRows);
      }
    }
}


// ==========================================
// ==========================================
// CÁC HÀM GỌI TRIGGER THEO TỪNG CA
// ==========================================
// Nhóm Ca Sáng (06:00-15:00 và 06:00-10:00)
function trigger_Generate_CaSang() { autoGenerateRoster(["06:00-15:00", "06:00-10:00"]); }
function trigger_Sync_CaSang() { autoSyncPositions(["06:00-15:00", "06:00-10:00"]); }

// Nhóm Ca Chiều (15:00-22:00)
function trigger_Generate_CaChieu() { autoGenerateRoster(["15:00-22:00"]); }
function trigger_Sync_CaChieu() { autoSyncPositions(["15:00-22:00"]); }

// Nhóm Ca Tối (18:00-22:00)
function trigger_Generate_CaToi() { autoGenerateRoster(["18:00-22:00"]); }
function trigger_Sync_CaToi() { autoSyncPositions(["18:00-22:00"]); }

// Nhóm Ca Đêm (22:00-06:00)
function trigger_Generate_CaDem() { autoGenerateRoster(["22:00-06:00"]); }
function trigger_Sync_CaDem() { autoSyncPositions(["22:00-06:00"]); }

// ==========================================
// HÀM TẠO TRIGGER TỰ ĐỘNG (CHỈ CẦN CHẠY 1 LẦN)
// ==========================================
function setupAutoTriggers() {
  var existingTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existingTriggers.length; i++) {
    ScriptApp.deleteTrigger(existingTriggers[i]);
  }
  
  // 1. Ca Sáng (6h-15h & 6h-10h): Chốt 06:15 hôm trước, Cập nhật vị trí 15:00
  ScriptApp.newTrigger("trigger_Generate_CaSang").timeBased().atHour(6).nearMinute(15).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaSang").timeBased().atHour(15).nearMinute(0).everyDays(1).create();

  // 2. Ca Chiều (15h-22h): Chốt 15:00 hôm trước, Cập nhật vị trí 20:00
  ScriptApp.newTrigger("trigger_Generate_CaChieu").timeBased().atHour(15).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaChieu").timeBased().atHour(20).nearMinute(0).everyDays(1).create();

  // 3. Ca Tối (18h-22h): Chốt 18:00 hôm trước, Cập nhật vị trí 22:00
  ScriptApp.newTrigger("trigger_Generate_CaToi").timeBased().atHour(18).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaToi").timeBased().atHour(22).nearMinute(0).everyDays(1).create();

  // 4. Ca Đêm (22h-06h): Chốt 22:00 hôm trước, Cập nhật vị trí 06:00 sáng hôm sau
  ScriptApp.newTrigger("trigger_Generate_CaDem").timeBased().atHour(22).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger("trigger_Sync_CaDem").timeBased().atHour(6).nearMinute(0).everyDays(1).create();
}


function sendJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// T�NH NANG THEO D�I CH?NH S?A L?CH C?A ADMIN (ONEDIT)
// ==========================================
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  var sheetName = sheet.getName();
  
  // Ch? ghi nh?n n?u s?a tr�n c�c sheet L?ch L�m Vi?c
  if (sheetName.match(/^T\d+_/) || sheetName.indexOf("L?CHT") === 0 || sheetName.indexOf("Ca_") === 0 || sheetName.indexOf("DangKyLich") === 0) {
    try {
      var ss = e.source;
      var logSheet = ss.getSheetByName("AdminLogs");
      if (!logSheet) {
        logSheet = ss.insertSheet("AdminLogs");
        logSheet.appendRow(["Th?i Gian", "Ngu?i S?a", "T�n Sheet", "V? Tr� (�)", "D? Li?u Cu", "D? Li?u M?i"]);
        logSheet.getRange("A1:F1").setFontWeight("bold").setBackground("#d9ead3");
        logSheet.setFrozenRows(1);
      }
      
      var timestamp = new Date().toISOString();
      var user = e.user ? e.user.getEmail() : "Admin/User Khuy?t Danh";
      if (!user || user === "") user = "Admin/User Khuy?t Danh";
      var cell = e.range.getA1Notation();
      var oldVal = e.oldValue !== undefined ? e.oldValue : "(Tr?ng)";
      var newVal = e.value !== undefined ? e.value : "(X�a)";
      
      // Ch�n l�n d?u danh s�ch log (d�ng 2)
      logSheet.insertRowAfter(1);
      logSheet.getRange(2, 1, 1, 6).setValues([[
        timestamp,
        user,
        sheetName,
        cell,
        oldVal,
        newVal
      ]]);
      
    } catch(err) {
      // B? qua n?u c� l?i ghi log
    }
  }
}

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
    
    if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "reset_registrations" && action !== "admin_login" && action !== "save_reg_config" && action !== "sync_roster" && action !== "get_daily_booking") {
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
        }
        
        reqSheet.appendRow([
          data.timestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss"),
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
        if (data.selections && data.selections.length > 0) {
          var firstDateLabel = data.selections[0].label; // VD: "19/06/2026 (Thứ Sáu)"
          var match = firstDateLabel.match(/\d{2}\/(\d{2})\/\d{4}/);
          if (match && match[1]) {
            month = parseInt(match[1], 10).toString(); // "06" -> "6"
          }
        }
        
        // Tên sheet động: LỊCHT6_22:00-06:00
        var regSheetName = "LỊCHT" + month + "_" + (data.shiftId || "UNKNOWN");
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
        
        var searchId = (data.empId || "").toLowerCase().trim();
        
        // Kiểm tra xem đã đăng ký ca nào trong cùng kỳ (tháng) chưa
        var allSheets = regSs.getSheets();
        var alreadyRegisteredShift = "";
        
        for (var s = 0; s < allSheets.length; s++) {
          var sName = allSheets[s].getName();
          if (sName.indexOf("LỊCHT" + month + "_") === 0) {
            var sData = allSheets[s].getDataRange().getValues();
            for (var r = 1; r < sData.length; r++) {
              var rId = (sData[r][1] || "").toString().toLowerCase().trim();
              if (rId === searchId) {
                alreadyRegisteredShift = sName.replace("LỊCHT" + month + "_", "");
                break;
              }
            }
          }
          if (alreadyRegisteredShift) break;
        }
        
        if (alreadyRegisteredShift) {
          return ContentService.createTextOutput(JSON.stringify({ error: "Bạn đã đăng ký lịch làm việc rồi, vui lòng chờ kỳ lịch mới rồi tiếp tục!" })).setMimeType(ContentService.MimeType.JSON);
        }
        
        // Append new row
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
        
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      } catch(regErr) {
        return ContentService.createTextOutput(JSON.stringify({ error: regErr.toString() })).setMimeType(ContentService.MimeType.JSON);
      } finally {
        lock.releaseLock();
      }
    }

    // ACTION: RESET_REGISTRATIONS (Xóa tất cả các sheet lịch đăng ký cũ)
    if (action === "reset_registrations") {
      try {
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var allSheets = regSs.getSheets();
        var deletedCount = 0;
        
        for (var s = 0; s < allSheets.length; s++) {
          var sheet = allSheets[s];
          var sName = sheet.getName();
          // Chỉ xóa các sheet có tên bắt đầu bằng LỊCHT hoặc DangKyLich
          if (sName.indexOf("LỊCHT") === 0 || sName === "DangKyLich") {
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
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đăng nhập thành công" })).setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ error: "Email hoặc mật khẩu không đúng" })).setMimeType(ContentService.MimeType.JSON);
      }
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

    if (action === "get_daily_booking") {
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
                     formattedShift = formattedShift.substring(0, 2) + ":" + formattedShift.substring(2, 4) + "-" + formattedShift.substring(5, 7) + ":" + formattedShift.substring(7);
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
        
        // Quét tất cả các sheet bắt đầu bằng "LỊCHT" hoặc "DangKyLich"
        for (var s = 0; s < allSheets.length; s++) {
          var sheet = allSheets[s];
          var sName = sheet.getName();
          
          if (sName.indexOf("LỊCHT") === 0 || sName === "DangKyLich") {
            if (sheet.getLastRow() <= 1) continue;
            var vals = sheet.getDataRange().getValues();
            var headers = vals[0];
            
            for (var ri = 1; ri < vals.length; ri++) {
              var rowId = (vals[ri][1] || "").toString().toLowerCase().trim();
              if (rowId !== empIdSearch) continue;
              
              var selections = [];
              for (var ci = 6; ci < headers.length; ci++) {
                selections.push({ label: headers[ci], choice: vals[ri][ci] || "OFF" });
              }
              
              result.push({
                empId: vals[ri][1],
                empName: vals[ri][2],
                shiftId: vals[ri][4],
                shiftLabel: vals[ri][5],
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
          
          if (sName.indexOf("LỊCH") === 0) {
            var parts = sName.split("_");
            if (parts.length >= 2) {
              var sShiftId = parts.slice(1).join("_");
              if (sShiftId === shiftSearch) {
                var periodMatch = sName.match(/LỊCHT(\w+)_/);
                var periodName = periodMatch ? ("Kỳ " + periodMatch[1]) : sName;
                
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
function autoGenerateRoster() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  
  var todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy");
  
  for (var k = 0; k < targetShifts.length; k++) {
    var shiftId = targetShifts[k];
    
    // Tìm sheet DANG_KY_LICH chứa shiftId
    var allSheets = ss.getSheets();
    var regSheet = null;
    for (var s = 0; s < allSheets.length; s++) {
      var sName = allSheets[s].getName();
      if (sName.indexOf("LỊCH") === 0 && sName.indexOf(shiftId) !== -1) {
        regSheet = allSheets[s];
        break;
      }
    }
    
    if (!regSheet) continue;
    
    var regData = regSheet.getDataRange().getValues();
    if (regData.length <= 1) continue;
    
    var headers = regData[0];
    var todayColIndex = -1;
    for (var i = 0; i < headers.length; i++) {
      if (headers[i].toString().indexOf(todayStr) !== -1) {
        todayColIndex = i;
        break;
      }
    }
    
    if (todayColIndex === -1) continue;
    
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
  
  var posDict = {};
  for (var r = 1; r < vitriData.length; r++) {
    var empId = (vitriData[r][1] || "").toString().toLowerCase().trim();
    if (!empId) continue;
    
    var positions = [];
    // Vị trí nằm ở cột E đến J (tức là index 4 đến 9)
    for (var c = 4; c <= 9; c++) {
      positions.push(vitriData[r][c] || "");
    }
    posDict[empId] = positions;
  }
  
  
  for (var k = 0; k < targetShifts.length; k++) {
    var shiftId = targetShifts[k];
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

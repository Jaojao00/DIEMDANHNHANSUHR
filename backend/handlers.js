/**
 * Module: Handlers
 * Chứa logic xử lý của từng action.
 */

function handleSave(data, shiftId, sheet) {

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

function handleRequest(data, shiftId, sheet) {

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

function handleGetChangeRequests(data, shiftId, sheet) {

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

function handleApproveChangeRequest(data, shiftId, sheet) {

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

function handleRejectChangeRequest(data, shiftId, sheet) {

      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(30000);
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

function handleGetBooking(data, shiftId, sheet) {

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

function handleGetAdminLogs(data, shiftId, sheet) {

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

function handleCheckin(data, shiftId, sheet) {

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    
    if (values.length <= 1) {
      return sendErrorResponse("Chưa có danh sách nhân sự cho ca này");
    }
    
    var headers = values[0];
    var statusIndex = headers.length - 3; // "Trạng Thái"
    var timeIndex = headers.length - 2;   // "Thời Gian"
    
    try {
      var searchId = sanitizeEmployeeId(data.empId);
    } catch (e) {
      return sendErrorResponse(e.message);
    }
    
    // Tối ưu: Dùng Map thay vì For Loop
    var empIndexMap = buildEmployeeIndex(values, 1);
    var empIndex = empIndexMap[searchId];
    
    if (empIndex === undefined) {
      return sendErrorResponse("Không tìm thấy Mã Nhân Viên trong danh sách ca này");
    }
    
    // Kiểm tra lại trạng thái NGAY SAU khi lấy lock để ngăn chặn race condition
    if (values[empIndex][statusIndex] === "confirmed") {
      return sendErrorResponse("Nhân viên này đã điểm danh rồi!");
    }
    
    // Cập nhật trạng thái
    values[empIndex][statusIndex] = "confirmed";
    values[empIndex][timeIndex] = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "HH:mm:ss");
    
    // Tối ưu: Batch update một lần duy nhất
    dataRange.setValues(values);
    
    return sendSuccessResponse({ 
      status: "confirmed",
      time: values[empIndex][timeIndex],
      name: values[empIndex][2]
    });
    
  } catch (e) {
    return sendErrorResponse("Lỗi hệ thống hoặc Server quá tải. Vui lòng thử lại: " + e.message);
  } finally {
    lock.releaseLock();
  }
}

function handleSubmitRegistration(data, shiftId, sheet) {

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

function handleSubmitChangeRequest(data, shiftId, sheet) {

      var lock = LockService.getScriptLock();
      try {
        lock.waitLock(30000);
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

function handleSaveRegConfig(data, shiftId, sheet) {

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

function handleResetRegistrations(data, shiftId, sheet) {

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

function handleSyncRoster(data, shiftId, sheet) {

      try {
        var targetShifts = data.shiftId ? [data.shiftId] : null;
        autoGenerateRoster(targetShifts);
        autoSyncPositions(targetShifts);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Đã đồng bộ lịch và vị trí thành công!" })).setMimeType(ContentService.MimeType.JSON);
      } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ error: "Lỗi đồng bộ: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
      }
    
}
function handleAdminLogin(data) {
  var email = (data.email || "").toLowerCase().trim();
  var pass = data.pass || data.password || "";
  
  var scriptProperties = PropertiesService.getScriptProperties();
  var adminsStr = scriptProperties.getProperty("ADMIN_CREDS");
  
  if (!adminsStr) {
    return sendErrorResponse("Hệ thống chưa được thiết lập tài khoản Admin. Vui lòng chạy setupInitialAdminConfig().");
  }
  
  var admins = JSON.parse(adminsStr);
  
  if (admins[email] && admins[email] === pass) {
    var token = generateAdminToken(email);
    return sendSuccessResponse({ token: token }, "Đăng nhập thành công");
  }
  
  return sendErrorResponse("Email hoặc mật khẩu không đúng!");
}

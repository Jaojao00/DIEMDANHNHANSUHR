
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return sendErrorResponse("No post data");
    }
    
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var shiftId = data.shiftId;
    
    // Auth Check for Admin Actions
    var adminActions = ["save_reg_config", "reset_registrations", "sync_roster", "get_change_requests", "approve_change_request", "reject_change_request", "get_booking", "get_admin_logs"];
    if (adminActions.indexOf(action) !== -1) {
      if (!verifyAdminToken(data.adminToken)) {
        return sendErrorResponse("Unauthorized. Vui lòng đăng nhập lại.", 401);
      }
    }
    
    if (!shiftId && action !== "request" && action !== "submit_registration" && action !== "submit_change_request" && adminActions.indexOf(action) === -1 && action !== "admin_login") {
      return sendErrorResponse("Missing shiftId");
    }
    
    var sheetName, sheet;
    if (shiftId && action !== "submit_registration") {
      sheetName = "Ca_" + shiftId.replace(":", "").replace("-", "_");
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }
    }

    // Routing
    switch (action) {
      case "save": return handleSave(data, shiftId, sheet);
      case "request": return handleRequest(data, shiftId, sheet);
      case "get_change_requests": return handleGetChangeRequests(data, shiftId, sheet);
      case "approve_change_request": return handleApproveChangeRequest(data, shiftId, sheet);
      case "reject_change_request": return handleRejectChangeRequest(data, shiftId, sheet);
      case "get_booking": return handleGetBooking(data, shiftId, sheet);
      case "get_admin_logs": return handleGetAdminLogs(data, shiftId, sheet);
      case "checkin": return handleCheckin(data, shiftId, sheet);
      case "submit_registration": return handleSubmitRegistration(data, shiftId, sheet);
      case "submit_change_request": return handleSubmitChangeRequest(data, shiftId, sheet);
      case "save_reg_config": return handleSaveRegConfig(data, shiftId, sheet);
      case "reset_registrations": return handleResetRegistrations(data, shiftId, sheet);
      case "sync_roster": return handleSyncRoster(data, shiftId, sheet);
      case "admin_login": return handleAdminLogin(data);
      default: return sendErrorResponse("Invalid action");
    }
  } catch (err) {
    return sendErrorResponse("Internal Server Error: " + err.message, 500);
  }
}


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
          if (sName.indexOf("Ca_") === 0 || sName === "CONFIG" || sName === "AdminLogs" || sName === "ChangeRequests") continue;
          
          var vals = sheet.getDataRange().getValues();
          if (vals.length === 0) continue;
          var headersList = vals[0];
          
          if (headersList.length >= 7 && (headersList[5] === "Ca" || headersList[5] === "Shift") && (headersList[1] === "Mã NV" || headersList[1] === "MÃ NV" || headersList[1] === "M NV")) {
            var sShiftId = "";
            if (vals.length > 1 && vals[1][5]) {
               sShiftId = vals[1][5];
            } else {
               var nm = sName.toLowerCase();
               if (nm.indexOf("os s") > -1) sShiftId = "06:00-15:00";
               else if (nm.indexOf("sáng") > -1 || nm.indexOf("sng") > -1) sShiftId = "06:00-10:00";
               else if (nm.indexOf("chiều") > -1 || nm.indexOf("chi?u") > -1) sShiftId = "15:00-22:00";
               else if (nm.indexOf("tối") > -1 || nm.indexOf("t?i") > -1) sShiftId = "18:00-22:00";
               else if (nm.indexOf("đêm") > -1 || nm.indexOf("dm") > -1) sShiftId = "22:00-06:00";
            }
            
            if (sShiftId === shiftSearch) {
                var periodName = sName;
                for (var hi = 0; hi < headersList.length; hi++) {
                  if (Object.prototype.toString.call(headersList[hi]) === '[object Date]') {
                    headersList[hi] = Utilities.formatDate(headersList[hi], CONFIG.TIMEZONE, 'dd/MM/yyyy');
                  } else if (headersList[hi]) {
                    headersList[hi] = headersList[hi].toString();
                  }
                }
                var result = [];
                for (var ri = 1; ri < vals.length; ri++) {
                  var r = vals[ri];
                  result.push({
                    timestamp: r[0],
                    empId: r[1],
                    name: r[2],
                    phone: r[3],
                    choices: r.slice(7)
                  });
                }
                periods.push({
                  id: sName,
                  name: periodName,
                  headers: headersList.slice(7),
                  data: result
                });
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





function normalizeOpsId(id) {
  if (!id) return "";
  var s = id.toString().trim().replace(/\s+/g, "");
  s = s.replace(/^0[pP][sS]/i, "OPS");
  s = s.replace(/^(OÓP|ÓPS|ÓP|ÔPS|OÔP|OOP)/i, "OPS");
  return s.toUpperCase();
}

function isValidOpsId(id) {
  if (!id) return false;
  var s = normalizeOpsId(id);
  return /^OPS\d{4,6}$/.test(s);
}

/**
 * Module: Handlers
 * Chứa logic xử lý của từng action.
 */

function handleSave(data, shiftId, sheet) {
  // Read existing data to preserve check-in status
  var existingMap = {};
  if (sheet.getLastRow() > 1) {
    var fullData = sheet.getDataRange().getValues();
    var existingHeaders = fullData[0];
    var idIndex = existingHeaders.indexOf("Mã NV");
    var statusIndex = existingHeaders.indexOf("Trạng Thái");
    var timeIndex = existingHeaders.indexOf("Thời Gian");
    var noteIndex = existingHeaders.indexOf("Ghi Chú");
    var phoneIndex = existingHeaders.indexOf("SĐT");
    
    if (idIndex !== -1) {
      for (var r = 1; r < fullData.length; r++) {
        var rowData = fullData[r];
        var idStr = String(rowData[idIndex]).trim().toLowerCase();
        if (idStr) {
           existingMap[idStr] = {
             status: statusIndex !== -1 ? (rowData[statusIndex] || "") : "",
             time: timeIndex !== -1 ? (rowData[timeIndex] || "") : "",
             note: noteIndex !== -1 ? (rowData[noteIndex] || "") : "",
             phone: phoneIndex !== -1 ? (rowData[phoneIndex] || "") : ""
           };
        }
      }
    }
  }

  sheet.clear();
  var scheduleList = data.schedule || data.roster || [];
  var colHeaders = data.headers || [];
  if ((!colHeaders || colHeaders.length === 0) && scheduleList.length > 0) {
    if (scheduleList[0].positions && typeof scheduleList[0].positions === "object" && !Array.isArray(scheduleList[0].positions)) {
      colHeaders = Object.keys(scheduleList[0].positions);
    } else {
      colHeaders = ["Vị trí cố định", "SAU GIỜ NGHỈ", "4h-6h", "Xuất Tải"];
    }
  }

  var headers = ["STT", "Mã NV", "Họ Tên", "Định Danh"].concat(colHeaders).concat(["Ghi Chú", "Trạng Thái", "Thời Gian", "SĐT"]);
  sheet.appendRow(headers);
  
  var rows = [];
  for (var i = 0; i < scheduleList.length; i++) {
    var emp = scheduleList[i];
    var row = [
      emp.stt || (i + 1),
      emp.id || "",
      emp.name || "",
      emp.dinhDanh || emp.identity || ""
    ];
    
    var positions = emp.positions || {};
    for (var j = 0; j < colHeaders.length; j++) {
      var hKey = colHeaders[j];
      var pVal = Array.isArray(positions) ? (positions[j] || "") : (positions[hKey] || "");
      row.push(pVal);
    }
    
    var idKey = String(emp.id || "").trim().toLowerCase();
    var existing = existingMap[idKey];
    
    var finalStatus = emp.status || "pending";
    var finalTime = emp.timestamp || emp.checkinTime || "";
    var finalNote = emp.note || "";
    var finalPhone = emp.phone || "";
    
    if (!data.forceRosterStatus && existing && existing.status && String(existing.status).toLowerCase() !== "pending" && String(existing.status).trim() !== "") {
       finalStatus = existing.status;
       finalTime = existing.time || finalTime;
       finalNote = existing.note || finalNote;
       finalPhone = existing.phone || finalPhone;
    }
    
    row.push(finalNote);
    row.push(finalStatus);
    row.push(finalTime);
    row.push(finalPhone);
    
    rows.push(row);
  }
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
  
  return sendSuccessResponse({ count: rows.length }, "Lưu lịch thành công và giữ lại điểm danh cũ");
}

function handleLoadRoster(shiftId, returnPlainArray) {
  if (!shiftId) {
    return sendErrorResponse("Missing shiftId");
  }
  var sheetName = "Ca_" + shiftId.replace(":", "").replace("-", "_");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return returnPlainArray ? ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON) : sendSuccessResponse([]);
  }
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length <= 1) {
    return returnPlainArray ? ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON) : sendSuccessResponse([]);
  }
  var headers = values[0] || [];
  var totalCols = headers.length;

  var statusIndex = -1;
  var timeIndex = -1;
  var phoneIndex = -1;
  var noteIndex = -1;

  for (var h = 0; h < totalCols; h++) {
    var hStr = String(headers[h] || "").trim().toLowerCase();
    if (hStr === "trạng thái" || hStr === "status") statusIndex = h;
    else if (hStr === "thời gian" || hStr === "timestamp" || hStr === "giờ điểm danh") timeIndex = h;
    else if (hStr === "sđt" || hStr === "sdt" || hStr === "số đt" || hStr === "phone") phoneIndex = h;
    else if (hStr === "ghi chú" || hStr === "note") noteIndex = h;
  }

  // Fallback to standard 4 tail columns if not found by name
  if (phoneIndex === -1 && totalCols >= 4) phoneIndex = totalCols - 1;
  if (timeIndex === -1 && totalCols >= 4) timeIndex = totalCols - 2;
  if (statusIndex === -1 && totalCols >= 4) statusIndex = totalCols - 3;
  if (noteIndex === -1 && totalCols >= 4) noteIndex = totalCols - 4;

  var firstTail = noteIndex !== -1 ? noteIndex : (statusIndex !== -1 ? statusIndex : totalCols - 4);
  var N = firstTail > 4 ? firstTail - 4 : 0;

  var colHeaders = [];
  for (var c = 0; c < N; c++) {
    colHeaders.push(headers[4 + c] || ("Vị trí " + (c + 1)));
  }

  var result = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (r[0] === "" && r[1] === "" && r[2] === "") continue;
    var posObj = {};
    var posArr = [];
    for (var j = 0; j < N; j++) {
      var pVal = r[4 + j] || "";
      posArr.push(pVal);
      posObj[colHeaders[j]] = pVal;
    }

    var rawStatus = (statusIndex >= 0 && statusIndex < r.length && r[statusIndex]) ? String(r[statusIndex]).trim().toLowerCase() : "pending";
    if (!rawStatus) rawStatus = "pending";

    var timeVal = (timeIndex >= 0 && timeIndex < r.length && r[timeIndex]) ? r[timeIndex] : "";
    if (timeVal instanceof Date) {
      timeVal = Utilities.formatDate(timeVal, CONFIG.TIMEZONE, "HH:mm:ss");
    } else if (typeof timeVal === "string" && timeVal.indexOf("1899-12-30T") !== -1) {
      try {
        var d = new Date(timeVal);
        timeVal = Utilities.formatDate(d, CONFIG.TIMEZONE, "HH:mm:ss");
      } catch (e) {}
    }

    result.push({
      stt: r[0] || "",
      id: r[1] || "",
      name: r[2] || "",
      dinhDanh: r[3] || "",
      identity: r[3] || "",
      positions: posObj,
      positionList: posArr,
      note: (noteIndex >= 0 && noteIndex < r.length) ? (r[noteIndex] || "") : "",
      status: rawStatus,
      timestamp: timeVal,
      phone: (phoneIndex >= 0 && phoneIndex < r.length) ? (r[phoneIndex] || "") : ""
    });
  }
  if (returnPlainArray) {
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return sendSuccessResponse(result);
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
      reqSheet.appendRow(["Dấu thời gian", "MÃ OPS", "HỌ VÀ TÊN ( viết in hoa )", "Số Điện Thoại", "XIN OFF/THẾ CA", "LÝ DO XIN OFF", "NGÀY XIN LÊN CA/XIN OFF", "GHI CHÚ", "CA ĐÍCH"]);
    }
    
    var rawType = (data.type || "").toString().toUpperCase().replace(/_/g, " ").trim();
    var reqType = "XIN OFF";
    if (rawType.indexOf("LEN") !== -1 || rawType.indexOf("LÊN") !== -1) {
      reqType = "XIN LÊN CA";
    }
    
    var reqEmpId = normalizeOpsId(data.empId);
    if (!isValidOpsId(reqEmpId)) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Mã OPS không hợp lệ (" + reqEmpId + ")! Mã bắt buộc phải bắt đầu bằng OPS kèm 4 đến 6 chữ số phía sau (Ví dụ: OPS170621 hoặc Ops170621)."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    reqEmpId = reqEmpId.toUpperCase();
    data.empId = reqEmpId;
    var reqEmpName = (data.empName || data.name || "").toString().trim().toUpperCase();
    var reqPhone = (data.phone || "").toString().trim();
    var reqReason = (data.reason || "").toString().trim();
    var reqNote = (data.note || "").toString().trim();
    var reqTargetShift = (data.targetShift || data.shift || shiftId || "").toString().trim();
    var reqDate = (data.date || "").toString().trim();
    var reqTimestamp = data.timestamp || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");

    // Chuẩn hóa ngày để so sánh trùng: "2026-10-15" vs "15/10/2026"
    function normDate(d) {
      if (!d) return "";
      if (d instanceof Date) {
        return Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyy-MM-dd");
      }
      var s = d.toString().trim();
      var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m) {
        return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
      }
      return s;
    }
    var compReqDate = normDate(reqDate);

    // Kiểm tra trùng đơn
    if (reqSheet.getLastRow() > 1) {
      var reqData = reqSheet.getDataRange().getValues();
      for (var i = 1; i < reqData.length; i++) {
        var rowId = (reqData[i][1] || "").toString().toUpperCase().trim();
        var rowRawType = (reqData[i][4] || "").toString().toUpperCase().replace(/_/g, " ").trim();
        var rowType = (rowRawType.indexOf("LEN") !== -1 || rowRawType.indexOf("LÊN") !== -1) ? "XIN LÊN CA" : "XIN OFF";
        var rowDate = normDate(reqData[i][6]);
        var rowTargetShift = (reqData[i][8] || "").toString().trim();

        if (rowId === reqEmpId && rowType === reqType && rowDate === compReqDate) {
          if (reqType === "XIN LÊN CA") {
            if (rowTargetShift === reqTargetShift) {
              return sendErrorResponse("Bạn đã đăng ký " + reqType + " cho ca này vào ngày " + reqDate + " thành công rồi, vui lòng không gửi lại!");
            }
          } else {
            if (!rowTargetShift || !reqTargetShift || rowTargetShift === reqTargetShift) {
              return sendErrorResponse("Bạn đã gửi đơn " + reqType + (reqTargetShift ? (" cho ca " + reqTargetShift) : "") + " vào ngày " + reqDate + " rồi, vui lòng không gửi lại!");
            }
          }
        }
      }
    }

    // Thêm bản ghi vào sheet XIN_OFF
    reqSheet.appendRow([
      reqTimestamp,
      reqEmpId,
      reqEmpName,
      reqPhone,
      reqType,
      reqReason,
      reqDate,
      reqNote,
      reqTargetShift
    ]);

    // 1. TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI "OFF" TRONG SHEET CA LÀM VIỆC (NẾU XIN OFF)
    if (reqType === "XIN OFF") {
      var allSheets = reqSs.getSheets();
      var searchId = reqEmpId.toLowerCase();

      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName();
        var isTargetMatch = true;
        if (reqTargetShift && reqTargetShift !== "ALL") {
          var cleanTarget = reqTargetShift.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          var cleanSheet = sName.replace(/^Ca_/i, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          if (cleanSheet !== cleanTarget) {
            isTargetMatch = false;
          }
        }
        if (sName.indexOf("Ca_") === 0 && isTargetMatch) {
          var dataRange = allSheets[s].getDataRange();
          var values = dataRange.getValues();
          if (values.length > 1) {
            var headers = values[0];
            var statusCol = headers.indexOf("Trạng Thái") !== -1 ? headers.indexOf("Trạng Thái") + 1 : headers.length - 2;
            var timeCol = headers.indexOf("Thời Gian") !== -1 ? headers.indexOf("Thời Gian") + 1 : headers.length - 1;
            var phoneCol = headers.indexOf("SĐT") !== -1 ? headers.indexOf("SĐT") + 1 : headers.length;
            var noteCol = headers.indexOf("Ghi Chú") !== -1 ? headers.indexOf("Ghi Chú") + 1 : headers.length - 3;

            var hasUpdate = false;
            for (var r = 1; r < values.length; r++) {
              var empIdInSheet = (values[r][1] || "").toString().toLowerCase().trim();
              var empNameInSheet = (values[r][2] || "").toString().toLowerCase().trim();

              if (empIdInSheet === searchId || (empNameInSheet && empNameInSheet === reqEmpName.toLowerCase())) {
                var currentStatus = (values[r][statusCol - 1] || "").toString().toLowerCase();
                if (currentStatus !== "confirmed") {
                  values[r][statusCol - 1] = "off";
                  values[r][timeCol - 1] = reqTimestamp;
                  if (reqReason) values[r][noteCol - 1] = reqReason;
                  if (reqPhone) values[r][phoneCol - 1] = reqPhone;
                  hasUpdate = true;
                }
              }
            }
            if (hasUpdate) {
              dataRange.setValues(values);
            }
          }
        }
      }
    }

    // 2. TỰ ĐỘNG THÊM VÀO SHEET CA ĐÍCH (NẾU XIN LÊN CA)
    if (reqType === "XIN LÊN CA" && reqTargetShift) {
      var cleanTarget = reqTargetShift.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      var targetSheet = null;
      var allSheetsForLen = reqSs.getSheets();
      for (var ts = 0; ts < allSheetsForLen.length; ts++) {
        var tsName = allSheetsForLen[ts].getName();
        if (tsName.indexOf("Ca_") === 0 && tsName.replace(/^Ca_/i, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() === cleanTarget) {
          targetSheet = allSheetsForLen[ts];
          break;
        }
      }
      if (!targetSheet) {
        targetSheet = reqSs.getSheetByName("Ca_" + reqTargetShift.replace(":", "").replace("-", "_"));
      }
      if (targetSheet) {
        var tDataRange = targetSheet.getDataRange();
        var tValues = tDataRange.getValues();
        if (tValues.length > 0) {
          var tHeaders = tValues[0];
          var searchTId = reqEmpId.toLowerCase();
          var foundIndex = -1;

          for (var tr = 1; tr < tValues.length; tr++) {
            var trId = (tValues[tr][1] || "").toString().toLowerCase().trim();
            var trName = (tValues[tr][2] || "").toString().toLowerCase().trim();
            if (trId === searchTId || (trName && trName === reqEmpName.toLowerCase())) {
              foundIndex = tr;
              break;
            }
          }

          var tNoteIndex = tHeaders.indexOf("Ghi Chú") !== -1 ? tHeaders.indexOf("Ghi Chú") : tHeaders.length - 4;
          var tStatusIndex = tHeaders.indexOf("Trạng Thái") !== -1 ? tHeaders.indexOf("Trạng Thái") : tHeaders.length - 3;
          var tTimeIndex = tHeaders.indexOf("Thời Gian") !== -1 ? tHeaders.indexOf("Thời Gian") : tHeaders.length - 2;
          var tPhoneIndex = tHeaders.indexOf("SĐT") !== -1 ? tHeaders.indexOf("SĐT") : tHeaders.length - 1;

          if (foundIndex > -1) {
            if (tStatusIndex >= 0) {
              var curStatus = (tValues[foundIndex][tStatusIndex] || "").toString().toLowerCase();
              if (curStatus !== "confirmed") {
                targetSheet.getRange(foundIndex + 1, tStatusIndex + 1).setValue("pending");
                targetSheet.getRange(foundIndex + 1, tTimeIndex + 1).setValue(reqTimestamp);
                if (reqNote || reqReason) {
                  targetSheet.getRange(foundIndex + 1, tNoteIndex + 1).setValue(reqNote || reqReason);
                }
                if (reqPhone) {
                  targetSheet.getRange(foundIndex + 1, tPhoneIndex + 1).setValue(reqPhone);
                }
              }
            }
          } else {
            var newRow = new Array(tHeaders.length);
            for (var k = 0; k < newRow.length; k++) newRow[k] = "";

            newRow[0] = tValues.length; // STT
            newRow[1] = reqEmpId;
            newRow[2] = reqEmpName;
            newRow[3] = data.identity || "A-OS";

            for (var p = 4; p < tNoteIndex; p++) {
              newRow[p] = "Chưa xếp";
            }

            if (tNoteIndex >= 4) {
              newRow[tNoteIndex] = reqNote || reqReason || "Xin lên ca (A-OS)";
              newRow[tStatusIndex] = "pending";
              newRow[tTimeIndex] = reqTimestamp;
              newRow[tPhoneIndex] = reqPhone;
            }
            targetSheet.appendRow(newRow);
          }
        }
      }
    }

    return sendJsonResponse({ success: true, message: "Gửi yêu cầu " + reqType + " thành công" });
  } catch (reqErr) {
    return sendErrorResponse("Lỗi xử lý yêu cầu: " + reqErr.toString());
  }
}

function handleLoadRequests(data) {
  try {
    var reqSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var reqSheet = reqSs.getSheetByName("XIN_OFF");
    if (!reqSheet || reqSheet.getLastRow() <= 1) {
      return sendJsonResponse({ success: true, data: [] });
    }
    var values = reqSheet.getDataRange().getValues();
    var result = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var rawDate = r[6];
      var dateStr = "";
      if (rawDate instanceof Date) {
        dateStr = Utilities.formatDate(rawDate, CONFIG.TIMEZONE, "dd/MM/yyyy");
      } else {
        dateStr = (rawDate || "").toString().trim();
      }
      result.push({
        id: "REQ_" + i,
        ts: r[0] || "",
        empId: (r[1] || "").toString().toUpperCase().trim(),
        empName: r[2] || "",
        phone: r[3] || "",
        type: r[4] || "XIN OFF",
        reason: r[5] || "",
        date: dateStr,
        note: r[7] || "",
        shiftId: r[8] || "",
        status: "pending"
      });
    }
    return sendJsonResponse({ success: true, data: result.reverse() });
  } catch (err) {
    return sendErrorResponse("Lỗi tải danh sách yêu cầu: " + err.toString());
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
            { id: "06:00-11:00", label: "Ca Sáng" },
            { id: "13:00-22:00", label: "Ca Chiều" }
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
    var bookingSheet = null;
    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      if (allSheets[s].getSheetId() === 1670239083) {
        bookingSheet = allSheets[s];
        break;
      }
    }
    if (!bookingSheet) {
      bookingSheet = ss.getSheetByName("SOC_South") || ss.getSheetByName("Booking") || ss.getSheetByName("BOOKING_SOC");
    }
    if (!bookingSheet) return sendJsonResponse({ success: true, status: "success", data: [] });
    
    var dataRange = bookingSheet.getDataRange().getValues();
    var bookings = [];
    
    // Skip header row (row 0)
    for (var i = 1; i < dataRange.length; i++) {
      var row = dataRange[i];
      // Check if row is empty by checking if Ticket Number (col 1) is empty
      if (!row[1] && !row[2]) continue;
      
      var dateVal = row[2]; // Ngày fulfill
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, CONFIG.TIMEZONE, "yyyy-MM-dd");
      } else if (dateVal) {
        dateVal = dateVal.toString().trim();
      } else {
        dateVal = "";
      }
      
      var commitVal = row[0] || "";
      var ticketVal = row[1] || "";
      var totalReqVal = Number(row[9] || 0);
      var totalKpiVal = Number(row[10] || 0);
      var latestCommitVal = Number(row[11] || 0);
      var vendorCommitVal = latestCommitVal || (String(commitVal).toUpperCase() === "YES" ? totalReqVal : 0);
      
      bookings.push({
        id: ticketVal,
        commit: commitVal,
        ticket: ticketVal,
        date: dateVal,
        fulfillDate: dateVal,
        region: row[3] || "",
        department: row[4] || "",
        socName: row[5] || "",
        area: row[6] || "",
        shift: row[7] || "",
        vendor: row[8] || "",
        totalReq: totalReqVal,
        totalKpi: totalKpiVal,
        latestCommit: latestCommitVal,
        vendorCommit: vendorCommitVal
      });
    }
    return sendJsonResponse({ success: true, status: "success", data: bookings });
  } catch (e) {
    return sendJsonResponse({ success: false, status: "error", message: e.toString() });
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
    var statusIndex = headers.indexOf("Trạng Thái") !== -1 ? headers.indexOf("Trạng Thái") : headers.length - 3;
    var timeIndex = headers.indexOf("Thời Gian") !== -1 ? headers.indexOf("Thời Gian") : headers.length - 2;
    var phoneIndex = headers.indexOf("SĐT") !== -1 ? headers.indexOf("SĐT") : headers.length - 1;
    
    var rawInput = (data.empId || data.identifier || "").toString().trim();
    if (!rawInput) {
      return sendErrorResponse("Vui lòng cung cấp Mã Nhân Viên (Mã OPS)");
    }
    rawInput = normalizeOpsId(rawInput);
    if (!isValidOpsId(rawInput)) {
      return sendErrorResponse("Mã OPS không hợp lệ (" + rawInput + ")! Mã bắt buộc phải bắt đầu bằng OPS kèm 4 đến 6 chữ số phía sau (Ví dụ: OPS170621 hoặc Ops170621).");
    }
    rawInput = rawInput.toUpperCase();
    data.empId = rawInput;
    var searchId = rawInput.toLowerCase();
    
    var foundIndices = [];
    for (var i = 1; i < values.length; i++) {
      var id = (values[i][1] || "").toString().toLowerCase().trim();
      var stt = (values[i][0] || "").toString().toLowerCase().trim();
      var nameStr = (values[i][2] || "").toString().toLowerCase().trim();
      if (id === searchId || stt === searchId || nameStr === searchId) {
        foundIndices.push(i);
      }
    }
    
    if (foundIndices.length === 0) {
      return sendErrorResponse("Không tìm thấy Mã Nhân Viên trong danh sách ca này");
    }
    
    var forceMode = Boolean(data.forceStatus);
    var targetStatus = (data.forceStatus || "confirmed").toString().trim();
    var timeString = (targetStatus === "confirmed" || targetStatus === "xin_len_ca")
      ? Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "HH:mm:ss")
      : (data.timestamp || "");
    var updatedAny = false;
    
    for (var k = 0; k < foundIndices.length; k++) {
      var i = foundIndices[k];
      if (forceMode || values[i][statusIndex] !== "confirmed") {
        values[i][statusIndex] = targetStatus;
        values[i][timeIndex] = timeString;
        sheet.getRange(i + 1, statusIndex + 1, 1, 2).setValues([[targetStatus, timeString]]);
        if (data.phone && phoneIndex !== -1) {
          sheet.getRange(i + 1, phoneIndex + 1).setValue(data.phone);
        }
        updatedAny = true;
      }
    }
    
    if (!updatedAny && !forceMode) {
      return sendErrorResponse("Nhân viên này đã điểm danh rồi!");
    }
    
    var noteIndex = headers.indexOf("Ghi Chú");
    var N = noteIndex !== -1 ? noteIndex - 4 : headers.length - 8;
    var empPos = {};
    if (N > 0) {
      for (var p = 0; p < N; p++) {
        empPos[headers[4 + p] || ("Vị trí " + (p + 1))] = values[foundIndices[0]][4 + p] || "";
      }
    }

    return sendSuccessResponse({ 
      status: targetStatus,
      time: timeString,
      id: values[foundIndices[0]][1],
      name: values[foundIndices[0]][2],
      positions: empPos
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
        lock.waitLock(30000);
        
        var rawEmpId = normalizeOpsId(data.empId);
        if (!isValidOpsId(rawEmpId)) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: "Mã OPS không hợp lệ (" + rawEmpId + ")! Mã bắt buộc phải bắt đầu bằng OPS kèm 4 đến 6 chữ số phía sau (Ví dụ: OPS170621 hoặc Ops170621)."
          })).setMimeType(ContentService.MimeType.JSON);
        }
        data.empId = rawEmpId.toUpperCase();
        
        var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        
        if (typeof data.selections === "string") {
          try { data.selections = JSON.parse(data.selections); } catch(e) {}
        }
        if (!data.shiftId && data.shift) data.shiftId = data.shift;
        if (!data.empPhone && data.phone) data.empPhone = data.phone;
        if (!data.osGender) data.osGender = "OS NAM";

        // Trích xuất Tháng từ ngày đầu tiên trong mảng selections
        var month = "X";
        var startDayStr = "01";
        var endDayStr = "31";
        if (data.selections && data.selections.length > 0) {
          var firstDateLabel = (data.selections[0] && data.selections[0].label) ? data.selections[0].label : ((data.selections[0] && data.selections[0].date) || "");
          var lastDateLabel = (data.selections[data.selections.length - 1] && data.selections[data.selections.length - 1].label) ? data.selections[data.selections.length - 1].label : ((data.selections[data.selections.length - 1] && data.selections[data.selections.length - 1].date) || "");
          
          var matchFirst = firstDateLabel ? firstDateLabel.match(/(\d{2})\/(\d{2})\/\d{4}/) : null;
          var matchLast = lastDateLabel ? lastDateLabel.match(/(\d{2})\/(\d{2})\/\d{4}/) : null;

          if (!matchFirst && firstDateLabel) {
            var mIso1 = firstDateLabel.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (mIso1) matchFirst = [null, mIso1[3], mIso1[2]];
          }
          if (!matchLast && lastDateLabel) {
            var mIso2 = lastDateLabel.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (mIso2) matchLast = [null, mIso2[3], mIso2[2]];
          }
          
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
            { id: "06:00-11:00", label: "Ca Sáng" },
            { id: "13:00-22:00", label: "Ca Chiều" }
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
    return sendSuccessResponse({ token: token, adminToken: token }, "Đăng nhập thành công");
  }
  
  return sendErrorResponse("Email hoặc mật khẩu không đúng!");
}



// Handle Item Request (Uniform/ID Card / Dư Vé)
function handleItemRequest(data) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("Cấp Đổi Áo Thẻ");
    if (!sheet) {
      sheet = ss.insertSheet("Cấp Đổi Áo Thẻ");
      sheet.appendRow(["Thời gian", "Loại yêu cầu", "Mã nhân viên", "Họ tên", "Ca làm việc", "Chức danh", "Số lượng", "Ngày lấy", "Giá tiền", "Lý do"]);
    }
    var timeString = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm:ss");
    
    var reqType = (data.type || "").toString().trim();
    var isDuVe = reqType.toLowerCase().indexOf("dư vé") !== -1 || reqType.toLowerCase().indexOf("du ve") !== -1;
    var empId = normalizeOpsId(data.empId);
    if (!isValidOpsId(empId)) {
      return sendErrorResponse("Mã OPS không hợp lệ (" + empId + ")! Mã bắt buộc phải có dạng OPS kèm 4 đến 6 số (Ví dụ: OPS170621 hoặc Ops170621).");
    }
    empId = empId.toUpperCase();
    data.empId = empId;
    var name = (data.name || "").toString().trim().toUpperCase();
    var shift = (data.shift || "").toString().trim();
    
    var role = data.role || "";
    var quantity = data.quantity || "";
    var pickupDate = (data.pickupDate || "").toString().trim();
    var price = data.price || "";
    var reason = data.reason || "";
    
    // Check if the spreadsheet has headers
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.appendRow(["Thời gian", "Loại yêu cầu", "Mã nhân viên", "Họ tên", "Ca làm việc", "Chức danh", "Số lượng", "Ngày lấy", "Giá tiền", "Lý do"]);
      lastRow = 1;
    }
    
    // NGĂN ĐIỀN TRÙNG NGÀY & TRÙNG CA ĐỐI VỚI DƯ VÉ
    if (isDuVe && lastRow > 1) {
      function normDateStr(d) {
        if (!d) return "";
        if (d instanceof Date) {
          return Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyy-MM-dd");
        }
        var s = d.toString().trim();
        var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (m) {
          return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
        }
        return s;
      }
      
      function normShiftStr(s) {
        return (s || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      
      var compDate = normDateStr(pickupDate);
      var compShift = normShiftStr(shift);
      var allValues = sheet.getDataRange().getValues();
      
      for (var r = 1; r < allValues.length; r++) {
        var rowType = (allValues[r][1] || "").toString().toLowerCase();
        var rowEmpId = (allValues[r][2] || "").toString().trim().toUpperCase();
        var rowShift = normShiftStr(allValues[r][4]);
        var rowDate = normDateStr(allValues[r][7]);
        
        var rowIsDuVe = rowType.indexOf("dư vé") !== -1 || rowType.indexOf("du ve") !== -1;
        
        if (rowIsDuVe && rowEmpId === empId && rowDate === compDate && rowShift === compShift) {
          return sendErrorResponse("Mã nhân viên " + empId + " đã gửi yêu cầu Dư Vé cho ca " + shift + " vào ngày " + pickupDate + " rồi! Hệ thống không cho phép gửi lại cho ca này.");
        }
      }
    }
    
    sheet.appendRow([timeString, reqType, empId, name, shift, role, quantity, pickupDate, price, reason]);
    
    return sendSuccessResponse({ message: "Ghi nhận yêu cầu thành công" });
  } catch (e) {
    return sendErrorResponse("Lỗi khi ghi nhận yêu cầu: " + e.message);
  }
}


// Handle Salary Lookup
function handleLookupSalary(data) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("BangLuong");
    if (!sheet) {
      var allSheets = ss.getSheets();
      for (var s = 0; s < allSheets.length; s++) {
        var sName = allSheets[s].getName().toLowerCase();
        if (sName.indexOf("bangluong") !== -1 || sName.indexOf("luong") !== -1 || sName.indexOf("lương") !== -1) {
          sheet = allSheets[s];
          break;
        }
      }
    }
    if (!sheet) {
      return sendErrorResponse("Chưa cấu hình trang tính BangLuong");
    }
    
    var rawSearch = (data.empId || data.identifier || "").toString().trim().toUpperCase();
    if (!rawSearch) return sendErrorResponse("Vui lòng nhập số CCCD hoặc Mã CTV");
    
    var cleanSearch = rawSearch.replace(/[^A-Z0-9]/g, "");
    var normSearchNoZero = cleanSearch.replace(/^0+/, "");
    
    var dataRange = sheet.getDataRange().getDisplayValues();
    if (dataRange.length < 2) {
      return sendSuccessResponse({ records: [], data: [] });
    }
    
    var headers = dataRange[0];
    var records = [];
    
    // Find index of CCCD, Mã CTV, Họ Tên
    var cccdIdx = -1;
    var ctvIdx = -1;
    var nameIdx = -1;
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i].toString().trim().toUpperCase();
      if (h === "CCCD" || h.indexOf("CCCD") !== -1) cccdIdx = i;
      if (h.indexOf("MÃ CTV") !== -1 || h.indexOf("MA CTV") !== -1 || h.indexOf("MÃ NV") !== -1 || h.indexOf("MA NV") !== -1) ctvIdx = i;
      if (h.indexOf("HỌ TÊN") !== -1 || h.indexOf("HO TEN") !== -1) nameIdx = i;
    }
    
    var checkMatch = function(cellVal) {
      if (cellVal == null) return false;
      var cStr = cellVal.toString().trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!cStr) return false;
      if (cStr === cleanSearch) return true;
      var normCellNoZero = cStr.replace(/^0+/, "");
      if (normSearchNoZero && normCellNoZero && normSearchNoZero === normCellNoZero) return true;
      return false;
    };
    
    for (var i = 1; i < dataRange.length; i++) {
      var row = dataRange[i];
      var match = false;
      
      if (cccdIdx !== -1 && checkMatch(row[cccdIdx])) match = true;
      if (!match && ctvIdx !== -1 && checkMatch(row[ctvIdx])) match = true;
      if (!match) {
        for (var c = 0; c < Math.min(row.length, 5); c++) {
          if (checkMatch(row[c])) {
            match = true;
            break;
          }
        }
      }
      
      if (match) {
        var record = {};
        for (var j = 0; j < headers.length; j++) {
          var hName = headers[j] ? headers[j].toString().trim() : ("Cột " + (j + 1));
          record[hName] = row[j];
        }
        
        record.empId = (ctvIdx !== -1 ? row[ctvIdx] : "") || record["Mã CTV \n(nếu có)"] || record["Mã CTV"] || record["Mã NV"] || "";
        record.cccd = (cccdIdx !== -1 ? row[cccdIdx] : "") || record["CCCD"] || "";
        record.name = (nameIdx !== -1 ? row[nameIdx] : "") || record["Họ Tên"] || record["Họ và Tên"] || "";
        record.date = record["Ngày chấm công"] || record["Ngày"] || "";
        record.timeIn = record["Giờ check-in"] || "";
        record.timeOut = record["Giờ check-out"] || "";
        record.timeInOut = (record.timeIn || record.timeOut) ? (record.timeIn + " - " + record.timeOut) : "";
        record.totalHours = parseFloat(record["Tổng giờ"] || record["Số giờ"] || 0) || 0;
        record.shiftType = (record["Night Shift"] && record["Night Shift"] !== "-" && parseFloat(record["Night Shift"]) > 0) ? "Đêm" : "Ngày";
        
        var rawSal = record["Lương theo ngày công"] || record["Thành tiền"] || record["Lương"] || "0";
        var cleanSalStr = String(rawSal).replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
        record.salary = parseFloat(cleanSalStr) || 0;
        record.daySalary = record.salary;
        record.department = record["Địa điểm"] || record["Khu vực"] || "Kho Vận SOC";
        
        records.push(record);
      }
    }
    
    return sendSuccessResponse({ records: records, data: records });
  } catch (e) {
    return sendErrorResponse("Lỗi: " + e.toString());
  }
}



function handleSubmitComplaint(data) {
  try {
    var empId = normalizeOpsId(data.empId);
    if (!isValidOpsId(empId)) {
      return sendErrorResponse("Mã OPS không hợp lệ (" + empId + ")! Mã bắt buộc phải có dạng OPS kèm 4 đến 6 số (Ví dụ: OPS170621 hoặc Ops170621).");
    }
    data.empId = empId.toUpperCase();
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("KhieuNai");
    if (!sheet) {
      sheet = ss.insertSheet("KhieuNai");
      sheet.appendRow(["Thời gian", "Mã OPS/CCCD", "Họ Tên", "SĐT liên hệ", "Loại khiếu nại", "Nội dung", "Link ảnh minh chứng", "Trạng thái"]);
    }
    
    var timeStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE || "GMT+7", "dd/MM/yyyy HH:mm:ss");
    var imgUrl = "";
    
    // Nếu có ảnh đính kèm
    if (data.imageBase64) {
      try {
        var folderId = data.driveFolderId || CONFIG.GDRIVE_FOLDER_ID || "18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu";
        var folder = DriveApp.getFolderById(folderId);
        
        var base64Data = data.imageBase64.toString();
        var mimeType = data.imageMimeType || "image/jpeg";
        if (base64Data.indexOf(",") !== -1) {
          var parts = base64Data.split(",");
          var mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch && mimeMatch[1]) {
            mimeType = mimeMatch[1];
          }
          base64Data = parts[1];
        }
        
        var filename = data.imageFilename || ("KhieuNai_" + (data.empId || "OPS") + "_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".jpg");
        var decodedBytes = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decodedBytes, mimeType, filename);
        var file = folder.createFile(blob);
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
          Logger.log("Sharing permission warning: " + shareErr);
        }
        imgUrl = file.getUrl();
      } catch (e) {
        imgUrl = "Lỗi tải ảnh: " + e.toString();
      }
    }
    
    sheet.appendRow([
      timeStr,
      data.empId || "",
      data.empName || "",
      data.phone || "",
      data.type || data.complaintType || "",
      data.content || "",
      imgUrl,
      "Chờ xử lý"
    ]);
    
    return sendSuccessResponse({ message: "Đã gửi khiếu nại thành công!", imgUrl: imgUrl });
  } catch (e) {
    return sendErrorResponse(e.toString());
  }
}

function authorizeDrivePermissions() {
  var folder = DriveApp.getFolderById("18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu");
  var testFile = folder.createFile("test_verify_write.txt", "Drive write access OK");
  testFile.setTrashed(true);
  Logger.log("Drive FULL WRITE authorized successfully! Folder: " + folder.getName());
  return "Drive write permission OK: " + folder.getName();
}

  function handleGetSalaryList(data) {
    try {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sheet = ss.getSheetByName("BangLuong");
      if (!sheet) {
        return sendErrorResponse("Khong tim thay sheet BangLuong");
      }
      
      var vals = sheet.getDataRange().getDisplayValues();
      if (vals.length < 2) {
        return sendSuccessResponse({ salaries: [] });
      }
      
      var headers = vals[0].map(function(h) { return h.toString().trim(); });
      var salaries = [];
      for (var i = 1; i < vals.length; i++) {
        var row = vals[i];
        if (!row[0] && !row[1] && !row[2]) continue; // Skip empty rows
        
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
            obj[headers[j]] = row[j];
        }
        salaries.push(obj);
      }
      
      return sendSuccessResponse({ salaries: salaries });
    } catch (e) {
      return sendErrorResponse("Loi lay bang luong: " + e.toString());
    }
  }

function handleGetRegistration(data) {
  try {
    var empIdSearch = (data.empId || "").toLowerCase().trim();
    var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var allSheets = regSs.getSheets();
    var result = [];
    
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
            sheetName: sName,
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
  } catch (err) {
    return sendErrorResponse("Lỗi tra cứu lịch: " + err.toString());
  }
}

function handleGetAllRegistrations(data) {
  try {
    var regSs = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var allSheets = regSs.getSheets();
    var result = [];
    
    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var sName = sheet.getName();
      
      if (sName.match(/^T\d+_/) || sName.indexOf("LỊCHT") === 0 || sName === "DangKyLich") {
        if (sheet.getLastRow() <= 1) continue;
        var vals = sheet.getDataRange().getValues();
        var headers = vals[0];
        
        for (var ri = 1; ri < vals.length; ri++) {
          var row = vals[ri];
          var workCount = 0;
          var totalDays = 0;
          for (var ci = 7; ci < headers.length; ci++) {
            totalDays++;
            if (row[ci] && row[ci] !== "OFF") workCount++;
          }
          var tsVal = row[0];
          if (tsVal instanceof Date) {
            tsVal = Utilities.formatDate(tsVal, CONFIG.TIMEZONE, "dd/MM/yyyy HH:mm");
          } else if (tsVal) {
            tsVal = tsVal.toString().trim();
          } else {
            tsVal = "";
          }

          result.push({
            timestamp: tsVal,
            empId: row[1] || "",
            name: row[2] || "",
            phone: row[3] || "",
            osGender: row[4] || "",
            shiftId: row[5] || "",
            shiftLabel: row[6] || row[5] || "",
            shift: row[6] || row[5] || "",
            workDays: workCount,
            workDaysCount: workCount,
            totalDays: totalDays,
            sheetName: sName
          });
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return sendErrorResponse("Lỗi lấy danh sách đăng ký: " + err.toString());
  }
}

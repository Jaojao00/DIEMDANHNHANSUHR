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


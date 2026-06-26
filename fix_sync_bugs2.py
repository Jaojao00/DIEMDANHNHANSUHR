import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_roster_gen = '''    var rowsToWrite = [];
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
    }'''

new_roster_gen = '''    var rowsToWrite = [];
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
    }'''

if old_roster_gen in code:
    code = code.replace(old_roster_gen, new_roster_gen)
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed google-apps-script.js successfully!")
else:
    print("Target NOT FOUND. Check your string.")

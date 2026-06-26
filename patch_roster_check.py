import os

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''    var rowsToWrite = [];
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

replacement = '''    // 1. Dựng danh sách cơ bản từ Lịch
    var rowsToWrite = [];
    var empIndexMap = {}; // Lưu dòng index của mỗi nhân viên để dễ cập nhật
    
    for (var w = 0; w < workersForToday.length; w++) {
      var worker = workersForToday[w];
      var newRow = [
        w + 1,
        worker.empId,
        worker.name,
        "A-OS" // Định Danh mặc định
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
    
    // 2. Xử lý Xin Off
    var offSheet = ss.getSheetByName("XIN_OFF");
    if (offSheet && offSheet.getLastRow() > 1) {
      var offData = offSheet.getDataRange().getValues();
      for (var r = 1; r < offData.length; r++) {
        var rowType = (offData[r][4] || "").toString().trim();
        var rowDate = (offData[r][6] || "").toString().trim();
        if (rowType === "XIN OFF" && rowDate === todayStr) {
          var offEmpId = (offData[r][1] || "").toString().toLowerCase().trim();
          var offReason = (offData[r][5] || "") + " " + (offData[r][7] || "");
          var offPhone = offData[r][3] || "";
          var offTime = offData[r][0] || "";
          
          if (empIndexMap.hasOwnProperty(offEmpId)) {
            var targetIdx = empIndexMap[offEmpId];
            rowsToWrite[targetIdx][4 + N + 1] = "XIN OFF"; // Trạng Thái
            rowsToWrite[targetIdx][4 + N + 2] = offTime; // Thời gian
            rowsToWrite[targetIdx][4 + N] = offReason.trim(); // Ghi chú
            if (offPhone) rowsToWrite[targetIdx][4 + N + 3] = offPhone; // SĐT
          }
        }
      }
    }
    
    // 3. Xử lý Xin Lên Ca
    // Tìm các đơn XIN LÊN CA trong XIN_OFF (được lưu chung vào sheet XIN_OFF với type="XIN LÊN CA" và targetShift)
    // Wait, the client uses XIN_OFF sheet for BOTH "XIN OFF" and "XIN LÊN CA" in the current implementation.
    // Yes, data.type is "XIN OFF" or "XIN LÊN CA". And it's appended to "XIN_OFF" sheet.
    if (offSheet && offSheet.getLastRow() > 1) {
      var offData = offSheet.getDataRange().getValues();
      for (var r = 1; r < offData.length; r++) {
        var rowType = (offData[r][4] || "").toString().trim();
        var rowDate = (offData[r][6] || "").toString().trim();
        // Wait, Xin Lên Ca có thể không có cột ca đích trong XIN_OFF sheet? 
        // Trong doPost, action request: type, date, targetShift.
        // NHƯNG sheet XIN_OFF không có cột targetShift. Nó chỉ lưu:
        // [ts, empId, name, phone, type, reason, date, note]
        // Vậy hệ thống làm sao biết Xin Lên Ca vào ca nào khi chạy script ban đêm?
        // Ah! Trong doPost, khi có targetShift, nó GHI TRỰC TIẾP vào sheet Ca_ tương ứng lúc đó!
        // Vậy nếu hôm nay tạo ca ngày mai, doPost đã ghi trực tiếp vào Ca_ rồi. Nhưng 00:00 nó lại BỊ XÓA vì autoGenerateRoster gọi destSheet.clear() !
        // Vậy làm sao để lấy lại?
        // Ta cần phải giữ lại danh sách "XIN LÊN CA" trước khi clear, HOẶC...
      }
    }
'''

if target in code:
    print("Found target")
else:
    print("Target NOT FOUND!")

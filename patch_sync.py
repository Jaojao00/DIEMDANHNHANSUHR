import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_function = '''function autoSyncPositions(targetShifts) {
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
}'''

new_function = '''function autoSyncPositions(targetShifts) {
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
}'''

# Replace normalizer
def normalize(text):
    import re
    return re.sub(r'\s+', '', text)

old_normalized = normalize(old_function)

# Find where the old function starts
start_idx = -1
end_idx = -1

for match in re.finditer(r'function autoSyncPositions\(targetShifts\)\s*\{', content):
    start_idx = match.start()
    open_brackets = 0
    in_function = False
    
    for i in range(start_idx, len(content)):
        if content[i] == '{':
            open_brackets += 1
            in_function = True
        elif content[i] == '}':
            open_brackets -= 1
        if in_function and open_brackets == 0:
            end_idx = i + 1
            break
    break

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_function + content[end_idx:]
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully replaced autoSyncPositions.")
else:
    print("Could not find autoSyncPositions.")

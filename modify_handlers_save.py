import re

with open('backend/handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_handleSave = """function handleSave(data, shiftId, sheet) {
  
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
    
}"""

new_handleSave = """function handleSave(data, shiftId, sheet) {
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
    
    var idKey = String(emp.id || "").trim().toLowerCase();
    var existing = existingMap[idKey];
    
    var finalStatus = emp.status || "pending";
    var finalTime = emp.timestamp || "";
    var finalNote = emp.note || "";
    var finalPhone = emp.phone || "";
    
    if (existing && existing.status && String(existing.status).toLowerCase() !== "pending" && String(existing.status).trim() !== "") {
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
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Lưu lịch thành công và giữ lại điểm danh cũ" })).setMimeType(ContentService.MimeType.JSON);
}"""

if old_handleSave in content:
    content = content.replace(old_handleSave, new_handleSave)
    print("Replaced handleSave!")
else:
    print("Could not find old handleSave to replace. Checking regex...")
    # fallback regex
    pattern = r'function handleSave\(data, shiftId, sheet\) \{.*?(?=function handleRequest)'
    if re.search(pattern, content, flags=re.DOTALL):
        content = re.sub(pattern, new_handleSave + '\n\n', content, flags=re.DOTALL)
        print("Replaced using regex!")

with open('backend/handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)

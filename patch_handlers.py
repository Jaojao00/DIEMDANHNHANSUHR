with open("backend/handlers.js", "r", encoding="utf-8") as f:
    content = f.read()

handler_func = """
function handleSubmitComplaint(data) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName("KhieuNai");
    if (!sheet) {
      sheet = ss.insertSheet("KhieuNai");
      sheet.appendRow(["Thời gian", "Mã NV", "Họ Tên", "Loại khiếu nại", "Nội dung", "Link ảnh minh chứng", "Trạng thái"]);
    }
    
    var timeStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
    var imgUrl = "";
    
    // N?u c ?nh dnh km
    if (data.imageFilename && data.imageBase64) {
      try {
        var folderIterator = DriveApp.getFoldersByName("KhieuNaiImages");
        var folder;
        if (folderIterator.hasNext()) {
          folder = folderIterator.next();
        } else {
          folder = DriveApp.createFolder("KhieuNaiImages");
          folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
        
        var blob = Utilities.newBlob(Utilities.base64Decode(data.imageBase64), data.imageMimeType || "image/png", data.imageFilename);
        var file = folder.createFile(blob);
        imgUrl = file.getUrl();
      } catch (e) {
        imgUrl = "L?i t?i ?nh: " + e.toString();
      }
    }
    
    sheet.appendRow([
      timeStr,
      data.empId || "",
      data.empName || "",
      data.type || "",
      data.content || "",
      imgUrl,
      "Chờ xử lý"
    ]);
    
    return sendSuccessResponse({ message: "Đã gửi khiếu nại thành công!" });
  } catch (e) {
    return sendErrorResponse(e.toString());
  }
}
"""

if "function handleSubmitComplaint" not in content:
    content += "\n" + handler_func

with open("backend/handlers.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated handlers.js")

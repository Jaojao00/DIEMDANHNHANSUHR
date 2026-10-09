with open("backend/handlers.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'sheet.appendRow(["Thời gian", "Mã NV", "Họ Tên", "Loại khiếu nại", "Nội dung", "Link ảnh minh chứng", "Trạng thái"]);',
    'sheet.appendRow(["Thời gian", "Mã OPS/CCCD", "Họ Tên", "SĐT liên hệ", "Loại khiếu nại", "Nội dung", "Link ảnh minh chứng", "Trạng thái"]);'
)

old_append = """    sheet.appendRow([
      timeStr,
      data.empId || "",
      data.empName || "",
      data.type || "",
      data.content || "",
      imgUrl,
      "Chờ xử lý"
    ]);"""

new_append = """    sheet.appendRow([
      timeStr,
      data.empId || "",
      data.empName || "",
      data.phone || "",
      data.type || "",
      data.content || "",
      imgUrl,
      "Chờ xử lý"
    ]);"""

content = content.replace(old_append, new_append)

with open("backend/handlers.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated handlers.js")

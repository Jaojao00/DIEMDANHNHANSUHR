import re

with open('backend/handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add reason to extraction
old_extract = '''    var quantity = data.quantity || "";
    var pickupDate = data.pickupDate || "";
    var price = data.price || "";'''
    
new_extract = '''    var quantity = data.quantity || "";
    var pickupDate = data.pickupDate || "";
    var price = data.price || "";
    var reason = data.reason || "";'''
content = content.replace(old_extract, new_extract)

# Update headers
old_header = '["Thời gian", "Loại yêu cầu", "Mã nhân viên", "Họ tên", "Ca làm việc", "Chức danh", "Số lượng", "Ngày lấy", "Giá tiền"]'
new_header = '["Thời gian", "Loại yêu cầu", "Mã nhân viên", "Họ tên", "Ca làm việc", "Chức danh", "Số lượng", "Ngày lấy", "Giá tiền", "Lý do"]'
content = content.replace(old_header, new_header)

# Update appendRow
old_append = 'sheet.appendRow([timeString, reqType, empId, name, shift, role, quantity, pickupDate, price]);'
new_append = 'sheet.appendRow([timeString, reqType, empId, name, shift, role, quantity, pickupDate, price, reason]);'
content = content.replace(old_append, new_append)

with open('backend/handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated handlers.js")

import re

with open("js/admin/adminSalary.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("if (data.status === 'success') {", "if (data.success) {")
content = content.replace('Swal.fire("Lỗi", data.message || "Không thể tải dữ liệu", "error");', 'Swal.fire("Lỗi", data.error || data.message || "Không thể tải dữ liệu", "error");')

with open("js/admin/adminSalary.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed adminSalary.js")

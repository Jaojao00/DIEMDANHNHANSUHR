import re

with open("js/admin/adminSalary.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('localStorage.getItem("adminToken");', 'localStorage.getItem("agr_admin_token");')

with open("js/admin/adminSalary.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed admin token key!")

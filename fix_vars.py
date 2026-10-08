import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_vars = """            const empLocation = firstRec['Địa điểm'] || 'N/A';"""
new_vars = """            const empLocation = firstRec['Địa điểm'] || 'N/A';
            const empTitle = firstRec['Chức vụ'] || 'Nhân viên';
            const empCCCD = firstRec['CCCD'] || 'N/A';"""

content = content.replace(old_vars, new_vars)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added missing variables")

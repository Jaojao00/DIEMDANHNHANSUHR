import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the variable extraction block
old_extract = """            const empName = firstRec['Họ Tên'] || firstRec['Họ và Tên'] || 'Không rõ';
            const empCCCD = firstRec['CCCD'] || 'N/A';
            const empTitle = firstRec['Chức vụ'] || 'Nhân viên';
            const empLocation = firstRec['Địa điểm'] || firstRec['Khu vực'] || 'N/A';
            const ctvCode = firstRec['Mã CTV (nếu có)'] || firstRec['Mã CTV'] || firstRec['Mã dự án'] || 'N/A';"""

new_extract = """            const empName = firstRec['Họ Tên'] || firstRec['Họ và Tên'] || 'Không rõ';
            const ctvCode = firstRec['Mã CTV (nếu có)'] || firstRec['Mã CTV'] || 'N/A';
            const empRegion = firstRec['Khu vực'] || 'N/A';
            const empLocation = firstRec['Địa điểm'] || 'N/A';"""

content = content.replace(old_extract, new_extract)

# Replace the banner info block
old_banner = """<p>Mã: ${ctvCode} | CCCD: ${empCCCD} | ${empTitle}</p>"""
new_banner = """<p>Mã CTV: ${ctvCode} | KV: ${empRegion} | ĐĐ: ${empLocation}</p>"""
content = content.replace(old_banner, new_banner)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated banner info")


import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('luong theo ngy cng', 'lương theo ngày công')
content = content.replace('s? ti?n t?m tnh', 'số tiền tạm tính')
content = content.replace('T?ng gi?', 'Tổng giờ')

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

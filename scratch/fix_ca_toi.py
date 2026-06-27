import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Ca Tối logic
old_str = """    if (shiftId === '18:00-22:00') {
      // Ca Tối: 13h - 14h cùng ngày
      start.setHours(13, 0, 0);
      end.setHours(14, 0, 0);
      startStr = "13h00"; endStr = "14h00";"""

new_str = """    if (shiftId === '18:00-22:00') {
      // Ca Tối: 10h - 14h cùng ngày
      start.setHours(10, 0, 0);
      end.setHours(14, 0, 0);
      startStr = "10h00"; endStr = "14h00";"""

content = content.replace(old_str, new_str)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Ca Toi time window")

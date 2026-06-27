import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new strict logic
new_logic = """  isWithinTimeWindow: (shiftId) => {
    const scheduleDateStr = localStorage.getItem('agr_schedule_date');
    const scheduleDate = scheduleDateStr ? new Date(scheduleDateStr) : new Date();
    scheduleDate.setHours(0, 0, 0, 0);

    const now = new Date();
    let isAllowed = true;
    let isOver = false;
    let startStr = "";
    let endStr = "";

    let start = new Date(scheduleDate);
    let end = new Date(scheduleDate);

    if (shiftId === '18:00-22:00') {
      // Ca Tối: 13h - 14h cùng ngày
      start.setHours(13, 0, 0);
      end.setHours(14, 0, 0);
      startStr = "13h00"; endStr = "14h00";
    } else if (shiftId === '22:00-06:00') {
      // Ca Đêm: 14h - 18h cùng ngày
      start.setHours(14, 0, 0);
      end.setHours(18, 0, 0);
      startStr = "14h00"; endStr = "18h00";
    } else if (shiftId === '15:00-22:00') {
      // Ca Chiều: 9h - 12h cùng ngày
      start.setHours(9, 0, 0);
      end.setHours(12, 0, 0);
      startStr = "09h00"; endStr = "12h00";
    } else if (shiftId === '06:00-10:00' || shiftId === '06:00-15:00') {
      // Ca Sáng & OS Sáng: trước 19h ngày hôm trước
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(19, 0, 0);
      startStr = "00h00 hôm trước"; endStr = "19h00 hôm trước";
    } else {
      start.setHours(0, 0, 0);
      end.setHours(23, 59, 59);
      startStr = "00h00"; endStr = "23h59";
    }

    isAllowed = now >= start && now <= end;
    isOver = now > end;

    return {
      isAllowed: isAllowed,
      isOver: isOver,
      startStr: startStr,
      endStr: endStr
    };
  },"""

# Regex to find the current function and replace it
pattern = r'isWithinTimeWindow:\s*\(shiftId\)\s*=>\s*\{.*?\n  \},'
content = re.sub(pattern, new_logic, content, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated app.js")

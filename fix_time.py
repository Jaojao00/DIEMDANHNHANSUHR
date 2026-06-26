import re

with open('app.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_logic = '''    if (shiftId === '18:00-22:00') {
      let d1Start = new Date(shiftDate); d1Start.setHours(13, 0, 0);
      let d1End = new Date(shiftDate); d1End.setHours(14, 0, 0);
      let d2Start = new Date(shiftDate); d2Start.setHours(22, 0, 0);
      let d2End = new Date(shiftDate); d2End.setHours(23, 59, 59);
      
      isAllowed = (now >= d1Start && now <= d1End) || (now >= d2Start && now <= d2End);
      isOver = (now > d2End);
      startStr = "13h-14h"; endStr = "Sau 22:00";
    }'''

new_logic = '''    if (shiftId === '18:00-22:00') {
      let d1Start = new Date(shiftDate); d1Start.setHours(10, 0, 0);
      let d1End = new Date(shiftDate); d1End.setHours(14, 0, 0);
      let d2Start = new Date(shiftDate); d2Start.setHours(22, 0, 0);
      let d2End = new Date(shiftDate); d2End.setHours(23, 59, 59);
      
      isAllowed = (now >= d1Start && now <= d1End) || (now >= d2Start && now <= d2End);
      isOver = (now > d2End);
      startStr = "10h-14h"; endStr = "Sau 22:00";
    }'''

if old_logic in code:
    code = code.replace(old_logic, new_logic)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Replaced successfully")
else:
    print("Could not find old logic")

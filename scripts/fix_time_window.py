import re

with open('app.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''  isWithinTimeWindow: (shiftId) => {
    const scheduleDateStr = localStorage.getItem('agr_schedule_date');
    const scheduleDate = scheduleDateStr ? new Date(scheduleDateStr) : new Date();
    scheduleDate.setHours(0, 0, 0, 0);

    let start = new Date(scheduleDate);
    let end = new Date(scheduleDate);

    if (shiftId === '18:00-22:00') {
      // Ca Tối: 13h - 14h cùng ngày
      start.setHours(13, 0, 0);
      end.setHours(14, 0, 0);
    } else if (shiftId === '22:00-06:00') {
      // Ca Đêm: 14h - 18h cùng ngày
      start.setHours(14, 0, 0);
      end.setHours(18, 0, 0);
    } else if (shiftId === '15:00-22:00') {
      // Ca Chiều: 9h - 12h cùng ngày
      start.setHours(9, 0, 0);
      end.setHours(12, 0, 0);
    } else if (shiftId === '06:00-10:00' || shiftId === '06:00-15:00') {
      // Ca Sáng & OS Sáng: trước 19h ngày hôm trước
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(19, 0, 0);
    } else {
      start.setHours(0, 0, 0);
      end.setHours(23, 59, 59);
    }

    const now = new Date();
    
    return {
      isAllowed: now >= start && now <= end,
      isOver: now > end,
      startStr: Utils.formatTime(start).substring(0, 5),
      endStr: Utils.formatTime(end).substring(0, 5)
    };
  },'''

replacement = '''  isWithinTimeWindow: (shiftId) => {
    const scheduleDateStr = localStorage.getItem('agr_schedule_date');
    const scheduleDate = scheduleDateStr ? new Date(scheduleDateStr) : new Date();
    scheduleDate.setHours(0, 0, 0, 0);

    const now = new Date();
    let isAllowed = true;
    let isOver = false;
    let startStr = "";
    let endStr = "";

    let shiftDate = new Date(scheduleDate);
    
    if (shiftId === '18:00-22:00') {
      let d1Start = new Date(shiftDate); d1Start.setHours(13, 0, 0);
      let d1End = new Date(shiftDate); d1End.setHours(14, 0, 0);
      let d2Start = new Date(shiftDate); d2Start.setHours(22, 0, 0);
      let d2End = new Date(shiftDate); d2End.setHours(23, 59, 59);
      
      isAllowed = (now >= d1Start && now <= d1End) || (now >= d2Start && now <= d2End);
      isOver = (now > d2End);
      startStr = "13h-14h"; endStr = "Sau 22:00";
    } else if (shiftId === '22:00-06:00') {
      let d1Start = new Date(shiftDate); d1Start.setHours(14, 0, 0);
      let d1End = new Date(shiftDate); d1End.setHours(18, 0, 0);
      let d2Start = new Date(shiftDate); d2Start.setDate(d2Start.getDate() + 1); d2Start.setHours(6, 0, 0);
      let d2End = new Date(shiftDate); d2End.setDate(d2End.getDate() + 1); d2End.setHours(12, 0, 0);
      
      isAllowed = (now >= d1Start && now <= d1End) || (now >= d2Start && now <= d2End);
      isOver = (now > d2End);
      startStr = "14h-18h"; endStr = "Sau 06:00 sáng";
    } else if (shiftId === '15:00-22:00') {
      let d1Start = new Date(shiftDate); d1Start.setHours(9, 0, 0);
      let d1End = new Date(shiftDate); d1End.setHours(12, 0, 0);
      let d2Start = new Date(shiftDate); d2Start.setHours(22, 0, 0);
      let d2End = new Date(shiftDate); d2End.setHours(23, 59, 59);
      
      isAllowed = (now >= d1Start && now <= d1End) || (now >= d2Start && now <= d2End);
      isOver = (now > d2End);
      startStr = "09h-12h"; endStr = "Sau 22:00";
    } else if (shiftId === '06:00-10:00' || shiftId === '06:00-15:00') {
      let endHour = shiftId === '06:00-10:00' ? 10 : 15;
      let d1End = new Date(shiftDate); d1End.setDate(d1End.getDate() - 1); d1End.setHours(19, 0, 0);
      let d2Start = new Date(shiftDate); d2Start.setHours(endHour, 0, 0);
      let d2End = new Date(shiftDate); d2End.setHours(23, 59, 59);
      
      isAllowed = (now <= d1End) || (now >= d2Start && now <= d2End);
      isOver = (now > d2End);
      startStr = "<19h h.trước"; endStr = "Sau " + endHour + "h00";
    } else {
      isAllowed = true;
      isOver = false;
      startStr = "00:00"; endStr = "23:59";
    }

    return {
      isAllowed: isAllowed,
      isOver: isOver,
      startStr: startStr,
      endStr: endStr
    };
  },'''

if target in code:
    code = code.replace(target, replacement)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed time validation in app.js")
else:
    print("Target not found in app.js")

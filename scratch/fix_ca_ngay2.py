import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """      const empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
      if (!empData) {
        return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
      }"""

new_logic = """      let empData;
      if (shiftId === 'CA_NGAY') {
        const subShiftDataList = dataArr.filter(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
        if (subShiftDataList.length === 0) {
          return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
        }
        
        empData = {
          empId: subShiftDataList[0].empId,
          empName: subShiftDataList[0].empName,
          shiftId: 'CA_NGAY',
          shiftLabel: 'CA NGÀY (06:00-22:00)',
          selections: []
        };
        
        let mergedSelections = {};
        subShiftDataList.forEach(subShiftData => {
          if (subShiftData.selections) {
            subShiftData.selections.forEach(sel => {
              if (!mergedSelections[sel.label]) {
                mergedSelections[sel.label] = { label: sel.label, choice: "OFF" };
              }
              if (sel.choice === "WORK") {
                mergedSelections[sel.label].choice = subShiftData.shiftId;
              }
            });
          }
        });
        
        empData.selections = Object.values(mergedSelections);
      } else {
        empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
        if (!empData) {
          return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
        }
      }"""

content = content.replace(old_logic, new_logic)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated registration.js safely")

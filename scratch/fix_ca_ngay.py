import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the empData lookup logic
old_logic = """      const empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
      if (!empData) {
        return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
      }
      
      // Build crCurrentSelections từ mảng selections của backend (WORK, OFF, v.v.)
      RegApp.crCurrentSelections = [];
      if (empData.selections && Array.isArray(empData.selections)) {
        empData.selections.forEach(sel => {
          if (sel.label && sel.choice && sel.choice.trim() !== "") {
            RegApp.crCurrentSelections.push({
              id: sel.label.substring(0, 10),
              label: sel.label,
              value: sel.choice,
              choice: sel.choice
            });
          }
        });
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
        
        // Convert map back to array. Sort by label if needed, but assuming original order is preserved in keys
        empData.selections = Object.values(mergedSelections);
      } else {
        empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));
        if (!empData) {
          return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
        }
      }
      
      // Build crCurrentSelections từ mảng selections của backend (WORK, OFF, v.v.)
      RegApp.crCurrentSelections = [];
      if (empData.selections && Array.isArray(empData.selections)) {
        empData.selections.forEach(sel => {
          if (sel.label && sel.choice && sel.choice.trim() !== "") {
            RegApp.crCurrentSelections.push({
              id: sel.label.substring(0, 10),
              label: sel.label,
              value: sel.choice,
              choice: sel.choice
            });
          }
        });
      }"""

# Use a non-regex replace because the block is large and static
if old_logic in content:
    content = content.replace(old_logic, new_logic)
else:
    print("WARNING: Could not find old_logic. Attempting regex...")
    # fallback if spacing differs
    content = re.sub(r'const empData = dataArr\.find\(.*?\}\);?\s*\}\)', new_logic, content, flags=re.DOTALL)
    # wait that regex might fail. I'll just rely on exact replace. 

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated registration.js for CA_NGAY change request")

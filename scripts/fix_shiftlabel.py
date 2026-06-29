import os

with open('registration.js', 'r', encoding='utf-8') as f:
    js = f.read()

# I need to change:
# const empData = dataArr.find(r => targetShiftIds.includes(r.shiftId));
# to:
# const empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));

js = js.replace('const empData = dataArr.find(r => targetShiftIds.includes(r.shiftId));', 
                'const empData = dataArr.find(r => targetShiftIds.includes(r.shiftLabel) || targetShiftIds.includes(r.shiftId));')

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("registration.js patched successfully.")

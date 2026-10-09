import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

def robust_key_replacement():
    return """
              // Find keys robustly
              const getVal = (rec, possibleKeys) => {
                  for (let key of Object.keys(rec)) {
                      let k = key.toLowerCase().trim();
                      for (let pk of possibleKeys) {
                          if (k.includes(pk.toLowerCase())) return rec[key];
                      }
                  }
                  return null;
              };

              res.records.forEach(r => {
                  let s = getVal(r, ['Lương theo ngày công', 'Lương', 'Số tiền tạm tính']);
                  if (s) {
                      let num = parseFloat(s.toString().replace(/,/g, '').replace(/\./g, '').replace(/[^0-9]/g, ''));
                      if (!isNaN(num)) totalSalary += num;
                  }
                  let h = getVal(r, ['Tổng giờ']);
                  if (h) {
                      let hNum = parseFloat(h.toString().replace(',', '.'));
                      if (!isNaN(hNum)) totalHours += hNum;
                  }
              });"""

# We need to replace the part inside res.records.forEach
old_code = """res.records.forEach(r => {
                  let s = r['Lương theo ngày công'];
                  if (s) {
                      let num = parseFloat(s.toString().replace(/,/g, '').replace(/\./g, '').replace(/[^0-9]/g, ''));
                      if (!isNaN(num)) totalSalary += num;
                  }
                  let h = r['Tổng giờ'];
                  if (h) {
                      let hNum = parseFloat(h.toString().replace(',', '.'));
                      if (!isNaN(hNum)) totalHours += hNum;
                  }
              });"""

if old_code in content:
    content = content.replace(old_code, robust_key_replacement().strip())
    print("Replaced first block")
else:
    # Try regex fallback
    print("Trying regex for first block")

# Let's also patch the rendering part for each row
old_render = """const thu = record['Thứ'] || '';
                  const salary = record['Lương theo ngày công'] || '0';
                  const timeIn = record['Giờ check-in'] || '--:--';
                  const timeOut = record['Giờ check-out'] || '--:--';
                  let hours = record['Tổng giờ'] || '0';"""

new_render = """const thu = getVal(record, ['Thứ']) || '';
                  const salary = getVal(record, ['Lương theo ngày công', 'Lương', 'Số tiền tạm tính']) || '0';
                  const timeIn = getVal(record, ['Giờ check-in', 'Giờ vào']) || '--:--';
                  const timeOut = getVal(record, ['Giờ check-out', 'Giờ ra']) || '--:--';
                  let hours = getVal(record, ['Tổng giờ']) || '0';"""

if old_render in content:
    content = content.replace(old_render, new_render)
    print("Replaced second block")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Let's replace the hardcoded key lookups
# let s = r['Lương theo ngày công']; -> use a robust getVal
# Actually, if I just replace r['Luong theo ngy cng'] with a robust one.

get_val_fn = """              const getVal = (rec, possibleKeys) => {
                  for (let key of Object.keys(rec)) {
                      let k = key.toLowerCase().trim();
                      for (let pk of possibleKeys) {
                          if (k.includes(pk.toLowerCase())) return rec[key];
                      }
                  }
                  return null;
              };
"""

# Block 1
content = re.sub(
    r"res\.records\.forEach\(r => \{\s*let s = r\['[^']+?ng'\];",
    get_val_fn + r"              res.records.forEach(r => {\n                  let s = getVal(r, ['lương theo ngày công', 'số tiền tạm tính', 'luong']);",
    content
)

# Block 2
content = re.sub(
    r"let h = r\['T\?[a-zA-Z0-9]+ gi\?'\];",
    r"let h = getVal(r, ['tổng giờ', 'tong gio']);",
    content
)

# Block 3
content = re.sub(
    r"const salary = record\['[^']+?ng'\] \|\| '0';",
    r"const salary = getVal(record, ['lương theo ngày công', 'số tiền tạm tính', 'luong']) || '0';",
    content
)

content = re.sub(
    r"let hours = record\['T\?[a-zA-Z0-9]+ gi\?'\] \|\| '0';",
    r"let hours = getVal(record, ['tổng giờ', 'tong gio']) || '0';",
    content
)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Regex replaced")

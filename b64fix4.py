with open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "let s = getVal(r," in line:
        lines[i] = "                  let s = getVal(r, ['l\\u01b0\\u01a1ng theo ng\\u00e0y c\\u00f4ng', 's\\u1ed1 ti\\u1ec1n t\\u1ea1m t\\u00ednh', 'luong']);\n"
    if "const salary = getVal(record," in line:
        lines[i] = "                  const salary = getVal(record, ['l\\u01b0\\u01a1ng theo ng\\u00e0y c\\u00f4ng', 's\\u1ed1 ti\\u1ec1n t\\u1ea1m t\\u00ednh', 'luong']) || '0';\n"
    if "let h = getVal(r," in line:
        lines[i] = "                  let h = getVal(r, ['t\\u1ed5ng gi\\u1edd', 'tong gio']);\n"
    if "let hours = getVal(record," in line:
        lines[i] = "                  let hours = getVal(record, ['t\\u1ed5ng gi\\u1edd', 'tong gio']) || '0';\n"

with open("app.js", "w", encoding="utf-8") as f:
    f.writelines(lines)

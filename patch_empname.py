with open("app.js", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const empName = firstRec" in line and "window._currentEmpName" not in lines[i+1]:
        lines.insert(i+1, "              window._currentEmpName = empName;\n")
        break

with open("app.js", "w", encoding="utf-8") as f:
    f.writelines(lines)

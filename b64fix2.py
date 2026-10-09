import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Replace getVal occurrences with explicit \u sequences to avoid any encoding problems
# "lương theo ngày công" = "l\u01b0\u01a1ng theo ng\u00e0y c\u00f4ng"
# "số tiền tạm tính" = "s\u1ed1 ti\u1ec1n t\u1ea1m t\u00ednh"
# "tổng giờ" = "t\u1ed5ng gi\u1edd"

good_array_1 = "['l\\u01b0\\u01a1ng theo ng\\u00e0y c\\u00f4ng', 's\\u1ed1 ti\\u1ec1n t\\u1ea1m t\\u00ednh', 'luong']"
content = re.sub(r"\['luong theo[^\]]+\]", good_array_1, content)

good_array_2 = "['t\\u1ed5ng gi\\u1edd', 'tong gio']"
content = re.sub(r"\['T\?ng gi\?', 'tong gio'\]", good_array_2, content)

# I should also replace the previous match:
content = re.sub(r"\['t\?ng gi\?', 'tong gio'\]", good_array_2, content)
content = re.sub(r"getVal\(record, \['T\?ng gi\?'\]\)", f"getVal(record, {good_array_2})", content)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

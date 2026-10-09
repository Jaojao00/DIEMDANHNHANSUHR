import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Remove the old corrupted getVal array
content = re.sub(r"\[[^\]]+\]", lambda m: "['lương theo ngày công', 'số tiền tạm tính', 'luong']" if 'luong' in m.group(0) else m.group(0), content)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
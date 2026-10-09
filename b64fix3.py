with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Use simple string replacement instead of re.sub for safety, or just escape backslashes
content = re.sub(r"\[[^\]]*luong theo[^\]]*\]", r"['l\\u01b0\\u01a1ng theo ng\\u00e0y c\\u00f4ng', 's\\u1ed1 ti\\u1ec1n t\\u1ea1m t\\u00ednh', 'luong']", content)
content = re.sub(r"\['[^\]]*tong gio[^\]]*\]", r"['t\\u1ed5ng gi\\u1edd', 'tong gio']", content)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

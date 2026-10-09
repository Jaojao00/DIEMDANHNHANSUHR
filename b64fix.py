import base64

content = ""
with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Base64 encoded string: "['lương theo ngày công', 'số tiền tạm tính', 'luong']" -> "WydsxrDGoW5nIHRoZW8gbmfDoHkgY8O0bmcnLCAnc+G7kSB0aeG7gW4gdOG6oW0gdMOtbicsICdsdW9uZydd"
replacement = base64.b64decode("WydsxrDGoW5nIHRoZW8gbmfDoHkgY8O0bmcnLCAnc+G7kSB0aeG7gW4gdOG6oW0gdMOtbicsICdsdW9uZydd").decode("utf-8")

content = re.sub(r"\['luong theo[^\]]+\]", replacement, content)

# Also fix the 'Tổng giờ'
# Base64 for "['tổng giờ', 'tong gio']" -> "Wyd04buVbmcgZ2nh3J0nLCAndG9uZyBnaW8nXQ=="
replacement_hours = base64.b64decode("Wyd04buVbmcgZ2nh3J0nLCAndG9uZyBnaW8nXQ==").decode("utf-8")
content = re.sub(r"\['T\?ng gi\?', 'tong gio'\]", replacement_hours, content)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)

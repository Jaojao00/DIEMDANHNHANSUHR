import re
import time

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

ts = str(int(time.time() * 1000))
content = re.sub(r'adminSalary\.js\?v=\d+', f'adminSalary.js?v={ts}', content)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Bumped adminSalary.js version.")

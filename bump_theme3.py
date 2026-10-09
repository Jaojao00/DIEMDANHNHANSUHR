import re
import time

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

ts = str(int(time.time() * 1000))
content = re.sub(r'theme-autumn\.css\?v=\d+', f'theme-autumn.css?v={ts}', content)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Bumped theme-autumn.css version.")

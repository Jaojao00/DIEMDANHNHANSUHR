import re
import time

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

ts = str(int(time.time() * 1000))

# Bump theme-autumn.css version
content = re.sub(r'theme-autumn\.css\?v=\d+', f'theme-autumn.css?v={ts}', content)
# Bump app.js version
content = re.sub(r'app\.js\?v=\d+', f'app.js?v={ts}', content)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Bumped css and js versions.")

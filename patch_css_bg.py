with open("theme-autumn.css", "r", encoding="utf-8") as f:
    content = f.read()

# Fix body background obscuring z-index < 0
new_base = """/* Base background */
html {
  background-color: var(--autumn-dark);
}
.theme-autumn {
  background-color: transparent;
  color: #ffffff;
}"""

import re
content = re.sub(r'/\* Base background \*/\s*\.theme-autumn\s*\{\s*background-color: var\(--autumn-dark\);\s*color: #ffffff;\s*\}', new_base, content)

with open("theme-autumn.css", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CSS to fix z-index background hiding")

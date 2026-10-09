with open("theme-autumn.css", "r", encoding="utf-8") as f:
    content = f.read()

import re

# Remove .autumn-overlay
content = re.sub(r'\.autumn-overlay\s*\{[^}]*\}', '', content)

# Change .theme-autumn
new_body = """body.theme-autumn {
  background-color: transparent !important;
  background-image: linear-gradient(to bottom, rgba(10, 15, 29, 0.4) 0%, rgba(10, 15, 29, 0.8) 100%), url('autumn-bg.webp') !important;
  background-size: cover !important;
  background-position: center bottom !important;
  background-attachment: fixed !important;
  color: #ffffff;
}"""
content = re.sub(r'\.theme-autumn\s*\{[^}]*\}', new_body, content)

with open("theme-autumn.css", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CSS to use background-image on body")

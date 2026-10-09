with open("theme-autumn.css", "r", encoding="utf-8") as f:
    content = f.read()

# I will update the base background CSS
import re

new_base = """body.theme-autumn, 
.theme-autumn .view, 
.theme-autumn #employeeView {
  background: linear-gradient(to bottom, rgba(10, 15, 29, 0.4) 0%, rgba(10, 15, 29, 0.8) 100%), url('assets/img/autumn-bg.webp') !important;
  background-color: transparent !important;
  background-size: cover !important;
  background-position: center bottom !important;
  background-attachment: fixed !important;
  color: #ffffff;
  animation: none !important;
}"""

content = re.sub(r'body\.theme-autumn\s*\{[^}]*\}', new_base, content)

with open("theme-autumn.css", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CSS to target .view as well")

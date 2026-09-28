import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace banner
banner_pattern = r'<div class="nd-banner">.*?</div>'
mid_autumn_banner = '''<!-- Mid Autumn Banner -->
          <div class="ma-banner">
            <div style="font-size: 24px; margin-bottom: 5px;">🏮</div>
            <h2>ĐÓN TRUNG THU 2026</h2>
            <p>Đoàn Viên &mdash; Sum Vầy</p>
          </div>'''
content = re.sub(banner_pattern, mid_autumn_banner, content, flags=re.DOTALL)

# Replace theme-nd.css link with style.css + inline (or we can just inject our new theme-ma.css)
content = content.replace('<link rel="stylesheet" href="theme-nd.css?v=4" />', '<link rel="stylesheet" href="theme-ma.css?v=1" />')

# Add mid-autumn-overlay right after <body> or <div id="employeeView">
if '<div class="mid-autumn-overlay"></div>' not in content:
    content = content.replace('<div id="employeeView" class="view active">', '<div id="employeeView" class="view active">\n      <div class="mid-autumn-overlay"></div>')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.html")

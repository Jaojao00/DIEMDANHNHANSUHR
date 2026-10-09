with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace css link
content = content.replace('<link rel="stylesheet" href="theme-ma.css?v=2" />', '<link rel="stylesheet" href="theme-autumn.css?v=1" />')

# Replace body class
content = content.replace('<body class="theme-nd">', '<body class="theme-autumn">')
content = content.replace('<body class="theme-nd ', '<body class="theme-autumn ')

# Replace overlay
content = content.replace('<div class="mid-autumn-overlay"></div>', '<div class="autumn-overlay"></div>\n      <div class="autumn-glow"></div>')

# Replace banner
old_banner = """          <!-- Mid Autumn Banner -->
          <div class="ma-banner">
            <div style="font-size: 0.85rem; font-weight: 700; color: #FFD75A; margin-bottom: 6px; letter-spacing: 1px; text-transform: uppercase;">? Chúc Mừng Trung Thu 2026 ?</div>
            <h2 style="font-size: clamp(1.8rem, 6vw, 2.4rem); letter-spacing: 1px; line-height: 1.2; text-transform: uppercase; margin-bottom: 10px;">Đêm Hội Trăng Rằm</h2>
            <p style="font-size: 0.9rem; line-height: 1.4;">Chúc bạn và gia đình một mùa Trung Thu ấm áp, hạnh phúc và trọn vẹn!</p>
          </div>"""

# Since encoding might have broken the text (like ? instead of emoji), use regex to match the ma-banner div
import re
new_banner = """          <!-- Autumn Banner -->
          <div class="autumn-banner" id="dynamicBanner">
            <!-- Rendered by JS based on month -->
          </div>"""
          
content = re.sub(r'<!-- Mid Autumn Banner -->\s*<div class="ma-banner">[\s\S]*?</div>', new_banner, content)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.html")

import os
import re

# 1. Update style.css
with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Make sure reg-table-wrap has smooth scrolling
css = re.sub(r'\.reg-table-wrap\s*\{([^}]+)\}', 
             r'.reg-table-wrap {\g<1> -webkit-overflow-scrolling: touch; width: 100%; }', 
             css)
# Remove duplicates just in case
css = css.replace('-webkit-overflow-scrolling: touch;  -webkit-overflow-scrolling: touch;', '-webkit-overflow-scrolling: touch;')

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)

# 2. Update index.html to bust cache
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

import time
timestamp = int(time.time())
html = re.sub(r'href="style\.css(\?v=\d+)?"', f'href="style.css?v={timestamp}"', html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Updated style.css and index.html with cache busting")

import re

with open('config.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_url = "'https://script.google.com/macros/s/AKfycbx3DIMJGDBAMaoC4ieCCKkhYH8K27g_KWhOYTX2T6hed-62gKzFBlMkDvuwvQ04adMr/exec'"
content = re.sub(r"APPS_SCRIPT_URL:\s*'.*?'", f"APPS_SCRIPT_URL: {new_url}", content)

with open('config.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated config.js')

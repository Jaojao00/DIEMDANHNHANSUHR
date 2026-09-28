with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

import re
match = re.search(r'<!-- National Day Banner -->.*?</div>\s*</div>', content, re.DOTALL)
if match:
    print("Found banner in index.html:")
    print(match.group(0))
else:
    # Try finding something else
    print("Not found. Looking for something like banner:")
    matches = re.findall(r'<div class="nd-banner-container">.*?</div>\s*</div>', content, re.DOTALL)
    for m in matches:
        print(m)

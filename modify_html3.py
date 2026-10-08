with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the form-group containing itemReqPrice and add style="display:none;"
import re
content = re.sub(
    r'(<div class="form-group">)\s*(<label class="form-label" for="itemReqPrice">Giá Tiền</label>)',
    r'<div class="form-group" style="display: none;">\n                \2',
    content
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

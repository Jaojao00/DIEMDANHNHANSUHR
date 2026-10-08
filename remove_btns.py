import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove bulkEditPositionsBtn block
pattern1 = r'<button\s*class="manager-toggle-btn"\s*id="bulkEditPositionsBtn".*?</span>\s*</button>'
content = re.sub(pattern1, '', content, flags=re.DOTALL)

# Remove syncRegistrationBtn block
pattern2 = r'<button\s*class="manager-toggle-btn"\s*id="syncRegistrationBtn".*?</span>\s*</button>'
content = re.sub(pattern2, '', content, flags=re.DOTALL)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed buttons")

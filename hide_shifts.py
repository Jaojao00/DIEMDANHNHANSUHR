import re

with open('dataManager.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add hidden: true to Ca Sáng
content = re.sub(
    r'(id:\s*"06:00-11:00",\s*label:\s*"Ca Sáng",)',
    r'\1\n        hidden: true,',
    content
)

# Add hidden: true to Ca OS Sáng
content = re.sub(
    r'(id:\s*"06:00-15:00",\s*label:\s*"Ca OS Sáng",)',
    r'\1\n        hidden: true,',
    content
)

# Add hidden: true to Ca Chiều
content = re.sub(
    r'(id:\s*"13:00-22:00",\s*label:\s*"Ca Chiều",)',
    r'\1\n        hidden: true,',
    content
)

# Change default shift to 18:00-22:00
content = content.replace('selectedShiftId: "06:00-11:00"', 'selectedShiftId: "18:00-22:00"')

with open('dataManager.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Modified dataManager.js")

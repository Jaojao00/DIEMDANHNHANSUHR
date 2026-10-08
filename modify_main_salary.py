import re

with open('backend/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Add action !== "lookup_salary"
content = content.replace('action !== "request_item"', 'action !== "request_item" && action !== "lookup_salary"')

# Add case
content = content.replace('case "request_item": return handleItemRequest(data);', 'case "request_item": return handleItemRequest(data);\n      case "lookup_salary": return handleLookupSalary(data);')

with open('backend/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main.js for salary lookup")

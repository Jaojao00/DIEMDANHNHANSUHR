with open('backend/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('case "request_item": return handleItemRequest(data);\n      case "checkin": return handleCheckin(data, shiftId, \nsheet);', 'case "request_item": return handleItemRequest(data);\n      case "checkin": return handleCheckin(data, shiftId, sheet);')

# The exact literal 
 was in the file, we can fix it.
import re
content = re.sub(r'case "request_item": return handleItemRequest\(data\);.*case "checkin": return handleCheckin\(data, shiftId, sheet\);', 'case "request_item": return handleItemRequest(data);\n      case "checkin": return handleCheckin(data, shiftId, sheet);', content, flags=re.DOTALL)

with open('backend/main.js', 'w', encoding='utf-8') as f:
    f.write(content)

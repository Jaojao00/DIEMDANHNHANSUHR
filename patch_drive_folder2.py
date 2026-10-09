import re

with open("backend/handlers.js", "r", encoding="utf-8") as f:
    content = f.read()

pattern = r'var folderIterator = DriveApp\.getFoldersByName\("KhieuNaiImages"\);.*?folder\.setSharing\(DriveApp\.Access\.ANYONE_WITH_LINK, DriveApp\.Permission\.VIEW\);\s*\}'

new_code = 'var folder = DriveApp.getFolderById("18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu");'

content = re.sub(pattern, new_code, content, flags=re.DOTALL)

with open("backend/handlers.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Updated with regex")

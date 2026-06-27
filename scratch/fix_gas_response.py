import os
import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace sendJsonResponse({ ... }) with ContentService.createTextOutput(JSON.stringify({ ... })).setMimeType(ContentService.MimeType.JSON)
content = re.sub(r'sendJsonResponse\((.*?)\)', r'ContentService.createTextOutput(JSON.stringify(\1)).setMimeType(ContentService.MimeType.JSON)', content)

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed sendJsonResponse in GAS")

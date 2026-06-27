import os

with open('google-apps-script.js', 'a', encoding='utf-8') as f:
    f.write("\n\nfunction sendJsonResponse(obj) {\n  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);\n}\n")

print("Appended sendJsonResponse to GAS")

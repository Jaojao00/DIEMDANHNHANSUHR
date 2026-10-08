import re

with open('backend/handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('var ss = SpreadsheetApp.getActiveSpreadsheet();', 'var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);')

with open('backend/handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated handleItemRequest to use CONFIG.SPREADSHEET_ID")

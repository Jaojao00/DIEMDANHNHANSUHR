import os

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    code = f.read()

target = 'function autoGenerateRoster() {\n  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);'
replacement = 'function autoGenerateRoster(targetShifts) {\n  if (!targetShifts) targetShifts = ["06:00-15:00", "06:00-10:00", "15:00-22:00", "18:00-22:00", "22:00-06:00"];\n  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);'

if target in code:
    code = code.replace(target, replacement)
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print('Fixed autoGenerateRoster arguments')
else:
    print('Target not found!')

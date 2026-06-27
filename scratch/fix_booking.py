import os

# Fix app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

old_if = "if (result.success) {"
new_if = "if (result.status === 'success') {"

if old_if in app_content:
    app_content = app_content.replace(old_if, new_if)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(app_content)
    print("Fixed app.js")
else:
    print("WARNING: Could not find if (result.success) in app.js")

# Fix google-apps-script.js
with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    gas_content = f.read()

old_ss = """    // ACTION: GET_BOOKING
    if (action === "get_booking") {
      try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var bookingSheet = ss.getSheetByName("SOC_South");"""

new_ss = """    // ACTION: GET_BOOKING
    if (action === "get_booking") {
      try {
        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var bookingSheet = ss.getSheetByName("SOC_South");"""

if old_ss in gas_content:
    gas_content = gas_content.replace(old_ss, new_ss)
    with open('google-apps-script.js', 'w', encoding='utf-8') as f:
        f.write(gas_content)
    print("Fixed google-apps-script.js")
else:
    print("WARNING: Could not find SpreadsheetApp.getActiveSpreadsheet() in get_booking in google-apps-script.js")

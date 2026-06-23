import re

with open('google-apps-script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert CONFIG at the top
config_code = """
// ==========================================
// CẤU HÌNH HỆ THỐNG
// ==========================================
var CONFIG = {
  SPREADSHEET_ID: "1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI",
  TIMEZONE: "Asia/Ho_Chi_Minh"
};
"""

content = re.sub(r'(\nfunction getOrCreateSheet)', config_code + r'\1', content)

# 2. Replace all hardcoded IDs
content = content.replace('SpreadsheetApp.openById("1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI")', 'SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)')

# 3. Replace Session.getScriptTimeZone() with CONFIG.TIMEZONE
content = content.replace('Session.getScriptTimeZone()', 'CONFIG.TIMEZONE')

# 4. Replace hardcoded "Asia/Ho_Chi_Minh" with CONFIG.TIMEZONE
content = content.replace('"Asia/Ho_Chi_Minh"', 'CONFIG.TIMEZONE')
content = content.replace("'Asia/Ho_Chi_Minh'", 'CONFIG.TIMEZONE')

with open('google-apps-script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Step 1 (CONFIG & Timezone) Applied!")

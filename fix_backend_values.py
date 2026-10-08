import re

with open('backend/handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace getValues() with getDisplayValues() in handleLookupSalary
old_str = "var dataRange = sheet.getDataRange().getValues();"
new_str = "var dataRange = sheet.getDataRange().getDisplayValues();"
content = content.replace(old_str, new_str)

# Also remove the manual Date formatting because getDisplayValues() handles it
old_format = """          if (val instanceof Date) {
            val = Utilities.formatDate(val, CONFIG.TIMEZONE, "dd/MM/yyyy");
          }"""
new_format = ""
content = content.replace(old_format, new_format)

with open('backend/handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated backend/handlers.js to use getDisplayValues")

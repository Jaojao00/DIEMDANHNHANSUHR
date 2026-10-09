with open("backend/handlers.js", "r", encoding="utf-8") as f:
    content = f.read()

old_code = """        if (match) {
          var record = {};
          for (var j = 0; j < headers.length; j++) {
            var val = row[j];
  
            record[headers[j]] = val;
          }"""

new_code = """        if (match) {
          var record = {};
          for (var j = 0; j < headers.length; j++) {
            var val = row[j];
  
            var headerKey = headers[j] ? headers[j].toString().trim() : "";
            record[headerKey] = val;
          }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    print("Replaced successfully")
else:
    print("Could not find exact old_code block")

with open("backend/handlers.js", "w", encoding="utf-8") as f:
    f.write(content)

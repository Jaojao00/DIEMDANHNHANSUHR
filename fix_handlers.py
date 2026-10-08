import re

with open('backend/handlers.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the search logic
old_search = """      if (cccdIdx !== -1 && row[cccdIdx] != null && row[cccdIdx].toString().trim().toUpperCase() === searchId) match = true;
      if (ctvIdx !== -1 && row[ctvIdx] != null && row[ctvIdx].toString().trim().toUpperCase() === searchId) match = true;"""

new_search = """      var checkMatch = function(cellVal, search) {
        if (cellVal == null) return false;
        var val = cellVal.toString().trim().toUpperCase();
        if (val === search) return true;
        // Nếu người dùng nhập 11 số (bỏ số 0 đầu) mà trong sheet có số 0 đầu
        if (search.length === 11 && val === "0" + search) return true;
        // Nếu người dùng nhập 12 số (có số 0) mà trong sheet mất số 0 đầu
        if (search.length === 12 && search.startsWith("0") && val === search.substring(1)) return true;
        return false;
      };
      
      if (cccdIdx !== -1 && checkMatch(row[cccdIdx], searchId)) match = true;
      if (ctvIdx !== -1 && checkMatch(row[ctvIdx], searchId)) match = true;"""

content = content.replace(old_search, new_search)

with open('backend/handlers.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated backend/handlers.js")

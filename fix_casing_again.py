import re
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Fix regapp.js back to regApp.js
content = re.sub(r'js/registration/regapp\.js\?v=\d+', 'js/registration/regApp.js?v=1791568456317', content)

# But wait, did it strip the 'reg' part?
# If my powershell command was:
# $content -replace "app\.js\?v=\d+", "app.js?v=..."
# Then "js/registration/regApp.js?v=123" matched "App.js?v=123", so it became "js/registration/regapp.js?v=..."
# Yes!

# Let's fix it properly.
content = content.replace("regapp.js", "regApp.js")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed regApp.js")

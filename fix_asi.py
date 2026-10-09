with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("(function initAutumnTheme() {", ";(function initAutumnTheme() {")

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed ASI issue with semicolon")

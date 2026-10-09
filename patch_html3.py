with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("regapp.js", "regApp.js")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Replaced regapp.js")

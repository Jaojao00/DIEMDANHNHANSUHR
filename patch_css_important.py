with open("theme-autumn.css", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("background-color: transparent;", "background-color: transparent !important;")

with open("theme-autumn.css", "w", encoding="utf-8") as f:
    f.write(content)
print("Added !important")

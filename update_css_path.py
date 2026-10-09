with open("theme-autumn.css", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("url('autumn-bg.webp')", "url('assets/img/autumn-bg.webp')")

with open("theme-autumn.css", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated CSS image path")

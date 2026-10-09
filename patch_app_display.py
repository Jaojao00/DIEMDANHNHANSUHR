with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Fix openComplaintModal
content = content.replace(
    "if (modal) modal.classList.remove('hidden');",
    "if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }"
)

# Fix closeComplaintModal
content = content.replace(
    "modal.classList.add('hidden');",
    "modal.classList.add('hidden');\n        modal.style.display = 'none';"
)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated JS modal logic")

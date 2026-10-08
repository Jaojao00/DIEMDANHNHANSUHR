import re

with open('dataManager.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("AdminApp.showLoading(true);", "const loader = document.getElementById('loadingOverlay'); if(loader) loader.classList.remove('hidden');")
content = content.replace("AdminApp.showLoading(false);", "const loader = document.getElementById('loadingOverlay'); if(loader) loader.classList.add('hidden');")

with open('dataManager.js', 'w', encoding='utf-8') as f:
    f.write(content)

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('id="complaintModal" class="modal-overlay hidden" style="z-index: 10000;', 'id="complaintModal" class="modal-overlay hidden" style="z-index: 1050;')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated z-index of complaintModal")

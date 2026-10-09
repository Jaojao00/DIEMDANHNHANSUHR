with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Fix inline display: flex overriding hidden class
content = content.replace(
    'class="modal-overlay hidden" style="z-index: 10000; align-items: center; justify-content: center; display: flex;"',
    'class="modal-overlay hidden" style="z-index: 10000; align-items: center; justify-content: center;"'
)
# Add inline style to hide when hidden is present
if ".hidden { display: none !important; }" not in content:
    content = content.replace("</style>", "  .hidden { display: none !important; }\n    </style>")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed modal display issues in index.html")

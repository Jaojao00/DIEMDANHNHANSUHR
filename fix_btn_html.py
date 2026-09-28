# -*- coding: utf-8 -*-
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

old_btn = """<!-- Nút sửa chữa / Clear Cache nổi -->
    <button
      id="repairBtn"
      class="floating-repair-btn"
      title="Xóa Cache / Sửa Lỗi"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
        <path d="M3 3v5h5"></path>
      </svg>
    </button>"""

import re
# Regex to find the button regardless of encoding mismatches in the comment
content = re.sub(
    r'<button\s*id="repairBtn"\s*class="floating-repair-btn"\s*title="[^"]*"\s*>\s*<svg[^>]*>.*?<\/svg>\s*<\/button>',
    '''<button
      id="repairBtn"
      class="floating-repair-btn"
      title="Mở bằng trình duyệt (Chrome/Safari)"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    </button>''',
    content,
    flags=re.DOTALL
)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated index.html")

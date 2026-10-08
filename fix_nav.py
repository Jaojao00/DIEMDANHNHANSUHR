import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add to bottom nav
old_nav_pattern = r'<button\s*class="emp-nav-item"\s*id="navXemLich"\s*onclick="EmpNav\.show\(\'xemLich\'\)"\s*>\s*<span class="nav-icon">[^<]+</span>\s*<span>Xem lịch</span>\s*</button>\s*</nav>'

new_nav = """<button
          class="emp-nav-item"
          id="navXemLich"
          onclick="EmpNav.show('xemLich')"
        >
          <span class="nav-icon">🔍</span>
          <span>Xem lịch</span>
        </button>
        <button
          class="emp-nav-item"
          id="navRules"
          onclick="EmpNav.show('rules')"
        >
          <span class="nav-icon">📜</span>
          <span>Quy định</span>
        </button>
      </nav>"""

if re.search(old_nav_pattern, content):
    content = re.sub(old_nav_pattern, new_nav, content)
    print("Replaced!")
else:
    print("NOT FOUND!")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

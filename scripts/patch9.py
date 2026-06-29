import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'(<button class="btn btn-sm btn-ghost" id="viewModeReg"[^>]*>Đăng Ký</button>\s*</div>)')

replacement = r'''\1
          <button class="btn btn-sm btn-ghost" id="viewModeBooking" style="color: var(--text-secondary); border: none; font-size: 13px;">Kế Hoạch</button>
          <input type="date" id="bookingDateFilter" style="display: none; border: 1px solid var(--border); border-radius: 4px; padding: 2px 4px; font-size: 12px; color: var(--text-main); background: var(--bg-main);" />
'''

# Wait, we want to insert it BEFORE the closing </div>
pattern = re.compile(r'(<button class="btn btn-sm btn-ghost" id="viewModeReg"[^>]*>Đăng Ký</button>)(\s*</div>)')

replacement = r'''\1
            <button class="btn btn-sm btn-ghost" id="viewModeBooking" style="color: var(--text-secondary); border: none; font-size: 13px;">Kế Hoạch</button>
            <input type="date" id="bookingDateFilter" style="display: none; border: 1px solid var(--border); border-radius: 4px; padding: 2px 4px; font-size: 12px; color: var(--text-main); background: var(--bg-main);" />\2'''

if pattern.search(content):
    content = pattern.sub(replacement, content)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched index.html successfully")
else:
    print("Target not found in index.html")

import sys

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''<div class="admin-view-toggle" style="margin-left: 24px; display: flex; gap: 8px; background: var(--bg-card); padding: 4px; border-radius: 8px; border: 1px solid var(--border);">
            <button class="btn btn-sm" id="viewModeFinal" style="background: var(--primary); color: white; border: none; font-size: 13px;">Đã Chốt</button>
            <button class="btn btn-sm btn-ghost" id="viewModeReg" style="color: var(--text-secondary); border: none; font-size: 13px;">Đăng Ký</button>
          </div>'''

replacement = '''<div class="admin-view-toggle" style="margin-left: 24px; display: flex; gap: 8px; background: var(--bg-card); padding: 4px; border-radius: 8px; border: 1px solid var(--border); align-items: center;">
            <button class="btn btn-sm" id="viewModeFinal" style="background: var(--primary); color: white; border: none; font-size: 13px;">Đã Chốt</button>
            <button class="btn btn-sm btn-ghost" id="viewModeReg" style="color: var(--text-secondary); border: none; font-size: 13px;">Đăng Ký</button>
            <button class="btn btn-sm btn-ghost" id="viewModeBooking" style="color: var(--text-secondary); border: none; font-size: 13px;">Kế Hoạch</button>
            <input type="date" id="bookingDateFilter" style="display: none; border: 1px solid var(--border); border-radius: 4px; padding: 2px 4px; font-size: 12px; color: var(--text-main); background: var(--bg-main);" />
          </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched index.html successfully")
else:
    print("Target not found in index.html")

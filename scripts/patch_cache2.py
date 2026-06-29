import os

# Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

btn_html = '''<body>
  <!-- Nút sửa chữa / Clear Cache nổi -->
  <button id="repairBtn" class="floating-repair-btn" title="Xóa Cache / Sửa Lỗi">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  </button>'''

if 'id="repairBtn"' not in html:
    html = html.replace('<body>', btn_html, 1)

css = '''
/* Nút sửa chữa / Clear Cache */
.floating-repair-btn {
  position: fixed;
  top: 15px;
  left: 15px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.floating-repair-btn:hover, .floating-repair-btn:active {
  background: rgba(255, 255, 255, 0.15);
  color: var(--primary);
  transform: rotate(180deg);
  border-color: rgba(255, 255, 255, 0.2);
}
</style>'''

if 'floating-repair-btn' not in html:
    html = html.replace('</style>', css, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Update app.js
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

js_logic = '''
document.addEventListener('DOMContentLoaded', () => {
  const repairBtn = document.getElementById('repairBtn');
  if (repairBtn) {
    repairBtn.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn dọn dẹp bộ nhớ tạm (xóa cache) và tải lại trang để sửa lỗi? Mọi dữ liệu lưu nháp hoặc thao tác đang làm dở sẽ bị xóa.')) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload(true);
      }
    });
  }
});
'''

if 'repairBtn' not in js:
    js = js + js_logic

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Patched successfully')

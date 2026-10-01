import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_btn = '''            <button class="action-btn action-btn--item" id="openItemReqBtn">
              <span class="action-btn-icon">👕</span>
              <div class="action-btn-text">
                <span class="action-btn-title">Yêu cầu cấp đổi Áo/Thẻ</span>
                <span class="action-btn-sub">Đăng ký mua áo mới hoặc làm lại thẻ</span>
              </div>
            </button>'''

# Find the end of openExtraShiftBtn button
content = re.sub(r'(<button class="action-btn action-btn--extra" id="openExtraShiftBtn">[\s\S]*?</button>)', r'\1\n' + new_btn, content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added button")

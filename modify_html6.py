with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<span class="action-btn-title">Cấp phát & Dư về</span>', '<span class="action-btn-title">Cấp Thẻ Đổi Áo & Dư Về</span>')
content = content.replace('<h3 id="itemRequestModalTitle">👕 Yêu Cầu Cấp Phát & Dư Về</h3>', '<h3 id="itemRequestModalTitle">👕 Cấp Thẻ Đổi Áo & Dư Về</h3>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

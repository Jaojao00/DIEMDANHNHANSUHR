with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace button title
content = content.replace('<span class="action-btn-title">Yêu cầu cấp đổi Áo/Thẻ</span>', '<span class="action-btn-title">Cấp phát & Dư về</span>')
content = content.replace('<span class="action-btn-sub">Đăng ký mua áo mới hoặc làm lại thẻ</span>', '<span class="action-btn-sub">Đăng ký áo, thẻ hoặc báo dư về</span>')

# Replace modal title
content = content.replace('<h3 id="itemRequestModalTitle">👕 Yêu Cầu Cấp Đổi Áo/Thẻ</h3>', '<h3 id="itemRequestModalTitle">👕 Yêu Cầu Cấp Phát & Dư Về</h3>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

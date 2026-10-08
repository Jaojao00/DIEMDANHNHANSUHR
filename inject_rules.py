import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the 3rd tab to the navigation
old_nav = """                <div style="display:flex; gap: 24px; font-size: 0.95rem;">
                    <span style="color: var(--primary); cursor: pointer; font-weight: 600; border-bottom: 2px solid var(--primary); padding-bottom: 4px; transition: 0.3s;" id="tabNavSchedule" onclick="toggleLookupTab('schedule')">Lịch làm việc</span>
                    <span style="color: var(--text-secondary); cursor: pointer; font-weight: 500; padding-bottom: 4px; transition: 0.3s;" id="tabNavSalary" onclick="toggleLookupTab('salary')">Bảng lương</span>
                </div>"""

new_nav = """                <div style="display:flex; gap: 20px; font-size: 0.9rem; overflow-x: auto; white-space: nowrap; scrollbar-width: none;">
                    <span style="color: var(--primary); cursor: pointer; font-weight: 600; border-bottom: 2px solid var(--primary); padding-bottom: 4px; transition: 0.3s;" id="tabNavSchedule" onclick="toggleLookupTab('schedule')">Lịch làm việc</span>
                    <span style="color: var(--text-secondary); cursor: pointer; font-weight: 500; padding-bottom: 4px; transition: 0.3s;" id="tabNavSalary" onclick="toggleLookupTab('salary')">Bảng lương</span>
                    <span style="color: var(--text-secondary); cursor: pointer; font-weight: 500; padding-bottom: 4px; transition: 0.3s;" id="tabNavRules" onclick="toggleLookupTab('rules')">Quy định</span>
                </div>"""

content = content.replace(old_nav, new_nav)

# Inject the Rules Tab Content
rules_html = """
          <!-- TAB QUY ĐỊNH VẬN HÀNH -->
          <div id="tabContentRules" style="display:none; margin-top:20px;">
             <style>
                .rules-container { color: #fff; font-family: 'Inter', sans-serif; line-height: 1.6; padding-bottom: 50px; }
                .rule-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
                .rule-title { color: var(--primary); font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
                .rule-list { list-style: none; padding: 0; margin: 0; }
                .rule-list li { position: relative; padding-left: 20px; margin-bottom: 12px; font-size: 0.9rem; color: #ddd; }
                .rule-list li::before { content: '•'; position: absolute; left: 0; color: var(--primary); font-weight: bold; }
                .rule-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85rem; }
                .rule-table th, .rule-table td { border: 1px solid rgba(255,255,255,0.1); padding: 8px; text-align: left; }
                .rule-table th { background: rgba(255,255,255,0.05); color: var(--primary); }
             </style>
             <div class="rules-container">
                <h2 style="text-align: center; margin-bottom: 5px;">CÔNG TY TNHH AGARI</h2>
                <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 25px;">QUY ĐỊNH VÀ CAM KẾT TUÂN THỦ NỘI QUY LÀM VIỆC</p>
                
                <div class="rule-section">
                    <div class="rule-title">⏱️ I. THỜI GIỜ LÀM VIỆC & ĐIỂM DANH</div>
                    <ul class="rule-list">
                        <li>Có mặt trước giờ bắt đầu ca ít nhất 15 phút để điểm danh và chuẩn bị.</li>
                        <li>Đi trễ, về sớm hoặc rời vị trí không đúng quy định sẽ bị xử lý theo nội quy.</li>
                        <li>Không tự ý nghỉ ngang hoặc bỏ ca (đặc biệt các giai đoạn cao điểm).</li>
                        <li>Ra nghỉ giữa ca và cuối ca theo đúng sự phân công của Quản lý. Sau khi nghỉ phải trở lại đúng giờ.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">👕 II. TÁC PHONG & ĐỒNG PHỤC</div>
                    <ul class="rule-list">
                        <li>Trang phục: Đi giày bít mũi, mặc áo phản quang gài/đóng đầy đủ, đầu tóc gọn gàng.</li>
                        <li>Tư trang cá nhân phải bảo quản tại khu vực cho phép, không mang vật dụng bị cấm vào khu vực làm việc.</li>
                        <li>Giữ gìn vệ sinh chung. Tôn trọng đồng nghiệp và người quản lý.</li>
                        <li>Tuyệt đối không tranh cãi, gây gổ, đùa giỡn làm mất trật tự và an toàn.</li>
                        <li>Không đăng tải/chia sẻ thông tin, hình ảnh sai sự thật hoặc bảo mật của công ty.</li>
                        <li>Không có mùi rượu bia, chất kích thích khi vào ca làm việc.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">🛡️ III. AN TOÀN VÀ BẢO VỆ TÀI SẢN</div>
                    <ul class="rule-list">
                        <li>Không ngồi, nằm nghỉ trong thùng xe hoặc trên băng chuyền.</li>
                        <li>Không hút thuốc tại khu vực kho và nhà vệ sinh. Tuân thủ PCCC.</li>
                        <li>Tập trung làm việc, không đùa nghịch thao tác gây nguy hiểm cho bản thân và hàng hóa.</li>
                        <li>Báo cáo ngay cho Quản lý nếu phát hiện sự cố, nguy cơ mất an toàn hoặc bất thường.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">🚪 IV. QUY ĐỊNH XIN VỀ GIỮA CA & XIN OFF</div>
                    <ul class="rule-list">
                        <li><strong>Về giữa ca:</strong> Chỉ xem xét với lý do bất khả kháng/khẩn cấp. Cần báo ngay cho Admin và cung cấp minh chứng. Không tự ý rời vị trí khi chưa được duyệt.</li>
                        <li><strong>Xin OFF:</strong> Phải báo trước theo quy trình (Nhắn Admin -> Chờ xác nhận). Tự ý nghỉ không báo trước sẽ bị xử lý kỷ luật.</li>
                        <li><strong>Xác nhận lịch:</strong> Phải xác nhận lịch làm việc hằng tuần theo đúng thời hạn quy định.</li>
                        <li>Không tự ý thay người, đổi ca hoặc đổi vị trí làm việc.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">⚠️ V. CÁC HÀNH VI NGHIÊM CẤM</div>
                    <ul class="rule-list">
                        <li>Nghiêm cấm gian lận, trộm cắp, cố ý gây thiệt hại tài sản.</li>
                        <li>Nghiêm cấm bạo lực, đánh nhau, gây thương tích.</li>
                        <li>Tuyệt đối không sử dụng rượu bia, chất kích thích trước và trong giờ làm.</li>
                    </ul>
                </div>
                
             </div>
          </div>
          <!-- END TAB QUY ĐỊNH -->
"""

# Insert the rules tab after the salary tab
salary_tab_end = "<!-- TÌM KIẾM THEO NGÀY MODULE -->"
content = content.replace(salary_tab_end, rules_html + "\n          " + salary_tab_end)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added rules tab HTML")

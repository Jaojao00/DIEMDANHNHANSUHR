import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add the 3rd tab to the navigation
old_nav = r'<div style="display:flex; gap: 24px; font-size: 0.95rem;">\s*<span[^>]*id="tabNavSchedule"[^>]*>Lịch làm việc</span>\s*<span[^>]*id="tabNavSalary"[^>]*>Bảng lương</span>\s*</div>'
new_nav = """<div style="display:flex; gap: 20px; font-size: 0.9rem; overflow-x: auto; white-space: nowrap; scrollbar-width: none;">
                    <span style="color: var(--primary); cursor: pointer; font-weight: 600; border-bottom: 2px solid var(--primary); padding-bottom: 4px; transition: 0.3s;" id="tabNavSchedule" onclick="toggleLookupTab('schedule')">Lịch làm việc</span>
                    <span style="color: var(--text-secondary); cursor: pointer; font-weight: 500; padding-bottom: 4px; transition: 0.3s;" id="tabNavSalary" onclick="toggleLookupTab('salary')">Bảng lương</span>
                    <span style="color: var(--text-secondary); cursor: pointer; font-weight: 500; padding-bottom: 4px; transition: 0.3s;" id="tabNavRules" onclick="toggleLookupTab('rules')">Quy định</span>
                </div>"""

content = re.sub(old_nav, new_nav, content)

# Inject the Rules Tab Content
rules_html = """
          <!-- TAB QUY ĐỊNH VẬN HÀNH -->
          <div id="tabContentRules" style="display:none; margin-top:20px; padding-bottom: 50px;">
             <style>
                .rules-container { color: #fff; font-family: 'Inter', sans-serif; line-height: 1.6; }
                .rule-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
                .rule-title { color: var(--primary); font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; }
                .rule-list { list-style: none; padding: 0; margin: 0; }
                .rule-list li { position: relative; padding-left: 20px; margin-bottom: 12px; font-size: 0.9rem; color: #ddd; }
                .rule-list li::before { content: '•'; position: absolute; left: 0; color: var(--primary); font-weight: bold; }
                
                /* Responsive */
                @media (max-width: 500px) {
                    .rule-section { padding: 15px; }
                    .rule-title { font-size: 1rem; }
                    .rule-list li { font-size: 0.85rem; }
                }
             </style>
             <div class="rules-container">
                <h3 style="text-align: center; margin-bottom: 5px; color:#fff;">CÔNG TY TNHH AGARI</h3>
                <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 25px;">QUY ĐỊNH & CAM KẾT TUÂN THỦ NỘI QUY</p>
                
                <div class="rule-section">
                    <div class="rule-title">⏱️ I. THỜI GIỜ & ĐIỂM DANH</div>
                    <ul class="rule-list">
                        <li>Có mặt trước giờ bắt đầu ca ít nhất 15 phút để điểm danh và chuẩn bị vào vị trí.</li>
                        <li>Đi trễ, về sớm hoặc rời vị trí không đúng quy định sẽ bị ghi nhận và xử lý theo nội quy.</li>
                        <li>Không tự ý nghỉ ngang hoặc bỏ ca (đặc biệt trong các giai đoạn cao điểm/sự kiện).</li>
                        <li>Ra nghỉ giữa ca và cuối ca theo sự phân công. Sau thời gian nghỉ phải trở lại đúng giờ.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">👕 II. TÁC PHONG & ĐỒNG PHỤC</div>
                    <ul class="rule-list">
                        <li>Trang phục: Đi giày bít mũi và mặc áo phản quang gài/đóng đầy đủ; đầu tóc gọn gàng.</li>
                        <li>Tư trang cá nhân bảo quản tại khu vực cho phép, không mang vật dụng cấm vào kho.</li>
                        <li>Tuyệt đối không tranh cãi, đùa giỡn, đánh nhau gây mất trật tự và ảnh hưởng an toàn kho.</li>
                        <li>Trung thực trong công việc. Không đăng tải/chia sẻ thông tin sai sự thật hoặc bảo mật.</li>
                        <li>Không vào ca trong tình trạng có mùi rượu/bia hoặc có biểu hiện không bảo đảm an toàn.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">🛡️ III. AN TOÀN VÀ TÀI SẢN</div>
                    <ul class="rule-list">
                        <li>Không mang dây rút vào thùng xe (nếu quy định SOC cấm).</li>
                        <li>Không ngồi, nằm nghỉ trong thùng xe hoặc trên băng chuyền.</li>
                        <li>Tuyệt đối không hút thuốc tại kho và nhà vệ sinh. Tuân thủ PCCC.</li>
                        <li>Báo ngay cho Quản lý nếu phát hiện sự cố, nguy cơ mất an toàn hoặc hành vi bất thường.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">🚪 IV. XIN VỀ GIỮA CA & XIN OFF</div>
                    <ul class="rule-list">
                        <li><strong>Về giữa ca:</strong> Chỉ xem xét với tình huống bất khả kháng (việc gấp, tang chế, viện...). Cần báo ngay cho Admin và chờ đồng ý.</li>
                        <li><strong>Xin OFF:</strong> Phải báo trước cho Admin (Nhắn lý do & thời gian -> Chờ xác nhận).</li>
                        <li>Tự ý nghỉ không báo hoặc không được phê duyệt sẽ bị ghi nhận nghỉ không phép và xử lý kỷ luật.</li>
                        <li>Nhân sự phải xác nhận lịch làm việc hàng tuần đúng hạn. Không tự ý đổi ca/đổi người.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">⚠️ V. NGHIÊM CẤM & KỶ LUẬT</div>
                    <ul class="rule-list">
                        <li>Nghiêm cấm trộm cắp, gian lận, cố ý gây thiệt hại tài sản hoặc vi phạm pháp luật.</li>
                        <li>Vi phạm quy định sẽ bị lập biên bản, xem xét hình thức kỷ luật, hoặc bồi thường thiệt hại (nếu có).</li>
                        <li>Việc chấm dứt hoặc ngưng bố trí công việc được thực hiện đúng căn cứ quy định.</li>
                    </ul>
                </div>
             </div>
          </div>
          <!-- END TAB QUY ĐỊNH -->
"""

# Insert the rules tab after the salary tab
target_div = '<div id="salaryResultArea" style="margin-top:20px;"></div>\n          </div>'
content = content.replace(target_div, target_div + "\n" + rules_html)

# Also fix the JS inside index.html for toggleLookupTab
js_pattern = r'function toggleLookupTab\(tab\) \{[\s\S]*?\} else \{[\s\S]*?\}[\s\S]*?\}'

new_js = """function toggleLookupTab(tab) {
      const tabSched = document.getElementById('tabContentSchedule');
      const tabSal = document.getElementById('tabContentSalary');
      const tabRules = document.getElementById('tabContentRules');
      
      const navSched = document.getElementById('tabNavSchedule');
      const navSal = document.getElementById('tabNavSalary');
      const navRules = document.getElementById('tabNavRules');
      
      // Hide all
      if(tabSched) tabSched.style.display = 'none';
      if(tabSal) tabSal.style.display = 'none';
      if(tabRules) tabRules.style.display = 'none';
      
      // Reset navs
      [navSched, navSal, navRules].forEach(n => {
          if(!n) return;
          n.style.color = 'var(--text-secondary)';
          n.style.borderBottom = 'none';
          n.style.fontWeight = '500';
      });
      
      // Show active
      let activeTab, activeNav;
      if (tab === 'schedule') { activeTab = tabSched; activeNav = navSched; }
      else if (tab === 'salary') { activeTab = tabSal; activeNav = navSal; }
      else if (tab === 'rules') { activeTab = tabRules; activeNav = navRules; }
      
      if (activeTab) activeTab.style.display = 'block';
      if (activeNav) {
          activeNav.style.color = 'var(--primary)';
          activeNav.style.borderBottom = '2px solid var(--primary)';
          activeNav.style.fontWeight = '600';
      }
    }"""

content = re.sub(js_pattern, new_js, content, count=1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html successfully")

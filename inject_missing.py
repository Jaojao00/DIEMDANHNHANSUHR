import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

new_rules_html = """</div> <!-- End Tab Salary -->

          <!-- TAB QUY ĐỊNH VẬN HÀNH -->
          <div id="tabContentRules" style="display:none; margin-top:20px; padding-bottom: 50px;">
             <style>
                .rules-container { color: #fff; font-family: 'Inter', sans-serif; line-height: 1.6; }
                .rule-section { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
                .rule-title { color: var(--primary); font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; text-transform: uppercase; }
                .rule-list { list-style: none; padding: 0; margin: 0; }
                .rule-list li { position: relative; padding-left: 20px; margin-bottom: 12px; font-size: 0.9rem; color: #ddd; }
                .rule-list li::before { content: '•'; position: absolute; left: 0; color: var(--primary); font-weight: bold; }
                
                @media (max-width: 500px) {
                    .rule-section { padding: 15px; }
                    .rule-title { font-size: 1rem; }
                    .rule-list li { font-size: 0.85rem; }
                }
             </style>
             <div class="rules-container">
                <h3 style="text-align: center; margin-bottom: 5px; color:#fff;">CÔNG TY TNHH AGARI</h3>
                <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 5px;">Kho SW SOC – SHOPPE Express, KCN, Bình Minh, Vĩnh Long</p>
                <h4 style="text-align: center; color: var(--primary); font-size: 1.1rem; margin-bottom: 25px;">CAM KẾT TUÂN THỦ NỘI QUY LÀM VIỆC</h4>
                
                <div class="rule-section">
                    <div class="rule-title">I. QUY ĐỊNH CHUNG</div>
                    <ul class="rule-list">
                        <li>Nhân sự phải có mặt trước giờ làm 15 phút để điểm danh.<br>
                        - Trễ lần 1: nhắc nhở<br>
                        - Trễ lần 2: phạt 1 công + lập biên bản</li>
                        <li>Tuân thủ đồng phục: giày bít mũi, và áo phản quang.</li>
                        <li>Cam kết Đi làm đủ giờ và đúng theo lịch làm việc được sắp xếp, không tự ý nghỉ ngang hoặc tự ý nghỉ trong kì Sự Kiện.</li>
                        <li>Giữ vệ sinh chung trong kho và trước cổng cty, thái độ hòa nhã, trung thực, không tranh cãi trong kho, đùa giỡn gây mất trật tự tại kho, hình thức xử lý khi vi phạm cắt mã và không thanh toán lương.</li>
                        <li>Không có hành vi gian lận, trộm cắp, gây gổ, đăng tải thông tin sai lệch.</li>
                        <li>Tuyệt đối không có mùi rượu/bia khi vào ca – vi phạm: phạt 1 công + Blacklist.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">II. QUY ĐỊNH VỀ CA LÀM VIỆC</div>
                    <ul class="rule-list">
                        <li><strong>Ca làm - Chế Độ:</strong><br>
                        - Ca 1: 06h00 – 15h00 - Lương 230k<br>
                        - Ca 2: 13h00 – 22h00 - Lương 230k<br>
                        - Ca 3: 22h00 – 06h00 - Lương 280k</li>
                        <li>BẢO ĐẢM ĐANG KHÔNG LÃNH BHTN, VÀ SẴN SÀNG THAM GIA BHXH.</li>
                        <li>OS: Chốt lương từ thứ 2 tới Chủ Nhật, Lãnh vào Thứ 5 - 6 hàng tuần.</li>
                        <li>Ra giữa ca và cuối ca phải đúng giờ theo phân công. Vào ca sau nghỉ có mặt trước 5–10 phút.</li>
                        <li>Vi phạm giờ giấc: OS trừ 150k/lần, BPO trừ 200k/lần.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">III. QUY ĐỊNH VỀ NGHỈ VIỆC – XIN OFF</div>
                    <ul class="rule-list">
                        <li>Nghỉ không phép: trừ 280k + cắt lịch làm.</li>
                        <li>Nghỉ ngang: không thanh toán lương các ngày trước đó.</li>
                        <li>Xin OFF phải báo trước 5 tiếng cùng ngày. Ca 6h trước 17h - CA 13H THÌ TRƯỚC 10H NGÀY HÔM SAU.</li>
                        <li>Xin OFF không báo: cắt lịch 2 tuần hoặc ngưng hợp tác.</li>
                        <li>Xin về giữa ca chỉ duyệt khi có lý do bất khả kháng.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">IV. QUY ĐỊNH AN TOÀN & VẬN HÀNH</div>
                    <ul class="rule-list">
                        <li>Không mang dây rút vào thùng xe.</li>
                        <li>Không ngồi nghỉ trong thùng xe hoặc trên băng chuyền.</li>
                        <li>Đầu tóc gọn gàng, áo phản quang gài lại.</li>
                        <li>Không hút thuốc trong kho và nhà vệ sinh – vi phạm: OFF mã Vĩnh Viễn + truy thu 5 triệu.</li>
                        <li>Làm đúng phần việc, không đùa giỡn gây ứ hàng – vi phạm: trừ 1 ngày công.</li>
                    </ul>
                </div>
                
                <div class="rule-section">
                    <div class="rule-title">V. QUY ĐỊNH BỔ SUNG</div>
                    <ul class="rule-list">
                        <li>Xác nhận lịch làm trước ca làm việc 5 tiếng mỗi ngày, ca 6h-15h thì trước 19h hằng ngày.</li>
                        <li>Không tự ý đổi vị trí làm việc – vi phạm: trừ 1 ngày công.</li>
                        <li>Không gây khó dễ khi bị OFF mã do vi phạm – vi phạm sẽ bị xử lý theo pháp luật.</li>
                        <li>Chấm công & chấm Vị Trí Làm Việc đầy đủ. → Không chấm worklocation = không tính công.</li>
                        <li>KHI NGHỈ VIỆC MUỐN OFF MÃ NLĐ BẮT BUỘC PHẢI NGHỈ ĐỦ 3 THÁNG MỚI CÓ THỂ OFF MÃ.</li>
                        <li>Vào ca đúng giờ, trễ 1 giây cũng tính vi phạm.</li>
                        <li>Không tự ý rời khỏi vị trí làm việc. vi phạm xử lý như sau:<br>
                        - Lần 1: nhắc nhở<br>
                        - Lần 2: biên bản, cắt công ngày hôm đó<br>
                        - Lần 3: ngưng hợp tác + pending công</li>
                    </ul>
                </div>
             </div>
          </div>
          <!-- END TAB QUY ĐỊNH -->"""

content = content.replace("</div> <!-- End Tab Salary -->", new_rules_html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected tabContentRules into index.html")

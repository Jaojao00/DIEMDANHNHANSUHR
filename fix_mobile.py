import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML generation block
old_html_pattern = r"let html = `[\s\S]*?resultArea\.innerHTML = html;"

new_html = """let html = `
            <style>
                .salary-dashboard { display: flex; gap: 20px; margin-top: 15px; text-align: left; align-items: flex-start; }
                .dashboard-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
                .dashboard-right { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 20px; }
                
                .salary-row { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; display: flex; align-items: center; position: relative; overflow: hidden; gap: 15px; }
                .salary-row-date { min-width: 65px; text-align:center; }
                .salary-row-info { flex: 1; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 15px; min-width: 140px; }
                .salary-row-amount { min-width: 90px; text-align: right; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 10px; }
                
                @media (max-width: 768px) {
                    .salary-dashboard { flex-direction: column; }
                    .dashboard-right { order: -1; width: 100%; } /* Đưa Thông tin nhân sự lên đầu */
                    .salary-row { flex-wrap: wrap; } /* Cho phép rớt dòng trên đt nhỏ */
                    .salary-row-amount { border-left: none; padding-left: 0; text-align: left; width: 100%; margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); }
                    .salary-row-amount > div { display: inline-block; margin-right: 10px; }
                }
            </style>
            <div class="salary-dashboard">
                
                <!-- CỘT TRÁI (Danh sách) -->
                <div class="dashboard-left">
                    
                    <!-- Các ô thống kê nhanh -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px;">
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:rgba(0, 132, 255, 0.1); color:#0084ff; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">📅</div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; white-space:nowrap;">Tổng công</div>
                                <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${res.records.length}</div>
                            </div>
                        </div>
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:rgba(255, 123, 0, 0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">💰</div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; white-space:nowrap;">Tổng lương</div>
                                <div style="color:#fff; font-weight:bold; font-size:1.1rem;">${totalSalary.toLocaleString('vi-VN')}</div>
                            </div>
                        </div>
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:rgba(0, 200, 83, 0.1); color:#00c853; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0;">⏱️</div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; white-space:nowrap;">Tổng giờ</div>
                                <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${totalHours.toFixed(1)}h</div>
                            </div>
                        </div>
                    </div>

                    <!-- Danh sách ngày làm việc -->
                    <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden;">
                        <div style="padding: 15px 20px; border-bottom: 1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-weight:bold; color:#fff; font-size:1.05rem;">📋 Bảng tính công chi tiết</div>
                        </div>
                        <div style="padding: 15px; display:flex; flex-direction:column; gap:12px;">
            `;
            
            res.records.forEach((record, index) => {
                let dateStr = record['Ngày chấm công'] || '';
                let day = '--', monthYear = '--';
                if (dateStr.includes('/')) {
                    let parts = dateStr.split('/');
                    if (parts.length >= 3) {
                        day = parts[0];
                        monthYear = parts[1] + '/' + parts[2];
                    }
                } else if (dateStr.length > 5) {
                    day = dateStr.substring(0, 2);
                    monthYear = dateStr.substring(2);
                }
                
                const thu = record['Thứ'] || '';
                const salary = record['Lương theo ngày công'] || '0';
                const timeIn = record['Giờ check-in'] || '--:--';
                const timeOut = record['Giờ check-out'] || '--:--';
                const hours = record['Tổng giờ'] || '0';
                const loc = record['Địa điểm'] || record['Khu vực'] || 'N/A';
                
                const borderColors = ['linear-gradient(180deg, #ff4b2b, #ff416c)', 'linear-gradient(180deg, #f7b733, #fc4a1a)', 'linear-gradient(180deg, #00c6ff, #0072ff)'];
                const bColor = borderColors[index % borderColors.length];

                html += `
                            <div class="salary-row">
                                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${bColor};"></div>
                                
                                <div class="salary-row-date">
                                    <div style="font-size: 1.6rem; font-weight: bold; color: #fff; line-height: 1;">${day}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${monthYear}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${thu}</div>
                                </div>
                                
                                <div class="salary-row-info">
                                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                                        📍 ${loc}
                                    </div>
                                    <div style="display: flex; gap: 12px; font-size: 0.85rem; flex-wrap: wrap;">
                                        <div><span style="color:var(--text-secondary)">Giờ vào:</span> <span style="color:#fff;">${timeIn}</span></div>
                                        <div><span style="color:var(--text-secondary)">Giờ ra:</span> <span style="color:#fff;">${timeOut}</span></div>
                                        <div><span style="color:var(--text-secondary)">Tổng:</span> <span style="color:#fff; font-weight:bold;">${hours}h</span></div>
                                    </div>
                                </div>
                                
                                <div class="salary-row-amount">
                                    <div style="color: var(--primary); font-weight: bold; font-size: 1.2rem;">${salary}</div>
                                    <div style="color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase;">Lương ngày</div>
                                </div>
                            </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>

                <!-- CỘT PHẢI (Thông tin nhân sự) -->
                <div class="dashboard-right">
                    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
                        <h3 style="color:#fff; margin-top:0; font-size:1.05rem; border-bottom:1px solid var(--border); padding-bottom:12px; display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.2rem;">👤</span> Thông tin nhân sự
                        </h3>
                        
                        <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; font-size:0.9rem;">
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:2px;">Họ và tên</div>
                                <div style="color:#fff; font-weight:500; font-size:1rem;">${empName}</div>
                            </div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:2px;">Mã nhân viên / Mã CTV</div>
                                <div style="color:#fff; font-weight:500;">${ctvCode}</div>
                            </div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:2px;">Số CCCD</div>
                                <div style="color:#fff; font-weight:500;">${empCCCD}</div>
                            </div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem; margin-bottom:2px;">Chức vụ</div>
                                <div style="color:#fff; font-weight:500;">${empTitle}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
                        <h3 style="color:#fff; margin-top:0; font-size:1.05rem; border-bottom:1px solid var(--border); padding-bottom:12px; display:flex; align-items:center; gap:8px;">
                            <span style="font-size:1.2rem;">📝</span> Ghi chú
                        </h3>
                        <div style="color:var(--text-secondary); font-size:0.85rem; line-height:1.5; margin-top:12px;">
                            Vui lòng kiểm tra lại bảng lương. Mọi thắc mắc hoặc sai sót về giờ giấc vui lòng liên hệ bộ phận nhân sự để được giải quyết sớm nhất.
                        </div>
                    </div>
                </div>
            </div>
            `;
            
            resultArea.innerHTML = html;"""

content = re.sub(old_html_pattern, new_html, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js layout for mobile first")

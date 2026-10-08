import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML generation block
old_html_pattern = r"let html = `[\s\S]*?resultArea\.innerHTML = html;"

new_html = """let html = `
            <style>
                .salary-dashboard { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; text-align: left; }
                
                .salary-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
                .salary-card-header { color: #fff; margin-top: 0; font-size: 1.05rem; border-bottom: 1px solid var(--border); padding-bottom: 12px; display: flex; align-items: center; gap: 8px; font-weight: bold; }
                
                .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; }
                .stat-box { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
                .stat-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
                
                .salary-row { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; display: flex; align-items: center; position: relative; overflow: hidden; gap: 15px; flex-wrap: wrap; margin-bottom: 12px; }
                .salary-row-date { min-width: 65px; text-align:center; }
                .salary-row-info { flex: 1; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 15px; min-width: 140px; }
                .salary-row-amount { width: 100%; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 10px; margin-top: 5px; display: flex; justify-content: space-between; align-items: center; }
            </style>
            
            <div class="salary-dashboard">
                
                <!-- 1. THÔNG TIN NHÂN SỰ -->
                <div class="salary-card">
                    <div class="salary-card-header">
                        <span style="font-size:1.2rem;">👤</span> Thông tin nhân sự
                    </div>
                    <div style="display:flex; flex-direction:column; gap:12px; margin-top:15px; font-size:0.95rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color:var(--text-secondary);">Họ và tên</span>
                            <span style="color:#fff; font-weight:bold;">${empName}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color:var(--text-secondary);">Mã NV / CTV</span>
                            <span style="color:#fff; font-weight:500;">${ctvCode}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color:var(--text-secondary);">Số CCCD</span>
                            <span style="color:#fff; font-weight:500;">${empCCCD}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color:var(--text-secondary);">Chức vụ</span>
                            <span style="color:#fff; font-weight:500;">${empTitle}</span>
                        </div>
                    </div>
                </div>

                <!-- 2. THỐNG KÊ NHANH -->
                <div class="stat-grid">
                    <div class="stat-box">
                        <div class="stat-icon" style="background:rgba(0, 132, 255, 0.1); color:#0084ff;">📅</div>
                        <div style="color:var(--text-secondary); font-size:0.8rem;">Tổng công</div>
                        <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${res.records.length}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon" style="background:rgba(255, 123, 0, 0.1); color:var(--primary);">💰</div>
                        <div style="color:var(--text-secondary); font-size:0.8rem;">Tổng lương</div>
                        <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${totalSalary.toLocaleString('vi-VN')}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-icon" style="background:rgba(0, 200, 83, 0.1); color:#00c853;">⏱️</div>
                        <div style="color:var(--text-secondary); font-size:0.8rem;">Tổng giờ</div>
                        <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${totalHours.toFixed(1)}h</div>
                    </div>
                </div>

                <!-- 3. BẢNG TÍNH CÔNG CHI TIẾT -->
                <div class="salary-card" style="padding: 15px;">
                    <div class="salary-card-header" style="margin-bottom: 15px; border-bottom: none; padding-bottom: 0;">
                        <span style="font-size:1.2rem;">📋</span> Bảng tính công chi tiết
                    </div>
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
                            <div style="display: flex; gap: 15px; font-size: 0.85rem; flex-wrap: wrap;">
                                <div><span style="color:var(--text-secondary)">Giờ vào:</span> <span style="color:#fff;">${timeIn}</span></div>
                                <div><span style="color:var(--text-secondary)">Giờ ra:</span> <span style="color:#fff;">${timeOut}</span></div>
                                <div><span style="color:var(--text-secondary)">Tổng:</span> <span style="color:#fff; font-weight:bold;">${hours}h</span></div>
                            </div>
                        </div>
                        
                        <div class="salary-row-amount">
                            <div style="color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase;">Lương ngày</div>
                            <div style="color: var(--primary); font-weight: bold; font-size: 1.2rem;">${salary}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                </div>

                <!-- 4. GHI CHÚ -->
                <div class="salary-card">
                    <div class="salary-card-header">
                        <span style="font-size:1.2rem;">📝</span> Ghi chú
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.85rem; line-height:1.6; margin-top:12px;">
                        Vui lòng kiểm tra lại bảng lương. Mọi thắc mắc hoặc sai sót về giờ giấc vui lòng liên hệ bộ phận nhân sự để được giải quyết sớm nhất.
                    </div>
                </div>

            </div>
            `;
            
            resultArea.innerHTML = html;"""

content = re.sub(old_html_pattern, new_html, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js layout for vertical mobile-first stacking")

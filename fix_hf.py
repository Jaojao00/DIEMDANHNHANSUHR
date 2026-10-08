import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML generation block
old_html_pattern = r"let html = `[\s\S]*?resultArea\.innerHTML = html;"

new_html = """let html = `
            <style>
                .salary-dashboard-v2 { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; font-family: 'Inter', sans-serif; }
                
                /* Bảng thông tin cá nhân (Top Banner) */
                .sd-banner { background: #1a1b26; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px; }
                .sd-avatar { width: 60px; height: 60px; background: linear-gradient(135deg, #ff7e5f, #feb47b); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; color: #fff; box-shadow: 0 8px 16px rgba(255, 126, 95, 0.3); flex-shrink: 0; }
                .sd-banner-info h2 { margin: 0 0 5px 0; color: #fff; font-size: 1.3rem; }
                .sd-banner-info p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
                
                /* Grid thống kê */
                .sd-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; }
                .sd-stat-box { background: #1a1b26; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px 15px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; position: relative; overflow: hidden; }
                .sd-stat-box::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px; }
                .sd-stat-box.green::before { background: #00e676; }
                .sd-stat-box.blue::before { background: #2979ff; }
                .sd-stat-box.orange::before { background: #ff9100; }
                .sd-stat-box.red::before { background: #ff1744; }
                .sd-stat-value { color: #fff; font-size: 1.5rem; font-weight: bold; }
                .sd-stat-value.green { color: #00e676; }
                .sd-stat-value.blue { color: #2979ff; }
                .sd-stat-value.orange { color: #ff9100; }
                .sd-stat-value.red { color: #ff1744; }
                .sd-stat-label { color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
                
                /* Bảng chi tiết */
                .sd-table-card { background: #1a1b26; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px; overflow-x: auto; }
                .sd-table-header { color: #fff; font-size: 1.1rem; font-weight: bold; margin-bottom: 15px; display: flex; align-items: center; gap: 10px; }
                .sd-table { width: 100%; border-collapse: collapse; min-width: 500px; }
                .sd-table th { text-align: left; padding: 12px 10px; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .sd-table td { padding: 15px 10px; color: #fff; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
                .sd-pill { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; display: inline-block; }
                .sd-pill.success { border: 1px solid #00e676; color: #00e676; background: rgba(0,230,118,0.1); }
                
                /* Responsive cho màn hình rất nhỏ */
                @media (max-width: 400px) {
                    .sd-stats-grid { grid-template-columns: 1fr 1fr; }
                    .sd-avatar { width: 50px; height: 50px; font-size: 1.2rem; }
                }
            </style>
            
            <div class="salary-dashboard-v2">
                
                <!-- Bảng thông tin nhân sự -->
                <div class="sd-banner">
                    <div class="sd-avatar">${empName.charAt(0)}</div>
                    <div class="sd-banner-info">
                        <h2>${empName}</h2>
                        <p>Mã: ${ctvCode} | CCCD: ${empCCCD} | ${empTitle}</p>
                    </div>
                </div>

                <!-- Thống kê nhanh -->
                <div class="sd-stats-grid">
                    <div class="sd-stat-box green">
                        <div class="sd-stat-value green">${res.records.length}</div>
                        <div class="sd-stat-label">Ngày làm việc</div>
                    </div>
                    <div class="sd-stat-box blue">
                        <div class="sd-stat-value blue">${totalHours.toFixed(1)}h</div>
                        <div class="sd-stat-label">Tổng giờ làm</div>
                    </div>
                    <div class="sd-stat-box orange">
                        <div class="sd-stat-value orange">${totalSalary.toLocaleString('vi-VN')}</div>
                        <div class="sd-stat-label">Tổng lương (VNĐ)</div>
                    </div>
                    <div class="sd-stat-box red">
                        <div class="sd-stat-value red">100%</div>
                        <div class="sd-stat-label">Chuyên cần</div>
                    </div>
                </div>

                <!-- Chi tiết chấm công (Table) -->
                <div class="sd-table-card">
                    <div class="sd-table-header">
                        <span>📋</span> Chi Tiết Chấm Công & Lương
                    </div>
                    <table class="sd-table">
                        <thead>
                            <tr>
                                <th>Ngày</th>
                                <th>Thứ</th>
                                <th>Giờ vào</th>
                                <th>Giờ ra</th>
                                <th>Tổng giờ</th>
                                <th>Địa điểm / Ca</th>
                                <th style="text-align:right;">Tiền lương</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            res.records.forEach((record, index) => {
                let dateStr = record['Ngày chấm công'] || '';
                let day = '--', monthYear = '--', shortDate = '--';
                if (dateStr.includes('/')) {
                    let parts = dateStr.split('/');
                    if (parts.length >= 2) {
                        shortDate = parts[0] + '/' + parts[1];
                    } else {
                        shortDate = dateStr;
                    }
                } else {
                    shortDate = dateStr;
                }
                
                const thu = record['Thứ'] || '';
                const salary = record['Lương theo ngày công'] || '0';
                const timeIn = record['Giờ check-in'] || '--:--';
                const timeOut = record['Giờ check-out'] || '--:--';
                const hours = record['Tổng giờ'] || '0';
                const loc = record['Địa điểm'] || record['Khu vực'] || 'N/A';

                html += `
                            <tr>
                                <td style="font-weight: 500;">${shortDate}</td>
                                <td style="color: var(--text-secondary);">${thu}</td>
                                <td>${timeIn}</td>
                                <td>${timeOut}</td>
                                <td>${hours}h</td>
                                <td style="color: var(--text-secondary);">${loc}</td>
                                <td style="text-align:right;">
                                    <span class="sd-pill success">${salary}</span>
                                </td>
                            </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
                
                <!-- Ghi chú -->
                <div class="sd-table-card" style="padding: 15px 20px;">
                    <div class="sd-table-header" style="margin-bottom: 5px; font-size: 1rem;">
                        <span>📝</span> Ghi chú
                    </div>
                    <div style="color:var(--text-secondary); font-size:0.85rem; line-height:1.6;">
                        Vui lòng kiểm tra lại bảng lương. Mọi thắc mắc hoặc sai sót về giờ giấc vui lòng liên hệ bộ phận nhân sự để được giải quyết sớm nhất.
                    </div>
                </div>

            </div>
            `;
            
            resultArea.innerHTML = html;"""

content = re.sub(old_html_pattern, new_html, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js layout for high fidelity dark theme")

import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the HTML generation block
old_html_pattern = r"let html = `[\s\S]*?resultArea\.innerHTML = html;"

new_html = """let html = `
            <style>
                /* Breakout container */
                .sd-breakout {
                    width: 100vw;
                    margin-left: calc(50% - 50vw);
                    display: flex;
                    justify-content: center;
                    font-family: 'Inter', sans-serif;
                    box-sizing: border-box;
                }
                .sd-inner {
                    width: 100%;
                    max-width: 1200px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                /* Layout 2 cột ở trên */
                .sd-top-section {
                    display: flex;
                    gap: 20px;
                    align-items: stretch;
                }
                .sd-profile-col {
                    flex: 0 0 350px;
                    background: #14151f;
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 16px;
                    padding: 25px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                .sd-stats-col {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                
                /* Profile Card */
                .sd-profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 25px; }
                .sd-avatar { width: 70px; height: 70px; background: linear-gradient(135deg, #ff7e5f, #feb47b); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; color: #fff; box-shadow: 0 8px 20px rgba(255, 126, 95, 0.4); flex-shrink: 0; }
                .sd-profile-name { font-size: 1.4rem; color: #fff; font-weight: bold; margin: 0 0 5px 0; }
                .sd-profile-title { color: #ff9100; font-size: 0.9rem; font-weight: 500; margin: 0; }
                .sd-profile-details { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; display: flex; flex-direction: column; gap: 12px; }
                .sd-pd-row { display: flex; justify-content: space-between; font-size: 0.9rem; }
                .sd-pd-label { color: var(--text-secondary); }
                .sd-pd-value { color: #fff; font-weight: 500; text-align: right; }
                
                /* Stats Grid */
                .sd-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                .sd-stat-box { background: #14151f; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px 15px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .sd-stat-box::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 3px; }
                .sd-stat-box.green::before { background: #00e676; }
                .sd-stat-box.blue::before { background: #2979ff; }
                .sd-stat-box.orange::before { background: #ff9100; }
                .sd-stat-box.purple::before { background: #d500f9; }
                
                .sd-stat-val { font-size: 1.6rem; font-weight: bold; }
                .sd-stat-val.green { color: #00e676; }
                .sd-stat-val.blue { color: #2979ff; }
                .sd-stat-val.orange { color: #ff9100; }
                .sd-stat-val.purple { color: #d500f9; }
                .sd-stat-lbl { color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
                
                /* Chart Box */
                .sd-chart-box { background: #14151f; border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; flex: 1; display: flex; flex-direction: column; }
                .sd-chart-header { display: flex; justify-content: space-between; margin-bottom: 20px; color: #fff; font-weight: bold; }
                .sd-chart-bars { display: flex; align-items: flex-end; gap: 10px; height: 100px; flex: 1; }
                .sd-bar { flex: 1; background: #cc5500; border-radius: 4px 4px 0 0; min-height: 5%; transition: height 0.5s; position: relative; }
                .sd-bar:hover { background: #ff7b00; }
                .sd-bar:hover::after { content: attr(data-val); position: absolute; top: -25px; left: 50%; transform: translateX(-50%); background: #fff; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; }
                
                /* Table Box */
                .sd-table-card { background: #14151f; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 25px; overflow-x: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
                .sd-table-header { color: #fff; font-size: 1.1rem; font-weight: bold; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                .sd-table { width: 100%; border-collapse: collapse; min-width: 700px; }
                .sd-table th { text-align: left; padding: 15px 10px; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .sd-table td { padding: 18px 10px; color: #fff; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.03); }
                
                /* Mobile Responsive */
                @media (max-width: 900px) {
                    .sd-top-section { flex-direction: column; }
                    .sd-profile-col { flex: auto; }
                    .sd-stats-grid { grid-template-columns: repeat(2, 1fr); }
                }
                @media (max-width: 500px) {
                    .sd-breakout { padding: 0 10px; }
                    .sd-inner { padding: 0; }
                    .sd-stats-grid { grid-template-columns: 1fr 1fr; }
                    .sd-chart-box { display: none; } /* Hide chart on mobile to save space */
                }
            </style>
            
            <div class="sd-breakout">
             <div class="sd-inner">
                
                <!-- TOP SECTION -->
                <div class="sd-top-section">
                    <!-- PROFILE -->
                    <div class="sd-profile-col">
                        <div class="sd-profile-header">
                            <div class="sd-avatar">${empName.charAt(0)}</div>
                            <div>
                                <h2 class="sd-profile-name">${empName}</h2>
                                <p class="sd-profile-title">${empTitle}</p>
                            </div>
                        </div>
                        <div class="sd-profile-details">
                            <div class="sd-pd-row">
                                <span class="sd-pd-label">Mã Nhân Viên</span>
                                <span class="sd-pd-value">${ctvCode}</span>
                            </div>
                            <div class="sd-pd-row">
                                <span class="sd-pd-label">CCCD</span>
                                <span class="sd-pd-value">${empCCCD}</span>
                            </div>
                            <div class="sd-pd-row">
                                <span class="sd-pd-label">Địa điểm / KV</span>
                                <span class="sd-pd-value" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${empLocation} - ${empRegion}">${empLocation}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- STATS & CHART -->
                    <div class="sd-stats-col">
                        <div class="sd-stats-grid">
                            <div class="sd-stat-box green">
                                <div class="sd-stat-val green">${res.records.length}</div>
                                <div class="sd-stat-lbl">Ngày làm việc</div>
                            </div>
                            <div class="sd-stat-box blue">
                                <div class="sd-stat-val blue">${totalHours.toFixed(1)}h</div>
                                <div class="sd-stat-lbl">Tổng giờ làm</div>
                            </div>
                            <div class="sd-stat-box orange">
                                <div class="sd-stat-val orange">${totalSalary.toLocaleString('vi-VN')}</div>
                                <div class="sd-stat-lbl">Tổng lương (VNĐ)</div>
                            </div>
                            <div class="sd-stat-box purple">
                                <div class="sd-stat-val purple">100%</div>
                                <div class="sd-stat-lbl">Chuyên cần</div>
                            </div>
                        </div>
                        
                        <div class="sd-chart-box">
                            <div class="sd-chart-header">
                                <span>📊 Hiệu suất giờ làm (hàng ngày)</span>
                            </div>
                            <div class="sd-chart-bars">
            `;
            
            // Render chart bars (max 31 days)
            let maxHours = 0;
            res.records.forEach(r => {
                let h = parseFloat(r['Tổng giờ']?.toString().replace(',', '.') || 0);
                if (h > maxHours) maxHours = h;
            });
            if (maxHours === 0) maxHours = 12; // fallback
            
            // Lấy tối đa 15 ngày gần nhất để vẽ biểu đồ cho đẹp
            let chartRecords = res.records.slice(-15);
            chartRecords.forEach(r => {
                let h = parseFloat(r['Tổng giờ']?.toString().replace(',', '.') || 0);
                let pct = (h / (maxHours + 2)) * 100;
                if (pct < 5) pct = 5;
                html += `<div class="sd-bar" style="height: ${pct}%;" data-val="${h}h"></div>`;
            });
            
            html += `
                            </div>
                        </div>
                    </div>
                </div>

                <!-- TABLE SECTION -->
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
                                <th>Lương / Ngày</th>
                                <th>Địa điểm / Ca làm</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            res.records.forEach((record, index) => {
                let dateStr = record['Ngày chấm công'] || '';
                let shortDate = dateStr;
                if (dateStr.includes('/')) {
                    let parts = dateStr.split('/');
                    if (parts.length >= 2) shortDate = parts[0] + '/' + parts[1];
                }
                
                const thu = record['Thứ'] || '';
                const salary = record['Lương theo ngày công'] || '0';
                const timeIn = record['Giờ check-in'] || '--:--';
                const timeOut = record['Giờ check-out'] || '--:--';
                let hours = record['Tổng giờ'] || '0';
                if (!hours.toString().includes('h')) hours += 'h';
                
                const loc = record['Địa điểm'] || record['Khu vực'] || 'N/A';
                
                html += `
                            <tr>
                                <td style="font-weight: bold;">${shortDate}</td>
                                <td style="color: var(--text-secondary);">${thu}</td>
                                <td>${timeIn}</td>
                                <td>${timeOut}</td>
                                <td style="color: #00d2ff; font-weight: bold;">${hours}</td>
                                <td>${salary}đ</td>
                                <td style="color: var(--text-secondary);">${loc}</td>
                            </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>

             </div>
            </div>
            `;
            
            resultArea.innerHTML = html;"""

content = re.sub(old_html_pattern, new_html, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js layout for epic breakout dashboard")

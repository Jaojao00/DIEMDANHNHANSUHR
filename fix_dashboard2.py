import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_block_pattern = r"if \(res\.success && res\.records && res\.records\.length > 0\) \{[\s\S]*?\} else \{"
new_block = """if (res.success && res.records && res.records.length > 0) {
            let totalSalary = 0;
            let totalHours = 0;
            
            res.records.forEach(r => {
                let s = r['Lương theo ngày công'];
                if (s) {
                    let num = parseFloat(s.toString().replace(/,/g, '').replace(/\\./g, '').replace(/[^0-9]/g, ''));
                    if (!isNaN(num)) totalSalary += num;
                }
                let h = r['Tổng giờ'];
                if (h) {
                    let hNum = parseFloat(h.toString().replace(',', '.'));
                    if (!isNaN(hNum)) totalHours += hNum;
                }
            });
            
            const firstRec = res.records[0];
            const empName = firstRec['Họ Tên'] || firstRec['Họ và Tên'] || 'Không rõ';
            const empCCCD = firstRec['CCCD'] || 'N/A';
            const empTitle = firstRec['Chức vụ'] || 'Nhân viên';
            const empLocation = firstRec['Địa điểm'] || firstRec['Khu vực'] || 'N/A';
            const ctvCode = firstRec['Mã CTV (nếu có)'] || firstRec['Mã CTV'] || firstRec['Mã dự án'] || 'N/A';
            
            let html = `
            <div class="salary-dashboard" style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 15px; text-align: left;">
                
                <!-- CỘT TRÁI (Danh sách) -->
                <div class="dashboard-left" style="flex: 1; min-width: 320px; display: flex; flex-direction: column; gap: 20px;">
                    
                    <!-- Các ô thống kê nhanh -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 15px;">
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:rgba(0, 132, 255, 0.1); color:#0084ff; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">📅</div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">Tổng công</div>
                                <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${res.records.length}</div>
                            </div>
                        </div>
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:rgba(255, 123, 0, 0.1); color:var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.2rem;">💰</div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">Tổng lương</div>
                                <div style="color:#fff; font-weight:bold; font-size:1.2rem;">${totalSalary.toLocaleString('vi-VN')}</div>
                            </div>
                        </div>
                        <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; border-radius:50%; background:rgba(0, 200, 83, 0.1); color:#00c853; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">⏱️</div>
                            <div>
                                <div style="color:var(--text-secondary); font-size:0.8rem;">Tổng giờ</div>
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
                
                // Đổi màu viền dựa theo index cho đẹp
                const borderColors = ['linear-gradient(180deg, #ff4b2b, #ff416c)', 'linear-gradient(180deg, #f7b733, #fc4a1a)', 'linear-gradient(180deg, #00c6ff, #0072ff)'];
                const bColor = borderColors[index % borderColors.length];

                html += `
                            <div style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; display: flex; align-items: center; position: relative; overflow: hidden; gap: 15px; flex-wrap: wrap;">
                                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: ${bColor};"></div>
                                
                                <div style="min-width: 65px; text-align:center;">
                                    <div style="font-size: 1.6rem; font-weight: bold; color: #fff; line-height: 1;">${day}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${monthYear}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${thu}</div>
                                </div>
                                
                                <div style="flex: 1; min-width: 140px; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 15px;">
                                    <div style="color: #fff; font-weight: 500; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                                        📍 ${loc}
                                    </div>
                                    <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 0.85rem;">
                                        <div><span style="color:var(--text-secondary)">Giờ vào:</span> <span style="color:#fff;">${timeIn}</span></div>
                                        <div><span style="color:var(--text-secondary)">Giờ ra:</span> <span style="color:#fff;">${timeOut}</span></div>
                                        <div><span style="color:var(--text-secondary)">Tổng:</span> <span style="color:#fff; font-weight:bold;">${hours}h</span></div>
                                    </div>
                                </div>
                                
                                <div style="min-width: 100px; text-align: right; border-left: 1px solid rgba(255,255,255,0.05); padding-left: 15px;">
                                    <div style="color: var(--primary); font-weight: bold; font-size: 1.2rem;">${salary}</div>
                                    <div style="color: var(--text-secondary); font-size: 0.75rem;">Lương ngày</div>
                                </div>
                            </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>

                <!-- CỘT PHẢI (Thông tin nhân sự) -->
                <div class="dashboard-right" style="width: 280px; flex-grow: 1; display: flex; flex-direction: column; gap: 20px;">
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
            
            resultArea.innerHTML = html;
        } else {"""
content = re.sub(old_block_pattern, new_block, content)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated app.js layout for high-fidelity dashboard")

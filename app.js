/**
 * AGR - Hệ Thống Điểm Danh v3.0
 * app.js - Xử lý logic nghiệp vụ toàn cục và bootstrap app
 */

// Sửa hàm escapeHTML để chỉ xử lý null/undefined
window.escapeHTML = function (str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Gộp các DOMContentLoaded handlers và cải tiến repair / clipboard / utils checks
document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo các module nếu tồn tại
  if (typeof EmployeeApp !== 'undefined') EmployeeApp.init();
  if (typeof AdminApp !== 'undefined') AdminApp.init();
  if (typeof EmpNav !== 'undefined') EmpNav.init();

  // Global âm thanh khi click nút (chỉ khi Utils.playClickSound tồn tại)
  document.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest(".nav-item") || e.target.closest(".shift-tab")) {
      if (window.Utils && typeof window.Utils.playClickSound === "function") {
        window.Utils.playClickSound();
      }
    }
  });

  // Khởi tạo ngày lịch main view (xử lý cả input và non-input)
  const mainDateInput = document.getElementById("mainScheduleDateInput");
  if (mainDateInput) {
    const savedDate = localStorage.getItem("agr_schedule_date");
    const setDateText = (text) => {
      if ("value" in mainDateInput) mainDateInput.value = text;
      else mainDateInput.textContent = text;
    };
    if (savedDate) {
      const parts = savedDate.split("-");
      setDateText(parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : savedDate);
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setDateText(`${dd}/${mm}/${yyyy}`);
    }
  }

  // Repair button: chỉ xoá key có tiền tố 'agr_' để tránh mất dữ liệu khác
    const repairBtn = document.getElementById("repairBtn");
  if (repairBtn) {
    repairBtn.addEventListener("click", () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const currentUrl = window.location.href;
      
      // If Android, try to open in Chrome via Intent
      if (/android/i.test(ua)) {
        const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end;`;
        window.location.href = intentUrl;
        
        // Fallback
        setTimeout(() => {
          window.open(currentUrl, '_blank', 'noopener,noreferrer');
        }, 500);
      } else {
        // iOS or desktop
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // Copy selected: fallback cho navigator.clipboard
  const btnCopySelected = document.getElementById("btnCopySelected");
  if (btnCopySelected) {
    btnCopySelected.addEventListener("click", () => {
      const checkedBoxes = document.querySelectorAll(".reg-checkbox:checked");
      if (checkedBoxes.length === 0) return;

      let copyText = "";
      checkedBoxes.forEach((cb) => {
        const tr = cb.closest("tr");
        if (tr) {
          // Tham khảo: dùng data attributes hoặc class để lấy, có fallback sang cell index
          const colManv = tr.querySelector(".col-manv");
          const colHoten = tr.querySelector(".col-hotennv");
          
          let maNV = "";
          let hoTen = "";
          
          if (colManv && colHoten) {
            maNV = colManv.textContent.trim();
            hoTen = colHoten.textContent.trim();
          } else if (tr.cells.length >= 4) {
            maNV = tr.cells[2] ? tr.cells[2].innerText.trim() : "";
            hoTen = tr.cells[3] ? tr.cells[3].innerText.trim() : "";
          }
          
          copyText += maNV + "\t" + hoTen + "\n";
        }
      });

      const doToast = (msg, type) => {
        if (window.Utils && typeof window.Utils.showToast === "function") {
          window.Utils.showToast(msg, type);
        } else {
          alert(msg);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(
          () => doToast(`Đã copy ${checkedBoxes.length} nhân viên vào bộ nhớ tạm!`, "success"),
          (err) => doToast("Lỗi khi copy: " + err, "error")
        );
      } else {
        // Fallback: textarea + execCommand
        const ta = document.createElement("textarea");
        ta.value = copyText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          doToast(`Đã copy ${checkedBoxes.length} nhân viên vào bộ nhớ tạm!`, "success");
        } catch (err) {
          doToast("Lỗi khi copy: " + err, "error");
        }
        document.body.removeChild(ta);
      }
    });
  }
});


window.lookupSalary = async function() {
    const btn = document.getElementById('salaryLookupBtn');
    let empId = document.getElementById('salaryEmpId').value.trim();
    const resultArea = document.getElementById('salaryResultArea');
    
    // Bỏ số 0 ở đầu nếu nhập quá dài
    if (empId.startsWith('0') && empId.length > 11) {
        empId = empId.substring(1);
    }
    
    if (!empId) {
        if(typeof Utils !== 'undefined') Utils.showToast('Vui lòng nhập Mã Nhân Viên hoặc CCCD', 'error');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = 'Đang tra cứu...';
    resultArea.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">Đang lấy dữ liệu...</div>';
    
    try {
        const payload = { action: 'lookup_salary', empId: empId };
        let urlToUse = State.apiLink || (typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : '');
        
        const response = await fetch(urlToUse, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const res = await response.json();
        if (res.success && res.records && res.records.length > 0) {
            let totalSalary = 0;
            let totalHours = 0;
            
            res.records.forEach(r => {
                let s = r['Lương theo ngày công'];
                if (s) {
                    let num = parseFloat(s.toString().replace(/,/g, '').replace(/\./g, '').replace(/[^0-9]/g, ''));
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
            const ctvCode = firstRec['Mã CTV (nếu có)'] || firstRec['Mã CTV'] || 'N/A';
            const empRegion = firstRec['Khu vực'] || 'N/A';
            const empLocation = firstRec['Địa điểm'] || 'N/A';
            const empTitle = firstRec['Chức vụ'] || 'Nhân viên';
            const empCCCD = firstRec['CCCD'] || 'N/A';
            
            let html = `
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
            
            resultArea.innerHTML = html;
        } else {
            resultArea.innerHTML = `
            <div class="vs-empty-state">
              <div class="vs-empty-icon">❌</div>
              <div>Không tìm thấy dữ liệu lương cho mã: ${empId}</div>
            </div>`;
        }
    } catch (e) {
        console.error(e);
        resultArea.innerHTML = `
        <div class="vs-empty-state">
          <div class="vs-empty-icon">⚠️</div>
          <div>Lỗi kết nối. Vui lòng thử lại sau.</div>
        </div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💰 Tra cứu lương';
    }
}

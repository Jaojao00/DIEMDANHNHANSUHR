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

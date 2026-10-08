import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the broken lookupSalary entirely
content = re.sub(r'window\.lookupSalary = async function\(\) \{[\s\S]*', '', content)

new_func = """
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
            let html = '<div style="margin-bottom:15px; font-weight:bold; color:var(--primary);">Tìm thấy ' + res.records.length + ' kết quả cho: ' + empId + '</div>';
            
            res.records.forEach(record => {
                const date = record['Ngày chấm công'] || 'Không rõ';
                const totalHours = record['Tổng giờ'] || '0';
                const salary = record['Lương theo ngày công'] || '0';
                const ctv = record['Mã CTV (nếu có)'] || record['Mã CTV'] || record['Mã dự án'] || 'N/A';
                const name = record['Họ Tên'] || record['Họ và Tên'] || 'Không rõ';
                const shift = record['Ca làm việc'] || record['Thứ'] || 'N/A';
                const title = record['Chức vụ'] || 'N/A';
                const timeIn = record['Giờ check-in'] || '--';
                const timeOut = record['Giờ check-out'] || '--';
                
                html += `
                <div style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px; margin-bottom:15px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px; margin-bottom:10px;">
                        <div>
                            <div style="font-weight:bold; color:#fff; font-size:1.1rem;">${date}</div>
                            <div style="color:var(--text-secondary); font-size:0.85rem; margin-top:4px;">${name} (${ctv})</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="color:var(--primary); font-weight:bold; font-size:1.2rem;">${salary}</div>
                            <div style="color:var(--text-secondary); font-size:0.85rem;">Lương ngày</div>
                        </div>
                    </div>
                    
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.9rem;">
                        <div>
                            <span style="color:var(--text-secondary)">Tổng giờ:</span> 
                            <span style="color:#fff; font-weight:500;">${totalHours}</span>
                        </div>
                        <div>
                            <span style="color:var(--text-secondary)">Chức vụ:</span> 
                            <span style="color:#fff; font-weight:500;">${title}</span>
                        </div>
                        <div>
                            <span style="color:var(--text-secondary)">Giờ vào:</span> 
                            <span style="color:#fff; font-weight:500;">${timeIn}</span>
                        </div>
                        <div>
                            <span style="color:var(--text-secondary)">Giờ ra:</span> 
                            <span style="color:#fff; font-weight:500;">${timeOut}</span>
                        </div>
                    </div>
                </div>
                `;
            });
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
"""

content += new_func

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Restored lookupSalary function safely.")

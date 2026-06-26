import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

methods = '''  loadBookingData: async () => {
    const dp = document.getElementById('bookingDateFilter');
    const targetDate = dp ? dp.value : '';
    if (!targetDate) return;
    
    const tbody = document.getElementById('scheduleBody');
    const thead = document.getElementById('scheduleHead');
    
    // Setup Headers
    thead.innerHTML = `<tr>
      <th>STT</th>
      <th>SHIFT</th>
      <th>LOCATION</th>
      <th>PLAN</th>
      <th>ACTUAL</th>
    </tr>`;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;"><span class="spinner" style="width:14px;height:14px;border:2px solid var(--primary);border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 1s linear infinite;"></span> Đang tải kế hoạch...</td></tr>`;
    
    try {
      const res = await fetch(State.apiLink, {
        method: 'POST',
        body: JSON.stringify({ action: 'get_daily_booking', targetDate: targetDate })
      });
      const result = await res.json();
      if (result.success && result.data) {
        AdminApp.renderBookingTable(result.data);
      } else {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--danger);">Lỗi tải Kế Hoạch: ${result.error || 'Unknown'}</td></tr>`;
      }
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--danger);">Lỗi kết nối Server</td></tr>`;
    }
  },
  
  renderBookingTable: (data) => {
    const tbody = document.getElementById('scheduleBody');
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-secondary);">Không có dữ liệu kế hoạch (PLAN) cho ngày này</td></tr>`;
      return;
    }
    
    let html = '';
    data.forEach((row, index) => {
      const plan = row.plan || 0;
      const actual = row.actual || 0;
      let actualStyle = '';
      if (actual < plan) {
         actualStyle = 'color: var(--danger); font-weight: bold;';
      } else if (actual >= plan && plan > 0) {
         actualStyle = 'color: var(--success); font-weight: bold;';
      }
      
      html += `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 12px 16px;">${index + 1}</td>
          <td style="padding: 12px 16px; font-weight: 500;">${row.shift || ''}</td>
          <td style="padding: 12px 16px;">${row.location || ''}</td>
          <td style="padding: 12px 16px; font-weight: bold;">${plan}</td>
          <td style="padding: 12px 16px; ${actualStyle}">${actual}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  },
  
  // ---- Settings Modal Logic ----'''

# Ensure it hasn't been added yet
if "loadBookingData: async () => {" not in content:
    content = content.replace("  // ---- Settings Modal Logic ----", methods)
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched app.js successfully with methods")
else:
    print("Methods already exist.")

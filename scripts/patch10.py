import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update view mode buttons event listeners
target_view_modes = '''btnViewModeFinal.addEventListener('click', () => {
        AdminApp.currentViewMode = 'final';
        btnViewModeFinal.style.background = 'var(--primary)';
        btnViewModeFinal.style.color = 'white';
        btnViewModeFinal.classList.remove('btn-ghost');
        AdminApp.loadData();
      });
      btnViewModeReg.addEventListener('click', () => {
        AdminApp.currentViewMode = 'registration';
        btnViewModeReg.style.background = 'var(--primary)';
        btnViewModeReg.style.color = 'white';
        btnViewModeReg.classList.remove('btn-ghost');
        AdminApp.loadData();
      });'''

replacement_view_modes = '''btnViewModeFinal.addEventListener('click', () => {
        AdminApp.currentViewMode = 'final';
        btnViewModeFinal.style.background = 'var(--primary)';
        btnViewModeFinal.style.color = 'white';
        btnViewModeFinal.classList.remove('btn-ghost');
        if (document.getElementById('viewModeReg')) {
           document.getElementById('viewModeReg').style.background = 'transparent';
           document.getElementById('viewModeReg').style.color = 'var(--text-secondary)';
           document.getElementById('viewModeReg').classList.add('btn-ghost');
        }
        if (document.getElementById('viewModeBooking')) {
           document.getElementById('viewModeBooking').style.background = 'transparent';
           document.getElementById('viewModeBooking').style.color = 'var(--text-secondary)';
           document.getElementById('viewModeBooking').classList.add('btn-ghost');
        }
        if (document.getElementById('bookingDateFilter')) document.getElementById('bookingDateFilter').style.display = 'none';
        AdminApp.loadData();
      });
      btnViewModeReg.addEventListener('click', () => {
        AdminApp.currentViewMode = 'registration';
        btnViewModeReg.style.background = 'var(--primary)';
        btnViewModeReg.style.color = 'white';
        btnViewModeReg.classList.remove('btn-ghost');
        if (btnViewModeFinal) {
           btnViewModeFinal.style.background = 'transparent';
           btnViewModeFinal.style.color = 'var(--text-secondary)';
           btnViewModeFinal.classList.add('btn-ghost');
        }
        if (document.getElementById('viewModeBooking')) {
           document.getElementById('viewModeBooking').style.background = 'transparent';
           document.getElementById('viewModeBooking').style.color = 'var(--text-secondary)';
           document.getElementById('viewModeBooking').classList.add('btn-ghost');
        }
        if (document.getElementById('bookingDateFilter')) document.getElementById('bookingDateFilter').style.display = 'none';
        AdminApp.loadData();
      });
      const btnViewModeBooking = document.getElementById('viewModeBooking');
      if (btnViewModeBooking) {
        btnViewModeBooking.addEventListener('click', () => {
          AdminApp.currentViewMode = 'booking';
          btnViewModeBooking.style.background = 'var(--primary)';
          btnViewModeBooking.style.color = 'white';
          btnViewModeBooking.classList.remove('btn-ghost');
          if (btnViewModeFinal) {
             btnViewModeFinal.style.background = 'transparent';
             btnViewModeFinal.style.color = 'var(--text-secondary)';
             btnViewModeFinal.classList.add('btn-ghost');
          }
          if (btnViewModeReg) {
             btnViewModeReg.style.background = 'transparent';
             btnViewModeReg.style.color = 'var(--text-secondary)';
             btnViewModeReg.classList.add('btn-ghost');
          }
          const dp = document.getElementById('bookingDateFilter');
          if (dp) {
             dp.style.display = 'block';
             if (!dp.value) {
                const today = new Date();
                dp.value = today.getFullYear() + "-" + String(today.getMonth()+1).padStart(2, '0') + "-" + String(today.getDate()).padStart(2, '0');
             }
          }
          AdminApp.loadBookingData();
        });
      }
      
      const bookingDp = document.getElementById('bookingDateFilter');
      if (bookingDp) {
         bookingDp.addEventListener('change', () => {
            if (AdminApp.currentViewMode === 'booking') AdminApp.loadBookingData();
         });
      }
'''

if target_view_modes in content:
    content = content.replace(target_view_modes, replacement_view_modes)
else:
    print("WARNING: target_view_modes not found!")


# 2. Prevent normal AdminApp.loadData() from firing if viewMode is 'booking'
target_load_data = '''if (AdminApp.currentViewMode === 'registration') {
        AdminApp.renderRegistrationTable([]); // Should not reach here normally, but just in case
        return;
      }'''

replacement_load_data = '''if (AdminApp.currentViewMode === 'registration') {
        AdminApp.renderRegistrationTable([]); // Should not reach here normally, but just in case
        return;
      }
      if (AdminApp.currentViewMode === 'booking') {
        return; // Prevent normal renderTable from overwriting booking view
      }'''

if target_load_data in content:
    content = content.replace(target_load_data, replacement_load_data)
else:
    print("WARNING: target_load_data not found!")


# 3. Add AdminApp.loadBookingData and renderBookingTable
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
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px;"><span class="spinner"></span> Đang tải kế hoạch...</td></tr>`;
    
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

target_insert_methods = '''  // ---- Settings Modal Logic ----'''

if target_insert_methods in content:
    content = content.replace(target_insert_methods, methods)
else:
    print("WARNING: target_insert_methods not found!")


with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched app.js successfully")

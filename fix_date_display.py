import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_html = '''      <!-- Shift Tabs -->
      <div class="shift-tabs-row">
        <div class="shift-tabs-list" id="shiftTabsList"></div>
        <select id="regPeriodSelect" class="status-filter-select" style="display:none; margin-left: 8px; margin-right: 8px; max-width: 150px; padding-right: 28px;" aria-label="Chọn kỳ đăng ký"></select>
        <button class="manager-toggle-btn" id="managerBtn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Quản Lý Lịch</span>
        </button>
        <button class="manager-toggle-btn" id="syncRegistrationBtn" style="margin-left: 8px; background: var(--success); color: white; border-color: transparent;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Chốt Lịch (Tự Động)</span>
        </button>
      </div>'''

new_html = '''      <!-- Shift Tabs -->
      <div class="shift-tabs-row">
        <div class="shift-tabs-list" id="shiftTabsList"></div>
        <select id="regPeriodSelect" class="status-filter-select" style="display:none; margin-left: 8px; margin-right: 8px; max-width: 150px; padding-right: 28px;" aria-label="Chọn kỳ đăng ký"></select>
        <button class="manager-toggle-btn" id="managerBtn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Quản Lý Lịch</span>
        </button>
        <button class="manager-toggle-btn" id="syncRegistrationBtn" style="margin-left: 8px; background: var(--success); color: white; border-color: transparent;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span>Chốt Lịch (Tự Động)</span>
        </button>
      </div>
      
      <!-- Schedule Date Display -->
      <div class="schedule-date-bar" style="display: flex; align-items: center; margin: -5px 20px 15px 20px; background: rgba(255, 255, 255, 0.03); padding: 8px 15px; border-radius: 8px; border: 1px solid var(--border);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary)">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span style="color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">Ngày Lịch Đang Mở:</span>
          <input type="date" id="mainScheduleDateInput" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--text); padding: 4px 10px; border-radius: 4px; outline: none; font-family: inherit; font-size: 0.95rem; cursor: pointer; transition: border-color 0.2s;">
        </div>
        <div style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted); opacity: 0.7;">
          * Ngày hệ thống vẫn chạy theo thời gian thực.
        </div>
      </div>'''

if old_html in html:
    html = html.replace(old_html, new_html)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Replaced index.html successfully")
else:
    print("Could not find old html")

with open('app.js', 'r', encoding='utf-8') as f:
    appjs = f.read()

old_appjs = '''    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
    }
    
    const parsedData = Utils.parseScheduleData(rawData);'''

new_appjs = '''    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
      const mainDateInput = document.getElementById('mainScheduleDateInput');
      if (mainDateInput) mainDateInput.value = datePicker.value;
    }
    
    const parsedData = Utils.parseScheduleData(rawData);'''

if old_appjs in appjs:
    appjs = appjs.replace(old_appjs, new_appjs)
    print("Replaced app.js update logic successfully")
else:
    print("Could not find old appjs update logic")
    
old_init = '''document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});'''

new_init = '''document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  
  // Khởi tạo ngày lịch main view
  const mainDateInput = document.getElementById('mainScheduleDateInput');
  if (mainDateInput) {
    const savedDate = localStorage.getItem('agr_schedule_date');
    if (savedDate) {
      mainDateInput.value = savedDate;
    } else {
      const today = new Date();
      // Format YYYY-MM-DD
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      mainDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    // Khi thay đổi ngày từ main view
    mainDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        localStorage.setItem('agr_schedule_date', e.target.value);
        // Sync with modal
        const datePicker = document.getElementById('scheduleDatePicker');
        if (datePicker) datePicker.value = e.target.value;
        // Reload data
        showLoading();
        setTimeout(() => {
          if (State.selectedShiftId) {
             const tab = document.querySelector(`.shift-tab[data-id="${State.selectedShiftId}"]`);
             if (tab) tab.click();
          }
          hideLoading();
        }, 300);
      }
    });
  }
});'''

if old_init in appjs:
    appjs = appjs.replace(old_init, new_init)
    print("Replaced app.js init logic successfully")
else:
    print("Could not find old app.js init logic")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(appjs)

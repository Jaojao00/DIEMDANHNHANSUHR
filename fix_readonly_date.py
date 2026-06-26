import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_html_input = '''<input type="date" id="mainScheduleDateInput" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--text); padding: 4px 10px; border-radius: 4px; outline: none; font-family: inherit; font-size: 0.95rem; cursor: pointer; transition: border-color 0.2s;">'''
new_html_input = '''<span id="mainScheduleDateInput" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: var(--primary); padding: 4px 10px; border-radius: 4px; font-weight: bold; font-family: monospace; font-size: 1.05rem; letter-spacing: 1px;"></span>'''

if old_html_input in html:
    html = html.replace(old_html_input, new_html_input)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Replaced index.html successfully")
else:
    print("Could not find old html input")

with open('app.js', 'r', encoding='utf-8') as f:
    appjs = f.read()

old_appjs_save = '''    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
      const mainDateInput = document.getElementById('mainScheduleDateInput');
      if (mainDateInput) mainDateInput.value = datePicker.value;
    }'''

new_appjs_save = '''    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
      const mainDateInput = document.getElementById('mainScheduleDateInput');
      if (mainDateInput) {
        const parts = datePicker.value.split('-');
        if (parts.length === 3) {
          mainDateInput.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          mainDateInput.textContent = datePicker.value;
        }
      }
    }'''

if old_appjs_save in appjs:
    appjs = appjs.replace(old_appjs_save, new_appjs_save)
    print("Replaced app.js save successfully")
else:
    print("Could not find old appjs save")

old_appjs_init = '''  // Khởi tạo ngày lịch main view
  const mainDateInput = document.getElementById('mainScheduleDateInput');
  if (mainDateInput) {
    const savedDate = localStorage.getItem('agr_schedule_date');
    if (savedDate) {
      mainDateInput.value = savedDate;
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      mainDateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    
    mainDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        localStorage.setItem('agr_schedule_date', e.target.value);
        // Sync with modal
        const datePicker = document.getElementById('scheduleDatePicker');
        if (datePicker) datePicker.value = e.target.value;
        
        // Reload data
        AdminApp.loadData();
      }
    });
  }'''

new_appjs_init = '''  // Khởi tạo ngày lịch main view
  const mainDateInput = document.getElementById('mainScheduleDateInput');
  if (mainDateInput) {
    const savedDate = localStorage.getItem('agr_schedule_date');
    if (savedDate) {
      const parts = savedDate.split('-');
      if (parts.length === 3) {
        mainDateInput.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        mainDateInput.textContent = savedDate;
      }
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      mainDateInput.textContent = `${dd}/${mm}/${yyyy}`;
    }
  }'''

if old_appjs_init in appjs:
    appjs = appjs.replace(old_appjs_init, new_appjs_init)
    print("Replaced app.js init successfully")
else:
    print("Could not find old appjs init")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(appjs)

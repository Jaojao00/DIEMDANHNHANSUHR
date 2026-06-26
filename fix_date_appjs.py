import re

with open('app.js', 'r', encoding='utf-8') as f:
    appjs = f.read()

old_appjs = '''    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
    }
    
    try {'''

new_appjs = '''    const datePicker = document.getElementById('scheduleDatePicker');
    if (datePicker && datePicker.value) {
      localStorage.setItem('agr_schedule_date', datePicker.value);
      const mainDateInput = document.getElementById('mainScheduleDateInput');
      if (mainDateInput) mainDateInput.value = datePicker.value;
    }
    
    try {'''

if old_appjs in appjs:
    appjs = appjs.replace(old_appjs, new_appjs)
    print("Replaced app.js update logic successfully")
else:
    print("Could not find old appjs update logic")

old_init = '''document.addEventListener('DOMContentLoaded', () => {
  EmployeeApp.init();
  AdminApp.init();
  EmpNav.init();
});'''

new_init = '''document.addEventListener('DOMContentLoaded', () => {
  EmployeeApp.init();
  AdminApp.init();
  EmpNav.init();
  
  // Khởi tạo ngày lịch main view
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
  }
});'''

if old_init in appjs:
    appjs = appjs.replace(old_init, new_init)
    print("Replaced app.js init logic successfully")
else:
    print("Could not find old app.js init logic")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(appjs)

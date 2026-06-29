import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update view mode event listeners
pattern_events = re.compile(r'btnViewModeFinal\.addEventListener\(\'click\', \(\) => \{.*?btnViewModeReg\.addEventListener\(\'click\', \(\) => \{.*?\n\s+\}\);', re.DOTALL)

replacement_events = '''btnViewModeFinal.addEventListener('click', () => {
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
        }'''

if pattern_events.search(content):
    content = pattern_events.sub(replacement_events, content)
else:
    print("WARNING: Events pattern not found")


# 2. Prevent render registration if mode is booking
pattern_render = re.compile(r'(if \(AdminApp\.currentViewMode === \'registration\'\) \{.*?\n\s+return;\n\s+\})', re.DOTALL)
replacement_render = r'''\1
      if (AdminApp.currentViewMode === 'booking') {
        return;
      }'''

if pattern_render.search(content):
    content = pattern_render.sub(replacement_render, content)
else:
    print("WARNING: Render pattern not found")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched app.js successfully")

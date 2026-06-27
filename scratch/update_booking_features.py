import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    app_content = f.read()

# 1. Remove the bad auto-filter logic from loadData
bad_logic = """      if (AdminApp.currentViewMode === 'booking') {
        const shiftFilter = document.getElementById('bookingShiftFilter');
        if (shiftFilter) shiftFilter.value = State.selectedShiftId;
        AdminApp.loadBookingData();
        return;
      }"""
app_content = app_content.replace(bad_logic, "")

# 2. Add it to the shift tab click event instead
old_tab_click = """      tab.addEventListener('click', () => {
        State.selectedShiftId = tab.dataset.shift;
        AdminApp.renderShiftTabs(); // Re-render to update active class
        AdminApp.loadData();
      });"""
new_tab_click = """      tab.addEventListener('click', () => {
        State.selectedShiftId = tab.dataset.shift;
        AdminApp.renderShiftTabs(); // Re-render to update active class
        if (AdminApp.currentViewMode === 'booking') {
           const shiftFilter = document.getElementById('bookingShiftFilter');
           if (shiftFilter) shiftFilter.value = State.selectedShiftId;
           AdminApp.loadBookingData();
        } else {
           AdminApp.loadData();
        }
      });"""
app_content = app_content.replace(old_tab_click, new_tab_click)

# 3. Add default "" to booking shift filter when switching to Booking
old_booking_click = """          if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
          if (bookingTableContainer) bookingTableContainer.style.display = 'block';
          
          AdminApp.loadBookingData();
        });"""
new_booking_click = """          if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
          if (bookingTableContainer) bookingTableContainer.style.display = 'block';
          
          const shiftFilter = document.getElementById('bookingShiftFilter');
          if (shiftFilter) shiftFilter.value = "";
          AdminApp.loadBookingData();
        });"""
app_content = app_content.replace(old_booking_click, new_booking_click)

# 4. Add animation to booking refresh button
old_refresh_click = """    // Booking Refresh Button
    const bookingRefreshBtn = document.getElementById('bookingRefreshBtn');
    if (bookingRefreshBtn) {
      bookingRefreshBtn.addEventListener('click', () => {
        AdminApp.loadBookingData();
      });
    }"""
new_refresh_click = """    // Booking Refresh Button
    const bookingRefreshBtn = document.getElementById('bookingRefreshBtn');
    if (bookingRefreshBtn) {
      bookingRefreshBtn.addEventListener('click', async () => {
        bookingRefreshBtn.classList.add('spin-anim');
        await AdminApp.loadBookingData();
        setTimeout(() => { bookingRefreshBtn.classList.remove('spin-anim'); }, 500);
      });
    }"""
app_content = app_content.replace(old_refresh_click, new_refresh_click)

# 5. Add debounce to date filter
old_date_filter_html = """<input type="date" id="bookingDateFilter" class="status-filter-select" style="min-width: 140px;" onchange="if(typeof App!=='undefined') AdminApp.renderBookingTable();">"""
new_date_filter_html = """<input type="date" id="bookingDateFilter" class="status-filter-select" style="min-width: 140px;">"""

with open('index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()
html_content = html_content.replace(old_date_filter_html, new_date_filter_html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

# Inject debounce logic in app.js setupEvents
setup_events_end = """    // Booking Refresh Button
    const bookingRefreshBtn = document.getElementById('bookingRefreshBtn');"""
debounce_logic = """    // Booking Date Filter Auto-Refresh
    const bookingDateFilter = document.getElementById('bookingDateFilter');
    if (bookingDateFilter) {
      let dateTimeout;
      bookingDateFilter.addEventListener('change', () => {
        clearTimeout(dateTimeout);
        dateTimeout = setTimeout(() => {
          if (typeof AdminApp !== 'undefined') AdminApp.renderBookingTable();
        }, 3000);
      });
    }
    
    // Booking Refresh Button
    const bookingRefreshBtn = document.getElementById('bookingRefreshBtn');"""
app_content = app_content.replace(setup_events_end, debounce_logic)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_content)

# 6. Add CSS for spin-anim
with open('style.css', 'a', encoding='utf-8') as f:
    f.write('''
@keyframes spin {
  100% { transform: rotate(360deg); }
}
.spin-anim svg {
  animation: spin 1s linear infinite;
}
''')

print("Applied updates successfully!")

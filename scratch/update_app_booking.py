import os
import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add booking interval state
if 'bookingInterval: null,' not in content:
    content = content.replace("currentApproveReq: null,", "currentApproveReq: null,\n    bookingInterval: null,\n    bookingData: [],", 1)

# 2. Update view mode toggle
old_toggle = """    // View Mode Toggle
    const btnViewModeFinal = document.getElementById('viewModeFinal');
    const btnViewModeReg = document.getElementById('viewModeReg');
    if (btnViewModeFinal && btnViewModeReg) {
      btnViewModeFinal.addEventListener('click', () => {
        AdminApp.currentViewMode = 'final';
        btnViewModeFinal.style.background = 'var(--primary)';
        btnViewModeFinal.style.color = 'white';
        btnViewModeFinal.classList.remove('btn-ghost');
        btnViewModeReg.style.background = 'transparent';
        btnViewModeReg.style.color = 'var(--text-secondary)';
        btnViewModeReg.classList.add('btn-ghost');
        AdminApp.loadData();
      });
      btnViewModeReg.addEventListener('click', () => {
        AdminApp.currentViewMode = 'registration';
        btnViewModeReg.style.background = 'var(--primary)';
        btnViewModeReg.style.color = 'white';
        btnViewModeReg.classList.remove('btn-ghost');
        btnViewModeFinal.style.background = 'transparent';
        btnViewModeFinal.style.color = 'var(--text-secondary)';
        btnViewModeFinal.classList.add('btn-ghost');
        AdminApp.loadData();
      });
    }"""

new_toggle = """    // View Mode Toggle
    const btnViewModeFinal = document.getElementById('viewModeFinal');
    const btnViewModeReg = document.getElementById('viewModeReg');
    const btnViewModeBooking = document.getElementById('viewModeBooking');
    const scheduleTableContainer = document.getElementById('scheduleTableContainer');
    const bookingTableContainer = document.getElementById('bookingTableContainer');
    
    if (btnViewModeFinal && btnViewModeReg) {
      btnViewModeFinal.addEventListener('click', () => {
        AdminApp.currentViewMode = 'final';
        btnViewModeFinal.style.background = 'var(--primary)'; btnViewModeFinal.style.color = 'white'; btnViewModeFinal.classList.remove('btn-ghost');
        btnViewModeReg.style.background = 'transparent'; btnViewModeReg.style.color = 'var(--text-secondary)'; btnViewModeReg.classList.add('btn-ghost');
        if (btnViewModeBooking) { btnViewModeBooking.style.background = 'transparent'; btnViewModeBooking.style.color = 'var(--text-secondary)'; btnViewModeBooking.classList.add('btn-ghost'); }
        if (scheduleTableContainer) scheduleTableContainer.style.display = 'block';
        if (bookingTableContainer) bookingTableContainer.style.display = 'none';
        AdminApp.loadData();
      });
      btnViewModeReg.addEventListener('click', () => {
        AdminApp.currentViewMode = 'registration';
        btnViewModeReg.style.background = 'var(--primary)'; btnViewModeReg.style.color = 'white'; btnViewModeReg.classList.remove('btn-ghost');
        btnViewModeFinal.style.background = 'transparent'; btnViewModeFinal.style.color = 'var(--text-secondary)'; btnViewModeFinal.classList.add('btn-ghost');
        if (btnViewModeBooking) { btnViewModeBooking.style.background = 'transparent'; btnViewModeBooking.style.color = 'var(--text-secondary)'; btnViewModeBooking.classList.add('btn-ghost'); }
        if (scheduleTableContainer) scheduleTableContainer.style.display = 'block';
        if (bookingTableContainer) bookingTableContainer.style.display = 'none';
        AdminApp.loadData();
      });
      if (btnViewModeBooking) {
        btnViewModeBooking.addEventListener('click', () => {
          AdminApp.currentViewMode = 'booking';
          btnViewModeBooking.style.background = 'var(--primary)'; btnViewModeBooking.style.color = 'white'; btnViewModeBooking.classList.remove('btn-ghost');
          btnViewModeReg.style.background = 'transparent'; btnViewModeReg.style.color = 'var(--text-secondary)'; btnViewModeReg.classList.add('btn-ghost');
          btnViewModeFinal.style.background = 'transparent'; btnViewModeFinal.style.color = 'var(--text-secondary)'; btnViewModeFinal.classList.add('btn-ghost');
          
          if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
          if (bookingTableContainer) bookingTableContainer.style.display = 'block';
          
          AdminApp.loadBookingData();
        });
      }
    }
    
    // Booking Refresh Button
    const bookingRefreshBtn = document.getElementById('bookingRefreshBtn');
    if (bookingRefreshBtn) {
      bookingRefreshBtn.addEventListener('click', () => {
        AdminApp.loadBookingData();
      });
    }"""

if old_toggle in content:
    content = content.replace(old_toggle, new_toggle)
else:
    print("WARNING: old_toggle not found")

# 3. Add loadBookingData and renderBookingTable to AdminApp
booking_funcs = """
    loadBookingData: async () => {
      if (AdminApp.currentViewMode !== 'booking') {
        if (AdminApp.bookingInterval) {
          clearInterval(AdminApp.bookingInterval);
          AdminApp.bookingInterval = null;
        }
        return;
      }
      
      try {
        const res = await fetch(State.apiLink, {
          method: 'POST',
          body: JSON.stringify({ action: 'get_booking' })
        });
        const result = await res.json();
        
        if (result.success) {
          AdminApp.bookingData = result.data;
          AdminApp.renderBookingTable();
        } else {
          console.error("Error loading booking:", result.error);
        }
      } catch (e) {
        console.error("Network error loading booking:", e);
      }
      
      // Setup auto-refresh if not already
      if (!AdminApp.bookingInterval) {
        AdminApp.bookingInterval = setInterval(() => {
          if (AdminApp.currentViewMode === 'booking') {
            AdminApp.loadBookingData();
          }
        }, 15000); // 15 seconds
      }
    },
    
    renderBookingTable: () => {
      const tbody = document.getElementById('bookingBody');
      if (!tbody) return;
      
      if (!AdminApp.bookingData || AdminApp.bookingData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu Booking.</td></tr>`;
        return;
      }
      
      const dateFilter = document.getElementById('bookingDateFilter')?.value; // YYYY-MM-DD
      const shiftFilter = document.getElementById('bookingShiftFilter')?.value;
      const vendorFilter = document.getElementById('bookingVendorFilter')?.value;
      const searchStr = (document.getElementById('bookingSearch')?.value || '').toLowerCase();
      
      // Filter logic
      const filtered = AdminApp.bookingData.filter(b => {
        let match = true;
        
        if (dateFilter) {
          // booking date is expected to be string or object. Convert dateFilter to YYYY-MM-DD or compare parts.
          // Let's assume GAS returns date string matching our timezone
          // "2026-12-04" format
          if (!b.date || !b.date.includes(dateFilter)) {
            // try reformatting YYYY-MM-DD from GAS date ISO
            const d = new Date(b.date);
            const y = d.getFullYear();
            const m = String(d.getMonth()+1).padStart(2,'0');
            const day = String(d.getDate()).padStart(2,'0');
            const dStr = `${y}-${m}-${day}`;
            if (dStr !== dateFilter) match = false;
          }
        }
        
        if (shiftFilter && b.shift !== shiftFilter) match = false;
        if (vendorFilter && b.vendor !== vendorFilter) match = false;
        
        if (searchStr) {
          const tkt = (b.ticket || '').toString().toLowerCase();
          const dept = (b.department || '').toString().toLowerCase();
          const soc = (b.socName || '').toString().toLowerCase();
          if (!tkt.includes(searchStr) && !dept.includes(searchStr) && !soc.includes(searchStr)) {
            match = false;
          }
        }
        
        return match;
      });
      
      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:20px;color:var(--text-muted)">Không có Booking nào khớp với bộ lọc.</td></tr>`;
        return;
      }
      
      let html = '';
      filtered.forEach(b => {
        let commitCell = `<td>${b.commit || ''}</td>`;
        if (b.commit && b.commit.toString().toUpperCase() === 'YES') {
            commitCell = `<td><span class="status-badge checkin">YES</span></td>`;
        } else if (b.commit && b.commit.toString().toUpperCase() === 'NO') {
            commitCell = `<td><span class="status-badge noshow">NO</span></td>`;
        }
        
        let dateStr = b.date;
        try {
            const d = new Date(b.date);
            if (!isNaN(d)) {
                dateStr = String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
            }
        } catch(e) {}
        
        html += `
          <tr>
            ${commitCell}
            <td>${b.ticket || ''}</td>
            <td>${dateStr}</td>
            <td>${b.department || ''}</td>
            <td>${b.socName || ''}</td>
            <td>${b.area || ''}</td>
            <td>${b.shift || ''}</td>
            <td>${b.vendor || ''}</td>
            <td>${b.totalReq || ''}</td>
            <td>${b.totalKpi || ''}</td>
            <td>${b.latestCommit || ''}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    },
"""

# Find a good place to insert the new methods (before loadData)
if 'loadData: async (isSilent = false) => {' in content:
    content = content.replace('loadData: async (isSilent = false) => {', booking_funcs + '\n    loadData: async (isSilent = false) => {', 1)
else:
    print("WARNING: loadData not found")

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("app.js updated successfully!")

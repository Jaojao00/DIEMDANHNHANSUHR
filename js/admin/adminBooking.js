Object.assign(AdminApp, {

  loadBookingData: async (isSilent = false) => {
    if (AdminApp.currentViewMode !== "booking") {
      if (AdminApp.bookingInterval) {
        clearInterval(AdminApp.bookingInterval);
        AdminApp.bookingInterval = null;
      }
      return;
    }

    // 1. OPTIMISTIC UI: Đọc cache hiển thị ngay
    if (!isSilent) {
       try {
          const cached = localStorage.getItem("agr_booking_cache");
          if (cached) {
             AdminApp.bookingData = JSON.parse(cached);
             AdminApp.renderBookingTable();
          }
       } catch(e) {}
    }

    // 2. Fetch dữ liệu mới ngầm
    try {
      const res = await fetch(State.apiLink, {
        method: "POST",
        body: JSON.stringify({ action: "get_booking", adminToken: localStorage.getItem("agr_admin_token") }),
      });
      const result = await res.json();

      if (result.status === "success") {
        AdminApp.bookingData = result.data;
        localStorage.setItem("agr_booking_cache", JSON.stringify(result.data));
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
        if (AdminApp.currentViewMode === "booking") {
          AdminApp.loadBookingData(true);
        }
      }, 15000); // 15 seconds
    }
  },

  renderBookingTable: () => {
    const tbody = document.getElementById("bookingBody");
    if (!tbody) return;

    if (!AdminApp.bookingData || AdminApp.bookingData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--text-muted)">Không có dữ liệu Booking.</td></tr>`;
      return;
    }

    const dateFilter = document.getElementById("bookingDateFilter")?.value; // YYYY-MM-DD
    const shiftFilter = document.getElementById("bookingShiftFilter")?.value;
    const totalReqFilter = document.getElementById("bookingTotalReqFilter")?.value;
    const searchStr = (
      document.getElementById("bookingSearch")?.value || ""
    ).toLowerCase();

    // Filter logic
    const filtered = AdminApp.bookingData.filter((b) => {
      let match = true;

      if (dateFilter) {
        // booking date is expected to be string or object. Convert dateFilter to YYYY-MM-DD or compare parts.
        // Let's assume GAS returns date string matching our timezone
        // "2026-12-04" format
        if (!b.date || !b.date.includes(dateFilter)) {
          // try reformatting YYYY-MM-DD from GAS date ISO
          const d = new Date(b.date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const dStr = `${y}-${m}-${day}`;
          if (dStr !== dateFilter) match = false;
        }
      }

      if (shiftFilter && b.shift !== shiftFilter) match = false;
      if (totalReqFilter) {
         let val = parseInt(b.totalReq) || 0;
         if (totalReqFilter === '>0' && val <= 0) match = false;
         if (totalReqFilter === '0' && val !== 0) match = false;
      }

      if (searchStr) {
        const tkt = (b.ticket || "").toString().toLowerCase();
        const dept = (b.department || "").toString().toLowerCase();
        const soc = (b.socName || "").toString().toLowerCase();
        if (
          !tkt.includes(searchStr) &&
          !dept.includes(searchStr) &&
          !soc.includes(searchStr)
        ) {
          match = false;
        }
      }

      return match;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:20px;color:var(--text-muted)">Không có Booking nào khớp với bộ lọc.</td></tr>`;
      return;
    }

    let html = "";
    filtered.forEach((b) => {
      let commitCell = `<td>${b.commit || ""}</td>`;
      if (b.commit && b.commit.toString().toUpperCase() === "YES") {
        commitCell = `<td><span class="status-badge checkin">YES</span></td>`;
      } else if (b.commit && b.commit.toString().toUpperCase() === "NO") {
        commitCell = `<td><span class="status-badge noshow">NO</span></td>`;
      }

      let dateStr = b.date;
      try {
        const d = new Date(b.date);
        if (!isNaN(d)) {
          dateStr =
            String(d.getDate()).padStart(2, "0") +
            "/" +
            String(d.getMonth() + 1).padStart(2, "0") +
            "/" +
            d.getFullYear();
        }
      } catch (e) {}

      let isSelected = AdminApp.selectedBookings.has(b.ticket);
      html += `
          <tr class="${isSelected ? 'selected-row' : ''}">
            <td style="text-align:center;">
              <input type="checkbox" class="booking-checkbox" data-ticket="${b.ticket}" ${isSelected ? 'checked' : ''} style="cursor:pointer">
            </td>
            ${commitCell}
            <td>${b.ticket || ""}</td>
            <td>${dateStr}</td>
            <td>${b.region || ""}</td>
            <td>${b.department || ""}</td>
            <td>${b.socName || ""}</td>
            <td>${b.area || ""}</td>
            <td>${b.shift || ""}</td>
            <td>${b.vendor || ""}</td>
            <td>${b.totalReq || ""}</td>
            <td>${b.totalKpi || ""}</td>
            <td>${b.latestCommit || ""}</td>
          </tr>
        `;
    });
    tbody.innerHTML = html;

    // Setup checkbox listeners
    const checkboxes = tbody.querySelectorAll('.booking-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        const tId = e.target.dataset.ticket;
        if (e.target.checked) {
          AdminApp.selectedBookings.add(tId);
          e.target.closest('tr').classList.add('selected-row');
        } else {
          AdminApp.selectedBookings.delete(tId);
          e.target.closest('tr').classList.remove('selected-row');
          const selectAll = document.getElementById('selectAllBooking');
          if (selectAll) selectAll.checked = false;
        }
        AdminApp.updateBookingCopyButton();
      });
    });

    const selectAll = document.getElementById('selectAllBooking');
    if (selectAll && filtered.length > 0) {
      let allChecked = true;
      filtered.forEach(b => {
         if (!AdminApp.selectedBookings.has(b.ticket)) allChecked = false;
      });
      selectAll.checked = allChecked;
    } else if (selectAll) {
      selectAll.checked = false;
    }

    AdminApp.updateBookingCopyButton();
  },

  toggleAllBooking: (isChecked) => {
    const shiftFilter = document.getElementById("bookingShiftFilter")?.value;
    const totalReqFilter = document.getElementById("bookingTotalReqFilter")?.value;
    const searchStr = (document.getElementById("bookingSearch")?.value || "").toLowerCase();
    
    const filtered = AdminApp.bookingData.filter((b) => {
      let match = true;
      if (shiftFilter && b.shift !== shiftFilter) match = false;
      if (totalReqFilter) {
         let val = parseInt(b.totalReq) || 0;
         if (totalReqFilter === '>0' && val <= 0) match = false;
         if (totalReqFilter === '0' && val !== 0) match = false;
      }
      if (searchStr) {
        const tkt = (b.ticket || "").toString().toLowerCase();
        const dept = (b.department || "").toString().toLowerCase();
        const soc = (b.socName || "").toString().toLowerCase();
        if (!tkt.includes(searchStr) && !dept.includes(searchStr) && !soc.includes(searchStr)) match = false;
      }
      return match;
    });

    if (isChecked) {
      filtered.forEach(b => AdminApp.selectedBookings.add(b.ticket));
    } else {
      filtered.forEach(b => AdminApp.selectedBookings.delete(b.ticket));
    }
    AdminApp.renderBookingTable();
  },

  updateBookingCopyButton: () => {
    const btn = document.getElementById('btnCopySelectedBooking');
    const countSpan = document.getElementById('copySelectedBookingCount');
    if (btn && countSpan) {
      const count = AdminApp.selectedBookings.size;
      countSpan.textContent = count;
      btn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }
});

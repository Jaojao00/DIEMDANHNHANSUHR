// MODULE ĐIỀU PHỐI BOOKING SOC SOUTH (TAB 3)
const AdminBooking = {
  bookings: [],
  filteredBookings: [],
  selectedIds: new Set(),

  init() {
    this.bindEvents();
    this.initFilters();
  },

  initFilters() {
    const dateInput = document.getElementById('bookingFilterDate');
    if (dateInput) {
      dateInput.value = Utils.formatDateISO();
      dateInput.addEventListener('change', () => this.applyFilters());
    }

    const shiftSelect = document.getElementById('bookingFilterShift');
    if (shiftSelect) {
      shiftSelect.addEventListener('change', () => this.applyFilters());
    }

    const reqSelect = document.getElementById('bookingFilterReq');
    if (reqSelect) {
      reqSelect.addEventListener('change', () => this.applyFilters());
    }

    const searchInput = document.getElementById('bookingSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyFilters());
    }
  },

  bindEvents() {
    // Nút Copy Dữ Liệu gửi Zalo/Telegram
    const btnCopy = document.getElementById('btnCopyBookingReport');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.copyReportFormat());
    }

    // Checkbox chọn tất cả
    const selectAllCheckbox = document.getElementById('chkSelectAllBooking');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        this.selectedIds.clear();
        if (isChecked) {
          this.filteredBookings.forEach((b) => this.selectedIds.add(b.id || b.ticket));
        }
        this.renderTable();
      });
    }

    // Nút Refresh
    const btnRefresh = document.getElementById('btnRefreshBooking');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadBookingData());
    }
  },

  async loadBookingData() {
    const tbody = document.getElementById('adminBookingTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="p-8 text-center text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-agari-red mb-2"></div>
            <div>Đang tải dữ liệu Booking SOC South từ Google Sheets...</div>
          </td>
        </tr>
      `;
    }

    try {
      const res = await DataManager.callApi('get_booking');
      if (res && (res.success || res.status === 'success') && Array.isArray(res.data) && res.data.length > 0) {
        this.bookings = res.data.map(b => ({
          ...b,
          fulfillDate: b.fulfillDate || b.date || '',
          vendorCommit: b.vendorCommit != null ? b.vendorCommit : (b.latestCommit || (b.commit === 'YES' ? b.totalReq : 0))
        }));
      } else {
        this.bookings = this.generateSampleBookings();
      }
      this.applyFilters();
    } catch (err) {
      console.warn('Lỗi tải booking:', err);
      this.bookings = this.generateSampleBookings();
      this.applyFilters();
    }
  },

  applyFilters() {
    const dateVal = document.getElementById('bookingFilterDate')?.value;
    const shiftVal = document.getElementById('bookingFilterShift')?.value;
    const reqVal = document.getElementById('bookingFilterReq')?.value;
    const searchVal = document.getElementById('bookingSearchInput')?.value.toLowerCase().trim();

    let list = this.bookings;

    if (dateVal) {
      list = list.filter((b) => !b.fulfillDate || b.fulfillDate.includes(dateVal) || b.fulfillDate.includes(dateVal.split('-').reverse().join('/')));
    }

    if (shiftVal && shiftVal !== 'ALL') {
      list = list.filter((b) => b.shift === shiftVal);
    }

    if (reqVal === 'GREATER_ZERO') {
      list = list.filter((b) => Number(b.totalReq) > 0);
    } else if (reqVal === 'EQUAL_ZERO') {
      list = list.filter((b) => Number(b.totalReq) === 0);
    }

    if (searchVal) {
      list = list.filter((b) => {
        const t = (b.ticket || '').toLowerCase();
        const d = (b.department || '').toLowerCase();
        const s = (b.socName || '').toLowerCase();
        const a = (b.area || '').toLowerCase();
        return t.includes(searchVal) || d.includes(searchVal) || s.includes(searchVal) || a.includes(searchVal);
      });
    }

    this.filteredBookings = list;
    this.renderTable();
  },

  renderTable() {
    const tbody = document.getElementById('adminBookingTableBody');
    if (!tbody) return;

    if (this.filteredBookings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="p-8 text-center text-slate-400">
            Không tìm thấy thông tin Booking theo bộ lọc.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredBookings.map((b) => {
      const isSelected = this.selectedIds.has(b.id || b.ticket);
      const isCommitEnough = Number(b.vendorCommit || 0) >= Number(b.totalReq || 0);

      return `
        <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/80 text-sm ${isSelected ? 'bg-slate-800/80' : ''}">
          <td class="p-3 text-center">
            <input type="checkbox" class="booking-row-chk rounded bg-slate-900 border-slate-700 text-agari-red focus:ring-0"
                   data-id="${b.id || b.ticket}" ${isSelected ? 'checked' : ''} onchange="AdminBooking.toggleRowSelection('${b.id || b.ticket}')" />
          </td>
          <td class="p-3 font-mono font-bold text-agari-yellow">${b.ticket || 'TKT-' + Math.floor(1000 + Math.random()*9000)}</td>
          <td class="p-3 text-white font-medium">${b.socName || 'SOC Cần Thơ'}</td>
          <td class="p-3 text-slate-300 text-xs">${b.area || 'Miền Nam'}</td>
          <td class="p-3 text-slate-300 text-xs">${b.department || 'Vận hành Kho'}</td>
          <td class="p-3 font-mono text-slate-400 text-xs">${b.shift || '18:00-22:00'}</td>
          <td class="p-3 text-center font-mono font-bold text-white">${b.totalReq || 0}</td>
          <td class="p-3 text-center font-mono font-bold ${isCommitEnough ? 'text-emerald-400' : 'text-amber-400'}">
            ${b.vendorCommit || 0}
          </td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 text-xs rounded-full font-bold ${isCommitEnough ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}">
              ${isCommitEnough ? 'Đạt Commit' : 'Thiếu Nhân Sự'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  },

  toggleRowSelection(id) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
    this.renderTable();
  },

  /**
   * Định dạng văn bản báo cáo chuẩn gửi Zalo/Telegram
   */
  copyReportFormat() {
    let targetItems = this.filteredBookings;
    if (this.selectedIds.size > 0) {
      targetItems = this.bookings.filter((b) => this.selectedIds.has(b.id || b.ticket));
    }

    if (!targetItems.length) {
      Utils.toast('Vui lòng chọn ít nhất một booking để copy báo cáo', 'warning');
      return;
    }

    const todayStr = Utils.formatDateVN();
    let text = `📢 [BÁO CÁO NHÂN SỰ BOOKING SOC - AGARI HR]\n`;
    text += `🗓️ Ngày: ${todayStr}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;

    targetItems.forEach((b, i) => {
      text += `📍 [${i + 1}] ${b.socName || 'SOC'} (${b.shift || 'Ca'})\n`;
      text += `   • Yêu cầu (Req): ${b.totalReq || 0} NV\n`;
      text += `   • Đáp ứng (Commit): ${b.vendorCommit || 0} NV\n`;
      text += `   • Tình trạng: ${Number(b.vendorCommit || 0) >= Number(b.totalReq || 0) ? '✅ Đủ số lượng' : '⚠️ Cần bù thêm'}\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🚀 Báo cáo tự động từ Hệ thống Điểm Danh AGARI HR`;

    navigator.clipboard.writeText(text).then(() => {
      Utils.toast('Đã copy báo cáo chuẩn Zalo/Telegram vào Clipboard!', 'success');
    }).catch(() => {
      prompt('Nhấn Ctrl+C để sao chép báo cáo:', text);
    });
  },

  generateSampleBookings() {
    return [
      { id: '1', ticket: 'TKT-1081', fulfillDate: '2026-10-14', region: 'South', department: 'Inbound', socName: 'SOC Cần Thơ', area: 'Thốt Nốt', shift: '18:00-22:00', vendor: 'AGARI', totalReq: 25, vendorCommit: 25, totalKpi: 100 },
      { id: '2', ticket: 'TKT-1082', fulfillDate: '2026-10-14', region: 'South', department: 'Outbound', socName: 'SOC Cần Thơ', area: 'Thốt Nốt', shift: '22:00-06:00', vendor: 'AGARI', totalReq: 30, vendorCommit: 28, totalKpi: 95 },
      { id: '3', ticket: 'TKT-1083', fulfillDate: '2026-10-14', region: 'South', department: 'Sortation', socName: 'SOC Hậu Giang', area: 'Châu Thành', shift: '06:00-15:00', vendor: 'AGARI', totalReq: 15, vendorCommit: 15, totalKpi: 100 },
      { id: '4', ticket: 'TKT-1084', fulfillDate: '2026-10-14', region: 'South', department: 'Hub Delivery', socName: 'SOC An Giang', area: 'Long Xuyên', shift: '13:00-22:00', vendor: 'AGARI', totalReq: 10, vendorCommit: 12, totalKpi: 110 }
    ];
  }
};

if (typeof window !== 'undefined') {
  window.AdminBooking = AdminBooking;
}

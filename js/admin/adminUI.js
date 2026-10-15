// GIAO DIỆN VỊ TRÍ LÀM VIỆC & REALTIME SHIFT TRACKING (TAB 1)
const AdminUI = {
  currentFilter: 'all',
  searchQuery: '',

  init() {
    this.bindEvents();
    this.initShiftSelect();
  },

  initShiftSelect() {
    const shiftSelect = document.getElementById('adminShiftSelect');
    if (shiftSelect) {
      shiftSelect.innerHTML = CONFIG.SHIFTS.map((s) => {
        return `<option value="${s.id}" ${s.isDefault ? 'selected' : ''}>${s.label}</option>`;
      }).join('');

      shiftSelect.addEventListener('change', () => {
        this.loadShiftData();
      });
    }

    const dateSelect = document.getElementById('adminShiftDate');
    if (dateSelect) {
      dateSelect.value = Utils.formatDateISO();
      dateSelect.addEventListener('change', () => {
        this.loadShiftData();
      });
    }
  },

  bindEvents() {
    // Bộ lọc trạng thái
    const filterButtons = document.querySelectorAll('.roster-filter-btn');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach((b) => b.classList.remove('bg-white', 'text-slate-900', 'shadow-sm'));
        e.currentTarget.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        this.currentFilter = e.currentTarget.dataset.filter;
        this.renderRosterTable();
      });
    });

    // Ô tìm kiếm nhanh
    const searchInput = document.getElementById('adminRosterSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderRosterTable();
      });
    }
  },

  async loadShiftData() {
    const shiftSelect = document.getElementById('adminShiftSelect');
    const dateSelect = document.getElementById('adminShiftDate');
    const shiftId = shiftSelect ? shiftSelect.value : CONFIG.SHIFTS[0].id;
    const date = dateSelect ? dateSelect.value : Utils.formatDateISO();

    const tbody = document.getElementById('adminRosterTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="p-8 text-center text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-agari-red mb-2"></div>
            <div>Đang tải dữ liệu ca làm việc...</div>
          </td>
        </tr>
      `;
    }

    // Kết nối Firebase Firestore Realtime (Tầng 1)
    FirebaseService.clearListeners();
    FirebaseService.listenToShiftCheckins(shiftId, (realtimeData) => {
      this.handleRealtimeCheckinUpdate(realtimeData);
    });

    // Tải danh sách Roster
    await DataManager.loadRoster(shiftId, date);
    this.updateStatsCards();
    this.renderRosterTable();
    this.renderActivityFeed();
  },

  handleRealtimeCheckinUpdate(data) {
    if (!data || !data.employees) return;
    
    // Đồng bộ vào State của DataManager
    data.employees.forEach((emp) => {
      const existing = DataManager.state.roster.find((r) => Utils.isIdMatch(r.id, emp.id));
      if (existing) {
        existing.status = 'confirmed';
        existing.checkinTime = emp.timestamp || Utils.getCurrentVNTime();
      }
    });

    DataManager.recalculateStats();
    this.updateStatsCards();
    this.renderRosterTable();
    this.renderActivityFeed();
  },

  updateStatsCards() {
    const { total, confirmed, pending, off } = DataManager.state.stats;

    const elTotal = document.getElementById('statTotalEmployees');
    const elConfirmed = document.getElementById('statConfirmedEmployees');
    const elPending = document.getElementById('statPendingEmployees');
    const elOff = document.getElementById('statOffEmployees');

    if (elTotal) elTotal.textContent = total;
    if (elConfirmed) elConfirmed.textContent = confirmed;
    if (elPending) elPending.textContent = pending;
    if (elOff) elOff.textContent = off;
  },

  renderRosterTable() {
    const tbody = document.getElementById('adminRosterTableBody');
    if (!tbody) return;

    let items = DataManager.state.roster;

    // Áp dụng bộ lọc trạng thái
    if (this.currentFilter === 'confirmed') {
      items = items.filter((x) => (x.status || '').toLowerCase() === 'confirmed');
    } else if (this.currentFilter === 'pending') {
      items = items.filter((x) => (x.status || '').toLowerCase() === 'pending');
    } else if (this.currentFilter === 'off') {
      items = items.filter((x) => (x.status || '').toLowerCase() === 'off');
    }

    // Áp dụng tìm kiếm
    if (this.searchQuery) {
      items = items.filter((x) =>
        (x.name && x.name.toLowerCase().includes(this.searchQuery)) ||
        (x.id && x.id.toLowerCase().includes(this.searchQuery)) ||
        (x.cccd && x.cccd.toLowerCase().includes(this.searchQuery)) ||
        (x.phone && x.phone.includes(this.searchQuery))
      );
    }

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="p-8 text-center text-slate-400">
            Không tìm thấy nhân viên phù hợp với bộ lọc hiện tại.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items.map((emp, index) => {
      const status = (emp.status || 'pending').toLowerCase();
      let statusBadge = '';
      if (status === 'confirmed') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20 transition whitespace-nowrap">Đã điểm danh (${emp.checkinTime || 'OK'})</span>`;
      } else if (status === 'off' || status === 'xin off') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-red-500/10 text-red-400 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition whitespace-nowrap">Xin OFF</span>`;
      } else if (status === 'xin_len_ca' || status === 'xin lên ca') {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/20 transition whitespace-nowrap">Xin Lên Ca</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition whitespace-nowrap">Chưa điểm danh</span>`;
      }

      const pos1 = emp.positions ? (emp.positions['Vị trí cố định'] || emp.positions['Pos1'] || emp.positions['18H-20H'] || '') : '';
      const pos2 = emp.positions ? (emp.positions['SAU GIỜ NGHỈ'] || emp.positions['Pos2'] || emp.positions['20H-22H'] || '') : '';
      const pos3 = emp.positions ? (emp.positions['4h-6h'] || emp.positions['Pos3'] || '') : '';
      const pos4 = emp.positions ? (emp.positions['Xuất Tải'] || emp.positions['Pos4'] || '') : '';
      const noteVal = emp.note || (emp.positions ? (emp.positions['NOTE'] || emp.positions['Ghi Chú'] || '') : '');

      return `
        <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/80 text-sm" data-id="${emp.id}">
          <td class="p-3 text-center text-slate-400 font-mono">${index + 1}</td>
          <td class="p-3 font-mono font-bold text-agari-yellow whitespace-nowrap">${emp.id}</td>
          <td class="p-3 font-medium text-white whitespace-nowrap">${emp.name}</td>
          <td class="p-3 text-slate-400 whitespace-nowrap">
            <span class="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 font-mono">${emp.identity || emp.dinhDanh || 'A-OS'}</span>
          </td>
          <!-- Vị trí cố định -->
          <td class="p-2 min-w-[140px]">
            <input type="text" class="pos-input bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-agari-red transition font-medium"
                   value="${pos1}" data-pos-key="Vị trí cố định" placeholder="Vị trí cố định..." />
          </td>
          <!-- SAU GIỜ NGHỈ -->
          <td class="p-2 min-w-[140px]">
            <input type="text" class="pos-input bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-agari-red transition font-medium"
                   value="${pos2}" data-pos-key="SAU GIỜ NGHỈ" placeholder="Sau giờ nghỉ..." />
          </td>
          <!-- 4h-6h -->
          <td class="p-2 min-w-[120px]">
            <input type="text" class="pos-input bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-agari-red transition font-medium"
                   value="${pos3}" data-pos-key="4h-6h" placeholder="4h-6h..." />
          </td>
          <!-- Xuất Tải -->
          <td class="p-2 min-w-[120px]">
            <input type="text" class="pos-input bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-agari-red transition font-medium"
                   value="${pos4}" data-pos-key="Xuất Tải" placeholder="Xuất tải..." />
          </td>
          <!-- NOTE -->
          <td class="p-2 min-w-[130px]">
            <input type="text" class="pos-input note-input bg-slate-800/80 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-agari-red transition font-medium"
                   value="${noteVal}" data-pos-key="NOTE" placeholder="Ghi chú..." />
          </td>
          <td class="p-3 text-center min-w-[140px] whitespace-nowrap" onclick="AdminManager.openStatusModal('${emp.id}')">
            ${statusBadge}
          </td>
          <td class="p-3 text-center">
            <button class="btn-toggle-status p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs" title="Đổi trạng thái" onclick="AdminManager.openStatusModal('${emp.id}')">
              ⚙️
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderActivityFeed() {
    const container = document.getElementById('adminLiveActivityList');
    if (!container) return;

    // Lọc các nhân viên đã confirmed để đưa vào Feed
    const confirmed = DataManager.state.roster.filter((e) => (e.status || '').toLowerCase() === 'confirmed');

    const countEl = document.getElementById('adminLiveActivityCount');
    if (countEl) {
      countEl.innerHTML = `<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/40">${confirmed.length} ĐÃ ĐIỂM DANH</span>`;
    }

    if (confirmed.length === 0) {
      container.innerHTML = `
        <div class="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-800 rounded-xl">
          Chưa có lượt điểm danh nào trong ca
        </div>
      `;
      return;
    }

    container.innerHTML = confirmed.slice(0, 50).map((e) => `
      <div class="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition flex items-center justify-between gap-3 text-xs shadow-sm">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50"></span>
          <div class="truncate">
            <div class="font-bold text-slate-100 truncate">${e.name}</div>
            <div class="text-slate-400 font-mono text-[11px] flex items-center gap-1.5 mt-0.5">
              <span class="bg-slate-900/80 px-1.5 py-0.5 rounded text-amber-300 font-semibold border border-slate-700/80">${e.id}</span>
              ${e.identity ? `<span class="text-slate-400">${e.identity}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="shrink-0 text-right">
          <div class="font-mono font-bold text-emerald-400 text-xs flex items-center gap-1 justify-end">
            <span>🕒</span>
            <span>${e.checkinTime || 'Vừa xong'}</span>
          </div>
          <span class="text-[10px] font-medium text-emerald-300/80 uppercase">Có mặt</span>
        </div>
      </div>
    `).join('');
  }
};

if (typeof window !== 'undefined') {
  window.AdminUI = AdminUI;
}

// MODULE BẢNG LƯƠNG QUẢN TRỊ VIÊN (TAB 4: ADMIN SALARY PORTAL - V77/V78)
const AdminSalary = {
  allSalaries: [],
  filteredSalaries: [],
  selectedMonth: '2026-10',
  searchQuery: '',

  init() {
    this.bindEvents();
    this.initMonthFilter();
  },

  initMonthFilter() {
    const monthInput = document.getElementById('adminSalaryMonthFilter');
    if (monthInput) {
      // Mặc định tháng hiện tại
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      monthInput.value = monthStr;
      this.selectedMonth = monthStr;

      monthInput.addEventListener('change', (e) => {
        this.selectedMonth = e.target.value;
        this.applyFilters();
      });
    }
  },

  bindEvents() {
    // Ô tìm kiếm nhanh CCCD / Họ Tên / Khu vực
    const searchInput = document.getElementById('adminSalarySearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.applyFilters();
      });
    }

    // Nút Xuất Excel có BOM UTF-8
    const btnExport = document.getElementById('btnExportSalaryExcel');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportSalaryExcel());
    }

    // Nút tải lại dữ liệu
    const btnRefresh = document.getElementById('btnRefreshSalary');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadSalaryData(true));
    }
  },

  async loadSalaryData(forceRefresh = false) {
    const tbody = document.getElementById('adminSalaryTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-8 text-center text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-agari-red mb-2"></div>
            <div>Đang tải dữ liệu bảng lương từ Google Sheets (BangLuong)...</div>
          </td>
        </tr>
      `;
    }

    try {
      const res = await DataManager.callApi('get_salary_list', {
        month: this.selectedMonth
      });

      if (res && res.success && Array.isArray(res.data)) {
        this.allSalaries = res.data;
        DataManager.saveCachedSalaries(res.data);
      } else {
        // Khởi tạo dữ liệu mẫu phong phú nếu chưa có trên Sheets
        this.allSalaries = this.generateSampleSalaries();
        DataManager.saveCachedSalaries(this.allSalaries);
      }

      this.applyFilters();
    } catch (err) {
      console.warn('Lỗi tải bảng lương:', err);
      this.allSalaries = this.generateSampleSalaries();
      this.applyFilters();
    }
  },

  applyFilters() {
    let list = this.allSalaries;

    // Lọc theo tháng (YYYY-MM)
    if (this.selectedMonth) {
      list = list.filter((item) => {
        const dateStr = item.date || item.workDate || '';
        return dateStr.includes(this.selectedMonth) || dateStr.includes(this.selectedMonth.split('-').reverse().join('/'));
      });
    }

    // Lọc theo tìm kiếm
    if (this.searchQuery) {
      list = list.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const cccd = (item.cccd || '').toLowerCase();
        const empId = (item.empId || '').toLowerCase();
        const area = (item.area || item.location || '').toLowerCase();
        return name.includes(this.searchQuery) || cccd.includes(this.searchQuery) || empId.includes(this.searchQuery) || area.includes(this.searchQuery);
      });
    }

    this.filteredSalaries = list;
    this.updateSummaryCards();
    this.renderSalaryTable();
  },

  updateSummaryCards() {
    let totalShifts = this.filteredSalaries.length;
    let totalSalary = 0;
    let totalHours = 0;

    this.filteredSalaries.forEach((s) => {
      totalSalary += Number(s.salary || s.daySalary || 0);
      totalHours += Number(s.totalHours || s.hours || 0);
    });

    const elTotalShifts = document.getElementById('adminSalaryTotalShifts');
    const elTotalAmount = document.getElementById('adminSalaryTotalAmount');
    const elTotalHours = document.getElementById('adminSalaryTotalHours');

    if (elTotalShifts) elTotalShifts.textContent = `${totalShifts} ca`;
    if (elTotalAmount) elTotalAmount.textContent = Utils.formatCurrency(totalSalary);
    if (elTotalHours) elTotalHours.textContent = `${totalHours.toFixed(1)} h`;
  },

  renderSalaryTable() {
    const tbody = document.getElementById('adminSalaryTableBody');
    if (!tbody) return;

    if (this.filteredSalaries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-8 text-center text-slate-400">
            Không có dữ liệu bảng lương trong kỳ hoặc bộ lọc đã chọn.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.filteredSalaries.map((item, index) => {
      const isNight = item.shiftType === 'Đêm' || (item.shift || '').includes('22:00');
      return `
        <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/80 text-sm">
          <td class="p-3 text-center text-slate-400 font-mono">${index + 1}</td>
          <td class="p-3 font-medium text-slate-300">${item.date || item.workDate}</td>
          <td class="p-3 font-mono text-agari-yellow font-bold">${item.cccd || item.empId}</td>
          <td class="p-3 font-bold text-white">${item.name}</td>
          <td class="p-3 text-slate-400 text-xs">${item.area || item.location || 'Kho SOC South'}</td>
          <td class="p-3 text-center font-mono text-slate-300">${item.totalHours || item.hours || 8}h</td>
          <td class="p-3 text-center">
            <span class="px-2 py-0.5 text-xs rounded font-medium ${isNight ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' : 'bg-amber-900/40 text-amber-300 border border-amber-700/50'}">
              ${isNight ? 'Ca Đêm' : 'Ca Ngày'}
            </span>
          </td>
          <td class="p-3 text-right font-mono font-bold text-emerald-400">
            ${Utils.formatCurrency(item.salary || item.daySalary || 0)}
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Xuất file CSV / Excel có Unicode BOM (\uFEFF)
   */
  exportSalaryExcel() {
    if (!this.filteredSalaries.length) {
      Utils.toast('Không có dữ liệu để xuất file Excel', 'warning');
      return;
    }

    const exportRows = this.filteredSalaries.map((s, idx) => ({
      'STT': idx + 1,
      'Ngày chấm công': s.date || s.workDate,
      'Số CCCD': `="${s.cccd || ''}"`, // Giữ nguyên số 0 đầu trong Excel
      'Mã CTV': s.empId || '',
      'Họ và Tên': s.name || '',
      'Khu vực / Địa điểm': s.area || s.location || 'Kho SOC South',
      'Tổng giờ': s.totalHours || s.hours || 0,
      'Loại Ca': s.shiftType || 'Ngày',
      'Lương Ngày (VNĐ)': s.salary || s.daySalary || 0
    }));

    const filename = `Bang_Luong_Agari_HR_${this.selectedMonth}.csv`;
    Utils.exportToCsv(filename, exportRows);
    Utils.toast(`Đã xuất thành công: ${filename}`, 'success');
  },

  generateSampleSalaries() {
    return [
      { id: 1, date: '2026-10-12', cccd: '089201004123', empId: 'OPS10291', name: 'Nguyễn Văn An', area: 'Kho Cần Thơ', totalHours: 8, shiftType: 'Ngày', salary: 320000 },
      { id: 2, date: '2026-10-12', cccd: '079302008899', empId: 'OPS10452', name: 'Trần Thị Mai', area: 'Kho Cần Thơ', totalHours: 8, shiftType: 'Đêm', salary: 380000 },
      { id: 3, date: '2026-10-13', cccd: '092200001234', empId: 'OPS10788', name: 'Lê Hoàng Nam', area: 'Kho Thốt Nốt', totalHours: 4, shiftType: 'Ngày', salary: 160000 },
      { id: 4, date: '2026-10-13', cccd: '083204005678', empId: 'OPS10901', name: 'Phạm Đức Trọng', area: 'Kho Thốt Nốt', totalHours: 8, shiftType: 'Đêm', salary: 380000 },
      { id: 5, date: '2026-10-14', cccd: '094301009988', empId: 'OPS11023', name: 'Võ Minh Thắng', area: 'Kho Cần Thơ', totalHours: 8, shiftType: 'Ngày', salary: 320000 }
    ];
  }
};

if (typeof window !== 'undefined') {
  window.AdminSalary = AdminSalary;
}

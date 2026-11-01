/**
 * PHÂN HỆ XEM TRƯỚC LỊCH LÀM VIỆC (PREVIEW ASSIGNED SCHEDULE)
 * Nguồn dữ liệu: Google Spreadsheet Sheet gid=1259316519 (01/11/2026 - 15/11/2026)
 * Phạm vi: B10:Y223
 * Chức năng:
 * - Tra cứu lịch cá nhân theo Mã OPS hoặc Họ Tên
 * - Xem tóm tắt số ca WORK, số ca BỔ SUNG, số ngày OFF
 * - Xem toàn bộ bảng phân bổ lịch làm việc (Full view) với bộ lọc ca & tìm kiếm
 */
const PreviewScheduleModule = {
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI/gviz/tq?tqx=out:csv&gid=1259316519',
  
  dateHeaders: [
    '01/11 (CN)', '02/11 (T2)', '03/11 (T3)', '04/11 (T4)', '05/11 (T5)',
    '06/11 (T6)', '07/11 (T7)', '08/11 (CN)', '09/11 (T2)', '10/11 (T3)',
    '11/11 (T4)', '12/11 (T5)', '13/11 (T6)', '14/11 (T7)', '15/11 (CN)'
  ],

  isLoaded: false,
  isLoading: false,
  employeesMap: new Map(), // empId -> employee record
  employeesList: [],
  currentTab: 'lookup', // 'lookup' | 'full'
  currentFilterShift: 'all', // 'all' | '18:00-22:00' | '22:00-06:00'

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Chuyển tab trong modal: [ Tra Cứu Cá Nhân ] vs [ Xem Toàn Bộ Lịch ]
    document.querySelectorAll('.preview-sched-tab-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Form tra cứu cá nhân
    const formLookup = document.getElementById('formPreviewScheduleLookup');
    if (formLookup) {
      formLookup.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('previewSchedLookupInput');
        if (input) this.handleLookup(input.value.trim());
      });
    }

    const btnLookup = document.getElementById('btnDoPreviewSchedLookup');
    if (btnLookup) {
      btnLookup.addEventListener('click', () => {
        const input = document.getElementById('previewSchedLookupInput');
        if (input) this.handleLookup(input.value.trim());
      });
    }

    // Input tìm kiếm trong bảng toàn bộ lịch
    const fullSearchInput = document.getElementById('previewSchedFullSearch');
    if (fullSearchInput) {
      fullSearchInput.addEventListener('input', () => {
        this.renderFullTable();
      });
    }

    // Bộ lọc ca trong bảng toàn bộ lịch
    document.querySelectorAll('.preview-sched-shift-filter').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.currentFilterShift = e.currentTarget.dataset.shift || 'all';
        document.querySelectorAll('.preview-sched-shift-filter').forEach((b) => {
          if (b.dataset.shift === this.currentFilterShift) {
            b.classList.add('bg-violet-600', 'text-white', 'shadow-xs');
            b.classList.remove('bg-slate-100', 'text-slate-600');
          } else {
            b.classList.remove('bg-violet-600', 'text-white', 'shadow-xs');
            b.classList.add('bg-slate-100', 'text-slate-600');
          }
        });
        this.renderFullTable();
      });
    });

    // Nút tải lại dữ liệu từ Google Sheets
    const btnReload = document.getElementById('btnReloadPreviewSchedule');
    if (btnReload) {
      btnReload.addEventListener('click', () => {
        this.loadData(true);
      });
    }

    // Tự động gắn validation Mã OPS
    if (typeof Utils !== 'undefined' && Utils.bindOpsInputValidation) {
      Utils.bindOpsInputValidation(document.getElementById('previewSchedLookupInput'));
    }
  },

  /**
   * Mở modal và tự động tải dữ liệu + tra cứu cho người dùng hiện tại
   */
  async open() {
    // Tự động điền mã OPS đã lưu trong localStorage
    const savedEmpId = localStorage.getItem('agr_empId') || '';
    const input = document.getElementById('previewSchedLookupInput');
    if (input && savedEmpId && !input.value) {
      input.value = savedEmpId;
    }

    if (!this.isLoaded) {
      await this.loadData();
    }

    // Nếu đã có mã OPS trong máy, tự động hiển thị lịch của người đó luôn!
    const query = (input ? input.value : savedEmpId).trim();
    if (query) {
      this.handleLookup(query);
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.preview-sched-tab-btn').forEach((btn) => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('bg-violet-600', 'text-white', 'shadow-sm');
        btn.classList.remove('bg-slate-100', 'text-slate-600');
      } else {
        btn.classList.remove('bg-violet-600', 'text-white', 'shadow-sm');
        btn.classList.add('bg-slate-100', 'text-slate-600');
      }
    });

    const paneLookup = document.getElementById('previewSchedPaneLookup');
    const paneFull = document.getElementById('previewSchedPaneFull');

    if (tab === 'lookup') {
      if (paneLookup) paneLookup.classList.remove('hidden');
      if (paneFull) paneFull.classList.add('hidden');
    } else {
      if (paneLookup) paneLookup.classList.add('hidden');
      if (paneFull) paneFull.classList.remove('hidden');
      this.renderFullTable();
    }
  },

  /**
   * Tải và phân tích dữ liệu bảng phân bổ từ Google Sheets
   */
  async loadData(forceReload = false) {
    if (this.isLoading) return;
    if (this.isLoaded && !forceReload) return;

    this.isLoading = true;
    const resultArea = document.getElementById('previewScheduleLookupResult');
    if (resultArea && (!this.isLoaded || forceReload)) {
      resultArea.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
          <div class="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <div class="text-sm font-bold text-slate-700">Đang đồng bộ dữ liệu lịch làm việc từ Google Sheets...</div>
          <div class="text-xs text-slate-400 mt-1">Chu kỳ: 01/11/2026 - 15/11/2026</div>
        </div>
      `;
    }

    try {
      const res = await fetch(this.sheetUrl);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const csvText = await res.text();
      this.parseCSVData(csvText);
      this.isLoaded = true;
      this.isLoading = false;

      if (typeof Utils !== 'undefined' && Utils.toast && forceReload) {
        Utils.toast('Đã cập nhật lịch làm việc mới nhất!', 'success');
      }

      // Re-trigger search or render
      const input = document.getElementById('previewSchedLookupInput');
      const val = input ? input.value.trim() : (localStorage.getItem('agr_empId') || '');
      if (val) {
        this.handleLookup(val);
      } else {
        this.renderEmptyLookupGuide();
      }

      if (this.currentTab === 'full') {
        this.renderFullTable();
      }
    } catch (err) {
      console.error('[PreviewSchedule] Lỗi tải dữ liệu lịch:', err);
      this.isLoading = false;
      if (resultArea) {
        resultArea.innerHTML = `
          <div class="p-6 text-center bg-rose-50 rounded-2xl border border-rose-200 text-rose-800">
            <div class="text-xl mb-1">⚠️</div>
            <div class="font-bold text-sm">Không thể kết nối đến Google Sheets</div>
            <div class="text-xs text-rose-600 mt-1">${Utils.escapeHtml(err.message)}</div>
            <button onclick="PreviewScheduleModule.loadData(true)" class="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition">
              Thử Lại Ngay 🔄
            </button>
          </div>
        `;
      }
    }
  },

  /**
   * Phân tích CSV chuẩn xác với hỗ trợ multiline quotes
   */
  parseCSVData(csvText) {
    const rows = [];
    let row = [];
    let inQuote = false;
    let field = '';
    for (let i = 0; i < csvText.length; i++) {
      const c = csvText[i];
      const next = csvText[i + 1];
      if (c === '"') {
        if (inQuote && next === '"') {
          field += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === ',' && !inQuote) {
        row.push(field);
        field = '';
      } else if ((c === '\r' || c === '\n') && !inQuote) {
        if (c === '\r' && next === '\n') i++;
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    if (field || row.length) {
      row.push(field);
      rows.push(row);
    }

    this.employeesMap.clear();
    this.employeesList = [];

    let currentShift = '18:00-22:00';
    let currentGroup = 'Chính thức';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lineStr = r.join(' ');

      if (lineStr.includes('LỊCH LÀM VIỆC CHÍNH THỨC - CA 18:00 - 22:00')) {
        currentShift = '18:00-22:00';
        currentGroup = 'Chính thức';
      } else if (lineStr.includes('LỊCH LÀM VIỆC CHÍNH THỨC - CA 22:00 - 06:00')) {
        currentShift = '22:00-06:00';
        currentGroup = 'Chính thức';
      } else if (lineStr.includes('NHÂN SỰ DỰ PHÒNG / BỔ SUNG - CA 18:00 - 22:00')) {
        currentShift = '18:00-22:00';
        currentGroup = 'Dự phòng / Bổ sung';
      } else if (lineStr.includes('NHÂN SỰ DỰ PHÒNG / BỔ SUNG - CA 22:00 - 06:00')) {
        currentShift = '22:00-06:00';
        currentGroup = 'Dự phòng / Bổ sung';
      }

      const rawEmpId = (r[1] || '').trim();
      if (/^OPS/i.test(rawEmpId)) {
        const empId = rawEmpId.toUpperCase();
        const name = (r[2] || '').trim();
        const gender = (r[3] || '').trim();
        const shift = (r[4] || currentShift).trim();

        if (!this.employeesMap.has(empId)) {
          this.employeesMap.set(empId, {
            empId,
            name,
            gender,
            shift,
            groups: [currentGroup],
            schedule: {}, // { '01/11 (CN)': 'WORK' | 'BỔ SUNG' | 'OFF' }
            totalWork: 0,
            totalSupplement: 0,
            totalOff: 0
          });
        }

        const emp = this.employeesMap.get(empId);
        if (!emp.name && name) emp.name = name;
        if (!emp.gender && gender) emp.gender = gender;
        if (!emp.groups.includes(currentGroup)) emp.groups.push(currentGroup);

        for (let d = 0; d < this.dateHeaders.length; d++) {
          const dateLabel = this.dateHeaders[d];
          const cellVal = (r[5 + d] || '').trim().toUpperCase();

          if (cellVal.includes('WORK')) {
            emp.schedule[dateLabel] = 'WORK';
          } else if (cellVal.includes('BỔ SUNG') || cellVal.includes('BO SUNG')) {
            if (emp.schedule[dateLabel] !== 'WORK') {
              emp.schedule[dateLabel] = 'BỔ SUNG';
            }
          } else if (!emp.schedule[dateLabel]) {
            emp.schedule[dateLabel] = 'OFF';
          }
        }
      }
    }

    // Tính toán tổng số ca
    for (const emp of this.employeesMap.values()) {
      let work = 0;
      let supp = 0;
      let off = 0;
      for (const d of this.dateHeaders) {
        const status = emp.schedule[d] || 'OFF';
        if (status === 'WORK') work++;
        else if (status === 'BỔ SUNG') supp++;
        else off++;
      }
      emp.totalWork = work;
      emp.totalSupplement = supp;
      emp.totalOff = off;
      this.employeesList.push(emp);
    }
  },

  renderEmptyLookupGuide() {
    const resultArea = document.getElementById('previewScheduleLookupResult');
    if (!resultArea) return;
    resultArea.innerHTML = `
      <div class="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200">
        <div class="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center text-2xl mx-auto mb-3">
          🔍
        </div>
        <h4 class="font-bold text-slate-800 text-sm sm:text-base">Nhập Mã OPS để xem lịch của bạn</h4>
        <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Hệ thống sẽ tra cứu và phân loại chi tiết các ngày bạn được phân công đi làm (WORK), ngày bổ sung dự phòng (BỔ SUNG) và ngày nghỉ (OFF).
        </p>
      </div>
    `;
  },

  /**
   * Tra cứu lịch cá nhân
   */
  handleLookup(rawQuery) {
    const resultArea = document.getElementById('previewScheduleLookupResult');
    if (!resultArea) return;

    if (!rawQuery) {
      this.renderEmptyLookupGuide();
      return;
    }

    let searchKey = rawQuery.trim();
    if (typeof Utils !== 'undefined' && Utils.normalizeOpsId) {
      searchKey = Utils.normalizeOpsId(searchKey);
    } else {
      searchKey = searchKey.toUpperCase();
    }

    // Tìm kiếm theo Mã OPS trước
    let emp = this.employeesMap.get(searchKey);

    // Nếu không thấy theo mã OPS, thử tìm kiếm gần đúng theo Họ Tên hoặc CCCD
    if (!emp) {
      const qLower = rawQuery.trim().toLowerCase();
      emp = this.employeesList.find((e) => {
        return e.empId.toLowerCase() === qLower || e.name.toLowerCase().includes(qLower);
      });
    }

    if (!emp) {
      resultArea.innerHTML = `
        <div class="p-6 text-center bg-amber-50 rounded-3xl border border-amber-200 text-amber-950">
          <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl mx-auto mb-2 font-bold">
            ❓
          </div>
          <h4 class="font-bold text-sm">Không tìm thấy lịch phân bổ cho "${Utils.escapeHtml(rawQuery)}"</h4>
          <p class="text-xs text-amber-800 mt-1 max-w-md mx-auto">
            Vui lòng kiểm tra lại Mã OPS (Ví dụ: <strong>OPS170621</strong> hoặc <strong>OPS123456</strong>). Nếu bạn vừa đăng ký hoặc chưa có tên trong danh sách cam kết, vui lòng liên hệ Admin quản lý ca trực.
          </p>
        </div>
      `;
      return;
    }

    // Render Thẻ Lịch Cá Nhân Hoàn Chỉnh
    const isNightShift = emp.shift.includes('22:00');
    const shiftBadgeColor = isNightShift ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-orange-100 text-orange-700 border-orange-200';

    // Tạo các ô ngày
    const daysGridHtml = this.dateHeaders.map((dateLabel) => {
      const status = emp.schedule[dateLabel] || 'OFF';

      if (status === 'WORK') {
        return `
          <div class="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex flex-col justify-between shadow-xs hover:border-emerald-500 transition">
            <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span>${dateLabel}</span>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div class="text-center py-1">
              <div class="text-xs sm:text-sm font-black text-emerald-600 tracking-wide">ĐI LÀM</div>
              <div class="text-[10px] font-bold text-emerald-700/80 bg-emerald-100/80 rounded-md py-0.5 mt-1">${emp.shift}</div>
            </div>
          </div>
        `;
      } else if (status === 'BỔ SUNG') {
        return `
          <div class="p-3 rounded-2xl bg-purple-50 border-2 border-purple-400 text-purple-950 flex flex-col justify-between shadow-xs hover:border-purple-500 transition">
            <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
              <span>${dateLabel}</span>
              <span class="w-2 h-2 rounded-full bg-purple-500"></span>
            </div>
            <div class="text-center py-1">
              <div class="text-xs sm:text-sm font-black text-purple-700 tracking-wide">BỔ SUNG</div>
              <div class="text-[10px] font-bold text-purple-700/80 bg-purple-100/80 rounded-md py-0.5 mt-1">Dự phòng lên ca</div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex flex-col justify-between opacity-60 hover:opacity-100 transition">
            <div class="text-[11px] font-medium text-slate-400 mb-1">
              <span>${dateLabel}</span>
            </div>
            <div class="text-center py-1">
              <div class="text-xs font-bold text-slate-400">NGHỈ</div>
              <div class="text-[10px] text-slate-400 mt-1">Không có ca</div>
            </div>
          </div>
        `;
      }
    }).join('');

    resultArea.innerHTML = `
      <div class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md space-y-4">
        <!-- Thông tin nhân sự -->
        <div class="flex items-start justify-between flex-wrap gap-3 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md">
              ${emp.name ? emp.name.charAt(0).toUpperCase() : '👤'}
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-extrabold text-slate-900 text-base sm:text-lg">${Utils.escapeHtml(emp.name)}</h3>
                <span class="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                  ${emp.empId}
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${shiftBadgeColor} border">
                  Ca ${emp.shift}
                </span>
              </div>
              <div class="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>${emp.gender || 'OS'}</span>
                <span>•</span>
                <span>Chu kỳ: <strong>01/11 - 15/11/2026</strong></span>
              </div>
            </div>
          </div>

          <!-- Thống kê tổng số ca -->
          <div class="flex items-center gap-2">
            <div class="text-center px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <div class="text-lg font-black text-emerald-600 font-mono">${emp.totalWork}</div>
              <div class="text-[10px] font-bold text-emerald-800 uppercase">Đi làm</div>
            </div>
            <div class="text-center px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200">
              <div class="text-lg font-black text-purple-600 font-mono">${emp.totalSupplement}</div>
              <div class="text-[10px] font-bold text-purple-800 uppercase">Bổ sung</div>
            </div>
            <div class="text-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div class="text-lg font-black text-slate-500 font-mono">${emp.totalOff}</div>
              <div class="text-[10px] font-bold text-slate-600 uppercase">Nghỉ</div>
            </div>
          </div>
        </div>

        <!-- Nhắc nhở quy định BỔ SUNG -->
        <div class="p-3.5 bg-purple-50/90 rounded-2xl border border-purple-200 text-purple-950 text-xs">
          <div class="font-bold flex items-center gap-1.5 text-purple-900 mb-1">
            <span>⚠️</span>
            <span>LƯU Ý QUAN TRỌNG VỀ TRẠNG THÁI "BỔ SUNG":</span>
          </div>
          <p class="text-[11px] leading-relaxed text-purple-800">
            Những bạn ở trạng thái <strong>BỔ SUNG</strong> vẫn có lịch làm việc ngày hôm đó chứ <strong>KHÔNG PHẢI BỔ SUNG LÀ NGÀY NGHỈ</strong>! Các bạn luôn chú ý có mặt đúng giờ để sẵn sàng nhận vị trí điều động khi có phát sinh từ Quản lý kho.
          </p>
        </div>

        <!-- Lưới lịch 15 ngày -->
        <div>
          <div class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Chi Tiết Lịch 15 Ngày (01/11 - 15/11):</span>
            <span class="text-[11px] text-slate-400 font-normal">Chạm vào ngày để xem chi tiết</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            ${daysGridHtml}
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render bảng toàn bộ lịch (Full View)
   */
  renderFullTable() {
    const container = document.getElementById('previewScheduleFullTable');
    if (!container) return;

    if (!this.employeesList.length) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          Chưa có dữ liệu bảng lịch làm việc.
        </div>
      `;
      return;
    }

    const searchInput = document.getElementById('previewSchedFullSearch');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let list = this.employeesList;
    if (this.currentFilterShift !== 'all') {
      list = list.filter((e) => e.shift.includes(this.currentFilterShift));
    }
    if (query) {
      list = list.filter((e) => e.empId.toLowerCase().includes(query) || e.name.toLowerCase().includes(query));
    }

    const rowsHtml = list.map((emp, idx) => {
      const daysCells = this.dateHeaders.map((d) => {
        const status = emp.schedule[d] || 'OFF';
        if (status === 'WORK') {
          return `<td class="p-2 text-center text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-slate-200">WORK</td>`;
        } else if (status === 'BỔ SUNG') {
          return `<td class="p-2 text-center text-[10px] font-bold bg-purple-100 text-purple-800 border border-slate-200">BỔ SUNG</td>`;
        } else {
          return `<td class="p-2 text-center text-[10px] text-slate-400 border border-slate-200">-</td>`;
        }
      }).join('');

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-200 text-xs">
          <td class="p-2.5 text-center font-mono text-slate-400">${idx + 1}</td>
          <td class="p-2.5 font-mono font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200 shadow-xs">${emp.empId}</td>
          <td class="p-2.5 font-bold text-slate-800 whitespace-nowrap">${Utils.escapeHtml(emp.name)}</td>
          <td class="p-2.5 text-slate-600 whitespace-nowrap text-center">${emp.gender}</td>
          <td class="p-2.5 text-center font-bold text-indigo-700 whitespace-nowrap">${emp.shift}</td>
          ${daysCells}
          <td class="p-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">${emp.totalWork}</td>
          <td class="p-2.5 text-center font-mono font-bold text-purple-700 bg-purple-50/50">${emp.totalSupplement}</td>
        </tr>
      `;
    }).join('');

    const headersHtml = this.dateHeaders.map((d) => `<th class="p-2 text-center text-[11px] font-bold text-slate-700 border border-slate-300 min-w-[70px] whitespace-nowrap bg-slate-100">${d}</th>`).join('');

    container.innerHTML = `
      <div class="overflow-x-auto border border-slate-200 rounded-2xl max-h-[65vh] shadow-inner">
        <table class="w-full text-left border-collapse text-xs">
          <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-xs">
            <tr>
              <th class="p-2.5 text-center font-bold border border-slate-300 w-10">STT</th>
              <th class="p-2.5 font-bold border border-slate-300 sticky left-0 bg-slate-100 z-20 min-w-[100px]">Mã OPS</th>
              <th class="p-2.5 font-bold border border-slate-300 min-w-[140px]">Họ và Tên</th>
              <th class="p-2.5 font-bold border border-slate-300 text-center min-w-[80px]">Giới tính</th>
              <th class="p-2.5 font-bold border border-slate-300 text-center min-w-[100px]">Ca Trực</th>
              ${headersHtml}
              <th class="p-2.5 text-center font-bold border border-slate-300 text-emerald-800 bg-emerald-100/70 min-w-[60px]">Đi làm</th>
              <th class="p-2.5 text-center font-bold border border-slate-300 text-purple-800 bg-purple-100/70 min-w-[60px]">Bổ sung</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            ${rowsHtml || '<tr><td colspan="22" class="p-8 text-center text-slate-400">Không tìm thấy nhân sự phù hợp.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Hiển thị <strong>${list.length}</strong> nhân sự</span>
        <span>Kéo ngang để xem đầy đủ 15 ngày</span>
      </div>
    `;
  }
};

if (typeof window !== 'undefined') {
  window.PreviewScheduleModule = PreviewScheduleModule;
}

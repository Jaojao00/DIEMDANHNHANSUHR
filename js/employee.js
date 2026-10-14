// XỬ LÝ NGHIỆP VỤ PHÍA CỔNG NHÂN VIÊN (EMPLOYEE PORTAL)
const EmployeeModule = {
  salaryChartInstance: null,

  init() {
    this.bindEvents();
    this.initDefaultShift();
  },

  initDefaultShift() {
    const shiftSelect = document.getElementById('empShiftSelect');
    if (shiftSelect) {
      shiftSelect.innerHTML = CONFIG.SHIFTS.map((s) => {
        return `<option value="${s.id}" ${s.isDefault ? 'selected' : ''}>${s.label}</option>`;
      }).join('');
    }
  },

  bindEvents() {
    // Nút Điểm Danh
    const btnCheckin = document.getElementById('btnQuickCheckin');
    if (btnCheckin) {
      btnCheckin.addEventListener('click', () => this.handleCheckin());
    }

    // Input Enter để điểm danh nhanh
    const empInput = document.getElementById('empIdentifierInput');
    if (empInput) {
      empInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleCheckin();
        }
      });
    }

    // Form Xin Nghỉ / Xin Off
    const formXinOff = document.getElementById('formXinOff');
    if (formXinOff) {
      formXinOff.addEventListener('submit', (e) => this.handleSubmitXinOff(e));
    }

    // Form Xin Lên Ca (Thế Ca / Tăng Cường)
    const formXinLenCa = document.getElementById('formXinLenCa');
    if (formXinLenCa) {
      formXinLenCa.addEventListener('submit', (e) => this.handleSubmitXinLenCa(e));
    }

    // Form Cấp Đổi Áo Thẻ & Vé Xe
    const formCapDoi = document.getElementById('formCapDoiAoThe');
    if (formCapDoi) {
      formCapDoi.addEventListener('submit', (e) => this.handleSubmitCapDoiAoThe(e));
    }

    // Form Khiếu Nại
    const formKhieuNai = document.getElementById('formKhieuNai');
    if (formKhieuNai) {
      formKhieuNai.addEventListener('submit', (e) => this.handleSubmitKhieuNai(e));
    }

    // Form Tra Cứu Lương Cá Nhân
    const formLookupSalary = document.getElementById('formLookupSalary');
    if (formLookupSalary) {
      formLookupSalary.addEventListener('submit', (e) => this.handleLookupSalary(e));
    }
  },

  /**
   * 2.1 Xử lý Điểm Danh Một Chạm (Quick Check-in)
   */
  async handleCheckin() {
    const inputEl = document.getElementById('empIdentifierInput');
    const shiftEl = document.getElementById('empShiftSelect');
    const resultContainer = document.getElementById('checkinResultArea');

    if (!inputEl || !shiftEl) return;

    const identifier = inputEl.value.trim();
    const shiftId = shiftEl.value;

    if (!identifier) {
      Utils.toast('Vui lòng nhập Mã OPS', 'warning');
      inputEl.focus();
      return;
    }

    Utils.showLoading('Đang xác thực và ghi nhận điểm danh...');

    try {
      // Gọi API điểm danh
      const response = await DataManager.callApi('checkin', {
        identifier: identifier,
        shift: shiftId,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (response && response.success && response.data) {
        const emp = response.data;
        // Bắn cập nhật sang Firebase Realtime (Tầng 1)
        FirebaseService.recordCheckinRealtime(shiftId, emp);

        // Hiển thị thẻ kết quả & vị trí làm việc
        this.renderCheckinSuccess(emp);
        Utils.toast(`Điểm danh thành công: ${emp.name}`, 'success');

        // Tự động làm mới danh sách Roster và Activity
        DataManager.loadRoster(shiftId);
      } else {
        // Cảnh báo không tìm thấy
        Utils.showAlert(
          'Không tìm thấy thông tin ca trực',
          response.message || 'Mã của bạn không có trong danh sách ca này hôm nay. Hãy liên hệ Admin Zalo ca trực!',
          'error'
        );
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', 'Không thể kết nối đến máy chủ điểm danh. Vui lòng thử lại.', 'error');
    }
  },

  /**
   * Render Thẻ kết quả điểm danh, cảnh báo Chưa Có Vị Trí (npw-icon)
   */
  renderCheckinSuccess(emp) {
    const resultContainer = document.getElementById('checkinResultArea');
    if (!resultContainer) return;

    resultContainer.classList.remove('hidden');

    // Kiểm tra các vị trí xoay ca
    const positions = emp.positions || {};
    const posKeys = Object.keys(positions);
    
    // Kiểm tra xem có bị cảnh báo "Chưa có vị trí" (npw-icon)
    let hasEmptyPosition = false;
    if (posKeys.length === 0) {
      hasEmptyPosition = true;
    } else {
      for (const k of posKeys) {
        const val = (positions[k] || '').trim();
        if (!val || val === 'Chưa xếp' || val === '-') {
          hasEmptyPosition = true;
          break;
        }
      }
    }

    let positionsHtml = '';
    if (posKeys.length > 0) {
      positionsHtml = posKeys.map((k) => `
        <div class="bg-white rounded-lg p-3 border border-slate-200 text-center shadow-sm">
          <div class="text-xs font-semibold text-slate-500 uppercase">${k}</div>
          <div class="text-base font-bold text-slate-800 mt-1">${positions[k] || 'Chưa xếp'}</div>
        </div>
      `).join('');
    } else {
      positionsHtml = `
        <div class="col-span-full bg-amber-50 rounded-lg p-3 border border-amber-200 text-amber-800 text-sm">
          Đang chờ Quản lý phân bổ vị trí trực tiếp tại kho.
        </div>
      `;
    }

    const warningHtml = hasEmptyPosition ? `
      <div class="mt-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg flex items-start gap-3">
        <span class="text-amber-500 text-xl font-bold npw-icon">⚠️</span>
        <div class="text-xs text-amber-800 leading-relaxed">
          <strong class="font-semibold block text-sm">Cảnh báo vị trí làm việc:</strong>
          Bạn chưa được phân bổ vị trí hoặc đang ở trạng thái <em>"Chưa xếp"</em>. Vui lòng liên hệ ngay <strong>Admin / Zalo ca trực</strong> tại chốt kiểm soát để nhận nhiệm vụ!
        </div>
      </div>
    ` : '';

    resultContainer.innerHTML = `
      <div class="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div class="flex items-center justify-between pb-3 border-b border-emerald-200/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xl font-bold">
              ✓
            </div>
            <div>
              <h3 class="text-lg font-bold text-slate-900">${emp.name}</h3>
              <div class="text-xs text-slate-500 font-mono">${emp.id} | CCCD: ${emp.cccd || 'N/A'}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              ĐÃ ĐIỂM DANH
            </span>
            <div class="text-xs text-slate-500 font-mono mt-1">${emp.checkinTime || Utils.getCurrentVNTime()}</div>
          </div>
        </div>

        <div class="mt-4">
          <div class="text-xs font-bold uppercase text-slate-600 mb-2 tracking-wider flex items-center gap-1.5">
            <span>📍 Vị Trí Làm Việc Phân Bổ</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${positionsHtml}
          </div>
        </div>

        ${warningHtml}
      </div>
    `;

    // Cuộn nhẹ xuống vùng kết quả
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /**
   * 2.2.1 Xử lý Gửi Đơn Xin Nghỉ / Xin Off
   */
  async handleSubmitXinOff(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const offDate = form.offDate.value;
    const reason = form.reason.value.trim();

    if (!empId || !empName || !phone || !offDate || !reason) {
      Utils.toast('Vui lòng điền đầy đủ tất cả các trường', 'warning');
      return;
    }

    Utils.showLoading('Đang ghi nhận đơn xin nghỉ...');

    try {
      const res = await DataManager.callApi('request', {
        type: 'XIN_OFF',
        empId: empId,
        empName: empName,
        phone: phone,
        date: offDate,
        reason: reason,
        shift: DataManager.state.currentShift,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert('Gửi đơn thành công', 'Đơn xin nghỉ đã được ghi vào hệ thống và đồng bộ.', 'success');
        form.reset();
        window.App?.closeModal('modalXinOff');
      } else {
        Utils.showAlert('Lỗi', res.message || 'Không thể lưu đơn xin nghỉ.', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', err.message, 'error');
    }
  },

  /**
   * 2.2.2 Xử lý Xin Lên Ca (Thế Ca / Tăng Cường)
   */
  async handleSubmitXinLenCa(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const targetDate = form.targetDate.value;
    const targetShift = form.targetShift.value;
    const note = form.note.value.trim();

    if (!empId || !empName || !phone || !targetDate || !targetShift) {
      Utils.toast('Vui lòng điền đầy đủ thông tin', 'warning');
      return;
    }

    Utils.showLoading('Đang gửi yêu cầu lên ca...');

    try {
      const res = await DataManager.callApi('request', {
        type: 'XIN_LEN_CA',
        empId: empId,
        empName: empName,
        phone: phone,
        date: targetDate,
        targetShift: targetShift,
        note: note,
        identity: 'A-OS',
        status: 'pending',
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert(
          'Đã tiếp nhận yêu cầu lên ca',
          'Bạn đã được xếp vào danh sách chờ (A-OS, pending). Quản trị viên sẽ xác nhận vị trí khi vào ca!',
          'success'
        );
        form.reset();
        window.App?.closeModal('modalXinLenCa');
      } else {
        Utils.showAlert('Lỗi', res.message || 'Không thể gửi yêu cầu', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', err.message, 'error');
    }
  },

  /**
   * 2.2.3 Xử lý Cấp Đổi Áo Thẻ & Dư Vé
   */
  async handleSubmitCapDoiAoThe(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const itemType = form.itemType.value;
    const shift = form.shift.value;
    const quantity = form.quantity.value;
    const pickupDate = form.pickupDate.value;
    const reason = form.reason.value.trim();

    Utils.showLoading('Đang lưu yêu cầu cấp đổi...');

    try {
      const res = await DataManager.callApi('request_item', {
        empId,
        empName,
        itemType,
        shift,
        quantity,
        pickupDate,
        reason,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert('Thành công', 'Yêu cầu trang thiết bị / vé xe đã được chuyển đến bộ phận hậu cần.', 'success');
        form.reset();
        window.App?.closeModal('modalCapDoiAoThe');
      } else {
        Utils.showAlert('Lỗi', res.message || 'Lỗi gửi yêu cầu', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi mạng', err.message, 'error');
    }
  },

  /**
   * 2.2.4 Gửi Phiếu Khiếu Nại (Có nén ảnh Base64 HTML5 Canvas <500KB)
   */
  async handleSubmitKhieuNai(e) {
    e.preventDefault();
    const form = e.target;
    const empId = form.empId.value.trim();
    const empName = form.empName.value.trim();
    const phone = form.phone.value.trim();
    const complaintType = form.complaintType.value;
    const content = form.content.value.trim();
    const fileInput = form.proofImage;

    if (!empId || !empName || !content) {
      Utils.toast('Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
      return;
    }

    let imageBase64 = '';

    if (fileInput.files && fileInput.files[0]) {
      Utils.showLoading('Đang nén ảnh minh chứng...');
      try {
        const compressed = await Utils.compressImage(fileInput.files[0], 500, 0.8);
        imageBase64 = compressed.base64;
        console.log(`[KhieuNai] Ảnh nén thành công: ${compressed.sizeKB} KB`);
      } catch (err) {
        console.warn('Lỗi nén ảnh:', err);
      }
    }

    Utils.showLoading('Đang gửi khiếu nại lên Google Drive & Sheets...');

    try {
      const res = await DataManager.callApi('submit_complaint', {
        empId,
        empName,
        phone,
        complaintType,
        content,
        imageBase64,
        driveFolderId: CONFIG.GDRIVE_FOLDER_ID,
        timestamp: Utils.getCurrentVNTime()
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.showAlert(
          'Đã tiếp nhận khiếu nại',
          'Phiếu khiếu nại kèm minh chứng đã gửi thành công tới phòng Nhân sự với trạng thái "Chờ xử lý".',
          'success'
        );
        form.reset();
        window.App?.closeModal('modalKhieuNai');
      } else {
        Utils.showAlert('Lỗi', res.message || 'Không thể gửi khiếu nại', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi gửi phiếu', err.message, 'error');
    }
  },

  /**
   * 2.2.5 Tra Cứu Bảng Lương Cá Nhân & Biểu Đồ Chart.js
   */
  async handleLookupSalary(e) {
    e.preventDefault();
    const form = e.target;
    const identifier = form.identifier.value.trim();
    const resultArea = document.getElementById('salaryResultContainer');

    if (!identifier) {
      Utils.toast('Vui lòng nhập số CCCD hoặc Mã CTV', 'warning');
      return;
    }

    Utils.showLoading('Đang tra cứu bảng lương bảo mật...');

    try {
      const res = await DataManager.callApi('lookup_salary', {
        identifier: identifier
      });

      Utils.hideLoading();

      if (res && res.success && res.data && res.data.length > 0) {
        this.renderSalaryDetails(res.data, identifier);
      } else {
        Utils.showAlert(
          'Không tìm thấy dữ liệu',
          res.message || 'Không tìm thấy dữ liệu lương cho số CCCD/Mã này trong kỳ lương hiện tại.',
          'info'
        );
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi tra cứu', err.message, 'error');
    }
  },

  renderSalaryDetails(records, identifier) {
    const container = document.getElementById('salaryResultContainer');
    if (!container) return;

    container.classList.remove('hidden');

    // Tính tổng
    let totalHours = 0;
    let totalSalary = 0;
    let totalShifts = records.length;
    const labels = [];
    const hoursData = [];

    records.forEach((r) => {
      const hrs = parseFloat(r.totalHours || r.hours || 0);
      const sal = parseFloat(r.salary || r.daySalary || 0);
      totalHours += hrs;
      totalSalary += sal;
      labels.push(r.date || r.workDate || 'Ca');
      hoursData.push(hrs);
    });

    const first = records[0];

    const rowsHtml = records.map((r, idx) => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-sm">
        <td class="p-3 text-center text-slate-500 font-mono">${idx + 1}</td>
        <td class="p-3 font-medium text-slate-800">${r.date || r.workDate || '-'}</td>
        <td class="p-3 font-mono text-slate-600">${r.timeInOut || r.time || '-'}</td>
        <td class="p-3 text-center font-bold text-slate-700">${r.totalHours || r.hours || 0}h</td>
        <td class="p-3 text-center">
          <span class="px-2 py-0.5 text-xs rounded ${r.shiftType === 'Đêm' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}">
            ${r.shiftType || 'Ngày'}
          </span>
        </td>
        <td class="p-3 text-right font-mono font-bold text-emerald-600">${Utils.formatCurrency(r.salary || r.daySalary || 0)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <div class="mt-6 border-t border-slate-200 pt-6">
        <div class="bg-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span class="text-xs uppercase font-semibold text-agari-yellow tracking-wider">Thông Tin Nhân Sự</span>
              <h3 class="text-2xl font-bold text-white mt-1">${first.name || 'Cộng Tác Viên'}</h3>
              <div class="text-sm text-slate-400 font-mono mt-0.5">CCCD: ${first.cccd || identifier} | Bộ phận: ${first.department || 'Kho Vận SOC'}</div>
            </div>
            <div class="bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700 text-right">
              <div class="text-xs text-slate-400">Tổng thu nhập tạm tính</div>
              <div class="text-2xl font-bold font-mono text-agari-yellow mt-0.5">${Utils.formatCurrency(totalSalary)}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div class="bg-slate-800/50 p-3 rounded-xl">
              <div class="text-xs text-slate-400">Tổng ca làm việc</div>
              <div class="text-xl font-bold text-white font-mono mt-1">${totalShifts} ca</div>
            </div>
            <div class="bg-slate-800/50 p-3 rounded-xl">
              <div class="text-xs text-slate-400">Tổng giờ công</div>
              <div class="text-xl font-bold text-white font-mono mt-1">${totalHours.toFixed(1)} giờ</div>
            </div>
            <div class="bg-slate-800/50 p-3 rounded-xl col-span-2 sm:col-span-1">
              <div class="text-xs text-slate-400">Tỷ lệ chuyên cần</div>
              <div class="text-xl font-bold text-emerald-400 font-mono mt-1">100%</div>
            </div>
          </div>
        </div>

        <!-- Biểu đồ Chart.js -->
        <div class="mt-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h4 class="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span>📊 Biểu Đồ Thống Kê Số Giờ Công Từng Ngày</span>
          </h4>
          <div class="h-60 relative">
            <canvas id="salaryBarChart"></canvas>
          </div>
        </div>

        <!-- Bảng chi tiết ngày công -->
        <div class="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-sm">
            Chi Tiết Từng Ngày Công & Ca Làm Việc
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-100/70 text-slate-600 text-xs uppercase font-semibold">
                  <th class="p-3 text-center">STT</th>
                  <th class="p-3">Ngày Chấm Công</th>
                  <th class="p-3">Giờ Vào / Ra</th>
                  <th class="p-3 text-center">Số Giờ</th>
                  <th class="p-3 text-center">Loại Ca</th>
                  <th class="p-3 text-right">Lương Ngày</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Khởi tạo Chart.js
    this.renderSalaryChart(labels, hoursData);
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  renderSalaryChart(labels, data) {
    const canvas = document.getElementById('salaryBarChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (this.salaryChartInstance) {
      this.salaryChartInstance.destroy();
    }

    this.salaryChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Số giờ làm (giờ)',
          data: data,
          backgroundColor: '#D90012',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2 }
          }
        }
      }
    });
  }
};

if (typeof window !== 'undefined') {
  window.EmployeeModule = EmployeeModule;
}

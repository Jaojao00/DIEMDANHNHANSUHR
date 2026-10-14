// MODULE DUYỆT ĐỔI LỊCH (CHANGE REQUEST MANAGER - CR_)
const AdminRequests = {
  requests: [],

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const btnRefresh = document.getElementById('btnRefreshRequests');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.loadRequests());
    }
  },

  async loadRequests() {
    const tbody = document.getElementById('adminRequestsTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-agari-red mb-2"></div>
            <div>Đang tải danh sách yêu cầu đổi lịch...</div>
          </td>
        </tr>
      `;
    }

    try {
      const res = await DataManager.callApi('get_change_requests');
      if (res && res.success && Array.isArray(res.data)) {
        this.requests = res.data;
      } else {
        this.requests = this.generateSampleRequests();
      }
      this.renderTable();
    } catch (err) {
      console.warn('Lỗi load change requests:', err);
      this.requests = this.generateSampleRequests();
      this.renderTable();
    }
  },

  renderTable() {
    const tbody = document.getElementById('adminRequestsTableBody');
    if (!tbody) return;

    if (this.requests.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="p-8 text-center text-slate-400">
            Hiện tại không có yêu cầu xin đổi lịch nào đang chờ duyệt.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.requests.map((req, idx) => {
      const isPending = (req.status || 'pending').toLowerCase() === 'pending';
      let statusBadge = '';
      if (req.status === 'approved') {
        statusBadge = '<span class="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Đã Duyệt</span>';
      } else if (req.status === 'rejected') {
        statusBadge = '<span class="px-2.5 py-1 text-xs rounded-full bg-red-500/10 text-red-400 border border-red-500/30">Từ Chối</span>';
      } else {
        statusBadge = '<span class="px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Chờ Duyệt</span>';
      }

      return `
        <tr class="hover:bg-slate-800/50 transition border-b border-slate-800/80 text-sm">
          <td class="p-3 text-center text-slate-400 font-mono">${idx + 1}</td>
          <td class="p-3 font-mono font-bold text-agari-yellow">${req.id || 'CR_' + req.empId}</td>
          <td class="p-3">
            <div class="font-bold text-white">${req.empName}</div>
            <div class="text-xs text-slate-400 font-mono">${req.empId}</div>
          </td>
          <td class="p-3 font-mono text-slate-300 text-xs">${req.shiftId || '18:00-22:00'}</td>
          <td class="p-3 text-slate-300 text-xs max-w-xs truncate" title="${req.selections || ''}">${req.selections || 'Thay đổi ngày làm/nghỉ'}</td>
          <td class="p-3 text-center">${statusBadge}</td>
          <td class="p-3 text-center">
            ${isPending ? `
              <div class="flex items-center justify-center gap-2">
                <button class="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        onclick="AdminRequests.handleAction('${req.id}', 'approve')">
                  Duyệt
                </button>
                <button class="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
                        onclick="AdminRequests.handleAction('${req.id}', 'reject')">
                  Từ chối
                </button>
              </div>
            ` : '<span class="text-xs text-slate-500 font-mono">Đã xử lý</span>'}
          </td>
        </tr>
      `;
    }).join('');
  },

  async handleAction(requestId, actionType) {
    const actionName = actionType === 'approve' ? 'approve_change_request' : 'reject_change_request';
    const actionLabel = actionType === 'approve' ? 'Duyệt thay đổi lịch' : 'Từ chối yêu cầu';

    const confirm = await Utils.confirm(
      'Xác nhận hành động',
      `Bạn có chắc chắn muốn <strong>${actionLabel}</strong> cho mã yêu cầu <strong>${requestId}</strong>?`
    );

    if (!confirm.isConfirmed) return;

    Utils.showLoading(`Đang ${actionLabel.toLowerCase()}...`);

    try {
      const res = await DataManager.callApi(actionName, {
        requestId: requestId
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.toast(`Đã ${actionLabel.toLowerCase()} thành công!`, 'success');
        const target = this.requests.find((r) => r.id === requestId);
        if (target) {
          target.status = actionType === 'approve' ? 'approved' : 'rejected';
        }
        this.renderTable();
      } else {
        Utils.showAlert('Lỗi', res.message || 'Thao tác không thành công', 'error');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.showAlert('Lỗi kết nối', err.message, 'error');
    }
  },

  generateSampleRequests() {
    return [
      { id: 'CR_10291_01', empId: 'OPS10291', empName: 'Nguyễn Văn An', shiftId: '18:00-22:00', selections: 'Ngày 16: WORK -> OFF, Ngày 18: OFF -> WORK', status: 'pending', timestamp: '14/10/2026 14:20' },
      { id: 'CR_10452_02', empId: 'OPS10452', empName: 'Trần Thị Mai', shiftId: '22:00-06:00', selections: 'Ngày 20: OFF -> WORK (Đăng ký bổ sung)', status: 'pending', timestamp: '14/10/2026 16:05' }
    ];
  }
};

if (typeof window !== 'undefined') {
  window.AdminRequests = AdminRequests;
}

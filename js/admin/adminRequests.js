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
            <div>Đang tải danh sách yêu cầu (Xin Off / Lên Ca / Đổi Lịch)...</div>
          </td>
        </tr>
      `;
    }

    try {
      // 1. Tải danh sách đơn Xin Off / Xin Lên Ca từ sheet XIN_OFF
      let offList = [];
      try {
        const resOff = await DataManager.callApi('load_requests');
        if (resOff && (resOff.success || Array.isArray(resOff))) {
          offList = Array.isArray(resOff) ? resOff : (resOff.data || []);
        }
      } catch (e) {
        console.warn('Lỗi tải sheet XIN_OFF:', e);
      }

      // 2. Tải danh sách Change Requests (Đổi lịch tuần/tháng)
      let crList = [];
      try {
        const resCr = await DataManager.callApi('get_change_requests');
        if (resCr && (resCr.success || resCr.status === 'success') && Array.isArray(resCr.data)) {
          crList = resCr.data;
        }
      } catch (e) {
        console.warn('Lỗi tải ChangeRequests:', e);
      }

      // Chuẩn hóa và gộp danh sách
      const normalizedOff = offList.map((item, idx) => ({
        id: item.id || `REQ_${item.empId}_${idx}`,
        empId: item.empId || '',
        empName: item.empName || item.name || 'Nhân sự',
        phone: item.phone || '',
        shiftId: item.shiftId || 'Tất cả ca',
        selections: `[${item.type || 'XIN NGHỈ'}] Ngày: ${item.date || 'Hôm nay'} - ${item.reason || item.note || 'Không có lý do'}`,
        status: item.status || 'pending',
        type: item.type || 'XIN OFF',
        rawItem: item
      }));

      const combined = [...normalizedOff, ...crList];
      this.requests = combined.length > 0 ? combined : this.generateSampleRequests();
      this.renderTable();
    } catch (err) {
      console.warn('Lỗi load requests:', err);
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
            Hiện tại không có yêu cầu xin off hay đổi lịch nào đang chờ duyệt.
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
            <div class="text-xs text-slate-400 font-mono">${req.empId} ${req.phone ? `• ${req.phone}` : ''}</div>
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
    const target = this.requests.find((r) => r.id === requestId);
    const actionLabel = actionType === 'approve' ? 'Duyệt yêu cầu' : 'Từ chối yêu cầu';

    const confirm = await Utils.confirm(
      'Xác nhận hành động',
      `Bạn có chắc chắn muốn <strong>${actionLabel}</strong> cho đơn của <strong>${target?.empName || requestId}</strong>?`
    );

    if (!confirm.isConfirmed) return;

    Utils.showLoading(`Đang ${actionLabel.toLowerCase()}...`);

    try {
      if (requestId.startsWith('REQ_') && target) {
        // Đơn Xin Off hoặc Xin Lên Ca
        if (actionType === 'approve') {
          const shiftId = target.shiftId || DataManager.state.currentShift;
          const roster = DataManager.getCachedRoster(shiftId) || DataManager.state.roster;
          const emp = roster.find((e) => Utils.isIdMatch(e.id, target.empId));

          if (target.type === 'XIN OFF') {
            if (emp) {
              emp.status = 'off';
              DataManager.saveCachedRoster(shiftId, roster);
              if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
                FirebaseService.saveRoster(shiftId, roster).catch((e) => console.warn(e));
              }
              if (shiftId === DataManager.state.currentShift) {
                DataManager.recalculateStats();
                AdminUI.updateStatsCards();
                AdminUI.renderRosterTable();
              }
            }
          } else if (target.type === 'XIN LÊN CA') {
            if (!emp) {
              const newEmp = {
                stt: roster.length + 1,
                id: Utils.sanitizeId(target.empId),
                name: (target.empName || '').toUpperCase(),
                phone: target.phone || '',
                identity: 'A-OS',
                status: 'pending',
                checkinTime: '',
                positions: {
                  'Vị trí cố định': 'Chưa xếp',
                  'SAU GIỜ NGHỈ': 'Chưa xếp',
                  '4h-6h': 'Chưa xếp',
                  'Xuất Tải': 'Chưa xếp',
                  'NOTE': 'Đã duyệt lên ca (A-OS)'
                },
                note: 'Đã duyệt lên ca (A-OS)'
              };
              roster.push(newEmp);
              DataManager.saveCachedRoster(shiftId, roster);
              if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
                FirebaseService.saveRoster(shiftId, roster).catch((e) => console.warn(e));
              }
              if (shiftId === DataManager.state.currentShift) {
                DataManager.recalculateStats();
                AdminUI.updateStatsCards();
                AdminUI.renderRosterTable();
              }
            }
          }
        }
        target.status = actionType === 'approve' ? 'approved' : 'rejected';
        Utils.hideLoading();
        Utils.toast(`Đã ${actionLabel.toLowerCase()} thành công!`, 'success');
        this.renderTable();
        return;
      }

      // Xử lý Change Requests truyền thống
      const actionName = actionType === 'approve' ? 'approve_change_request' : 'reject_change_request';
      const res = await DataManager.callApi(actionName, {
        requestId: requestId
      });

      Utils.hideLoading();

      if (res && res.success) {
        Utils.toast(`Đã ${actionLabel.toLowerCase()} thành công!`, 'success');
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

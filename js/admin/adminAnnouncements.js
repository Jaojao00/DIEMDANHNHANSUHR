const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
/**
 * PHÂN HỆ QUẢN TRỊ THÔNG BÁO & BÌNH CHỌN (ADMIN ANNOUNCEMENTS & POLLS)
 * Cung cấp chức năng:
 * - Tạo thông báo mới (tiêu đề, nội dung, ảnh đính kèm, ghim bài)
 * - Tạo cuộc bình chọn (nhiều phương án, chọn 1 hoặc nhiều đáp án, hiển thị tỷ lệ)
 * - Quản lý trạng thái: Ghim / Bỏ ghim, Đóng / Mở lại bình chọn, Xóa bài
 * - Theo dõi số lượng nhân viên đã đọc, đã vote
 * - Kiểm duyệt bình luận: ĐẶC BIỆT xem được danh tính thật của người bình luận ẩn danh (Mã OPS + Tên thật) để xử lý vi phạm
 */
const AdminAnnouncements = {
  announcements: [],
  currentModalType: 'announcement', // 'announcement' | 'poll'
  activeCommentsAnnouncementId: null,
  commentsUnsub: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Nút mở modal tạo mới
    const btnNewAnn = document.getElementById('btnAdminNewAnnouncement');
    if (btnNewAnn) {
      btnNewAnn.addEventListener('click', () => this.openCreateModal('announcement'));
    }

    const btnNewPoll = document.getElementById('btnAdminNewPoll');
    if (btnNewPoll) {
      btnNewPoll.addEventListener('click', () => this.openCreateModal('poll'));
    }

    // Chuyển loại bài đăng trong form tạo mới
    document.querySelectorAll('.admin-post-type-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.type;
        this.switchPostType(type);
      });
    });

    // Nút thêm phương án bình chọn
    const btnAddOption = document.getElementById('btnAdminAddPollOption');
    if (btnAddOption) {
      btnAddOption.addEventListener('click', () => this.addPollOptionInput());
    }

    // Form submit tạo mới
    const formCreate = document.getElementById('formAdminCreateAnnouncement');
    if (formCreate) {
      formCreate.addEventListener('submit', (e) => this.handleCreateSubmit(e));
    }
  },

  loadData() {
    if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
      FirebaseService.listenToAnnouncements((items) => {
        this.announcements = items || [];
        this.updateStats();
        this.renderAdminList();
      });
    }
  },

  updateStats() {
    const total = this.announcements.length;
    const activePolls = this.announcements.filter((a) => a.type === 'poll' && a.status !== 'closed').length;
    
    let totalReads = 0;
    let totalComments = 0;
    this.announcements.forEach((a) => {
      if (a.reads && Array.isArray(a.reads)) totalReads += a.reads.length;
      totalComments += (a.commentCount || 0);
    });

    const elTotal = document.getElementById('adminStatTotalAnnouncements');
    const elPolls = document.getElementById('adminStatActivePolls');
    const elReads = document.getElementById('adminStatTotalReads');
    const elComments = document.getElementById('adminStatTotalComments');

    if (elTotal) elTotal.textContent = total;
    if (elPolls) elPolls.textContent = activePolls;
    if (elReads) elReads.textContent = totalReads;
    if (elComments) elComments.textContent = totalComments;
  },

  openCreateModal(defaultType = 'announcement') {
    const form = document.getElementById('formAdminCreateAnnouncement');
    if (form) form.reset();

    // Reset danh sách phương án bình chọn
    const optionsContainer = document.getElementById('adminPollOptionsList');
    if (optionsContainer) {
      optionsContainer.innerHTML = '';
      this.addPollOptionInput('Phương án 1');
      this.addPollOptionInput('Phương án 2');
    }

    this.switchPostType(defaultType);

    if (window.App && App.openModal) {
      App.openModal('modalAdminCreateAnnouncement');
    }
  },

  switchPostType(type) {
    this.currentModalType = type;
    const pollArea = document.getElementById('adminPollConfigArea');
    const typeBtns = document.querySelectorAll('.admin-post-type-btn');

    typeBtns.forEach((btn) => {
      if (btn.dataset.type === type) {
        btn.classList.add('bg-agari-red', 'text-white', 'shadow-md');
        btn.classList.remove('bg-slate-800', 'text-slate-400');
      } else {
        btn.classList.remove('bg-agari-red', 'text-white', 'shadow-md');
        btn.classList.add('bg-slate-800', 'text-slate-400');
      }
    });

    if (pollArea) {
      if (type === 'poll') {
        pollArea.classList.remove('hidden');
      } else {
        pollArea.classList.add('hidden');
      }
    }
  },

  addPollOptionInput(defaultText = '') {
    const container = document.getElementById('adminPollOptionsList');
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 admin-poll-opt-item';
    div.innerHTML = `
      <input type="text" class="flex-1 bg-[#080D1A] border border-[#1E293B] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-agari-red admin-poll-opt-input" placeholder="Nhập nội dung phương án..." value="${escapeHtml(defaultText)}" required />
      <button type="button" class="w-8 h-8 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 text-xs font-bold transition flex items-center justify-center btn-remove-opt" title="Xóa phương án">✕</button>
    `;

    div.querySelector('.btn-remove-opt').addEventListener('click', () => {
      if (container.querySelectorAll('.admin-poll-opt-item').length > 2) {
        div.remove();
      } else {
        Utils.toast('Cuộc bình chọn phải có ít nhất 2 phương án!', 'warning');
      }
    });

    container.appendChild(div);
  },

  async handleCreateSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value.trim();
    const content = form.content.value.trim();
    const imageUrl = form.imageUrl.value.trim();
    const isPinned = form.isPinned.checked;
    const allowComments = form.allowComments.checked;

    if (!title || !content) {
      Utils.toast('Vui lòng nhập đầy đủ Tiêu đề và Nội dung bài viết!', 'warning');
      return;
    }

    const payload = {
      title,
      content,
      imageUrl,
      pinned: isPinned,
      allowComments,
      type: this.currentModalType,
      author: 'Ban Quản Trị AGARI HR',
      status: 'active'
    };

    if (this.currentModalType === 'poll') {
      const optInputs = document.querySelectorAll('.admin-poll-opt-input');
      const options = [];
      optInputs.forEach((inp, idx) => {
        const txt = inp.value.trim();
        if (txt) {
          options.push({
            id: 'opt_' + (idx + 1) + '_' + Math.random().toString(36).substring(2, 6),
            text: txt,
            count: 0
          });
        }
      });

      if (options.length < 2) {
        Utils.toast('Vui lòng tạo ít nhất 2 phương án bình chọn!', 'warning');
        return;
      }

      payload.options = options;
      payload.pollType = form.pollType.value || 'single';
      payload.showResults = form.showResults.value || 'always';
    }

    Utils.showLoading('Đang đăng bài viết lên hệ thống...');
    try {
      await FirebaseService.saveAnnouncement(payload);
      Utils.hideLoading();
      Utils.toast('Đã đăng bài viết thành công!', 'success');

      if (window.App && App.closeModal) {
        App.closeModal('modalAdminCreateAnnouncement');
      }
    } catch (err) {
      Utils.hideLoading();
      Utils.toast('Lỗi khi đăng bài: ' + err.message, 'error');
    }
  },

  renderAdminList() {
    const container = document.getElementById('adminAnnouncementsList');
    if (!container) return;

    if (!this.announcements.length) {
      container.innerHTML = `
        <div class="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-8 text-center">
          <div class="w-14 h-14 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mx-auto mb-3">
            📢
          </div>
          <h4 class="font-bold text-white text-sm">Chưa có bài thông báo hoặc bình chọn nào</h4>
          <p class="text-xs text-slate-400 mt-1">Bấm các nút phía trên để đăng thông báo hoặc tạo cuộc bình chọn mới cho nhân viên.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.announcements.map((item) => {
      const isPoll = item.type === 'poll';
      const isClosed = item.status === 'closed';
      const isPinned = !!item.pinned;

      let dateDisplay = 'Mới tạo';
      if (item.createdAt) {
        try {
          const d = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
          dateDisplay = d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        } catch (e) {}
      }

      let totalVotes = 0;
      if (item.options && Array.isArray(item.options)) {
        totalVotes = item.options.reduce((sum, opt) => sum + (opt.count || 0), 0);
      }

      // Poll options progress
      let optionsHtml = '';
      if (isPoll && item.options && item.options.length) {
        optionsHtml = `
          <div class="mt-3 pt-3 border-t border-[#1E293B] space-y-2">
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Phương án (${totalVotes} lượt bình chọn):</span>
              <span class="text-purple-400 font-mono">${item.pollType === 'multiple' ? 'Đa lựa chọn' : 'Đơn lựa chọn'}</span>
            </div>
            ${item.options.map((opt) => {
              const count = opt.count || 0;
              const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
              return `
                <div class="bg-[#080D1A] p-2.5 rounded-xl border border-[#1E293B]">
                  <div class="flex items-center justify-between text-xs text-slate-200 mb-1">
                    <span class="font-medium">${escapeHtml(opt.text)}</span>
                    <span class="font-mono text-purple-400 font-bold">${count} (${pct}%)</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style="width: ${pct}%"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      return `
        <div class="bg-[#0F172A] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-lg">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isPoll ? 'bg-purple-900/60 text-purple-300 border border-purple-500/50' : 'bg-red-900/60 text-red-300 border border-red-500/50'}">
                ${isPoll ? '📊 BÌNH CHỌN' : '📢 THÔNG BÁO'}
              </span>

              ${isPinned ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  📌 ĐÃ GHIM
                </span>
              ` : ''}

              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isClosed ? 'bg-slate-800 text-slate-400' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'}">
                ${isClosed ? 'ĐÃ ĐÓNG' : 'ĐANG MỞ'}
              </span>

              <span class="text-xs text-slate-500 font-mono">${dateDisplay}</span>
            </div>

            <!-- Stats badges -->
            <div class="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span title="Lượt đọc">👁️ ${(item.reads && item.reads.length) || 0}</span>
              ${isPoll ? `<span title="Lượt bình chọn">🗳️ ${totalVotes}</span>` : ''}
              <span title="Bình luận">💬 ${item.commentCount || 0}</span>
            </div>
          </div>

          <h3 class="text-base font-bold text-white mt-2.5 mb-1">${escapeHtml(item.title)}</h3>
          <p class="text-xs text-slate-300 whitespace-pre-line leading-relaxed line-clamp-3">${escapeHtml(item.content)}</p>

          ${item.imageUrl ? `
            <div class="mt-2 text-xs text-cyan-400 flex items-center gap-1 cursor-pointer hover:underline" onclick="window.open('${escapeHtml(item.imageUrl)}', '_blank')">
              <span>🖼️ Xem ảnh đính kèm</span>
            </div>
          ` : ''}

          ${optionsHtml}

          <!-- Admin Action Buttons -->
          <div class="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <!-- Nút Quản lý bình luận & Giải mã ẩn danh -->
              <button onclick="AdminAnnouncements.openCommentsModal('${item.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-bold transition flex items-center gap-1.5">
                <span>💬</span>
                <span>Kiểm Duyệt Bình Luận (${item.commentCount || 0})</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5 flex-wrap">
              <!-- Ghim / Bỏ ghim -->
              <button onclick="AdminAnnouncements.handleTogglePin('${item.id}', ${isPinned})" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition" title="${isPinned ? 'Bỏ ghim bài' : 'Ghim bài lên đầu'}">
                ${isPinned ? 'Bỏ Ghim' : '📌 Ghim'}
              </button>

              <!-- Đóng / Mở lại (nếu là poll) -->
              ${isPoll ? `
                <button onclick="AdminAnnouncements.handleToggleClose('${item.id}', ${isClosed})" class="px-2.5 py-1.5 rounded-lg ${isClosed ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-800' : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900 border border-amber-800'} text-xs font-semibold transition">
                  ${isClosed ? 'Mở Lại' : 'Khóa Poll'}
                </button>
              ` : ''}

              <!-- Xóa bài -->
              <button onclick="AdminAnnouncements.handleDelete('${item.id}')" class="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold transition">
                🗑️ Xóa
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  async handleTogglePin(id, isPinned) {
    Utils.showLoading('Đang cập nhật trạng thái ghim...');
    try {
      await FirebaseService.togglePinAnnouncement(id, isPinned);
      Utils.hideLoading();
      Utils.toast(isPinned ? 'Đã bỏ ghim bài viết' : 'Đã ghim bài viết lên đầu', 'success');
    } catch (e) {
      Utils.hideLoading();
      Utils.toast('Lỗi cập nhật: ' + e.message, 'error');
    }
  },

  async handleToggleClose(id, isClosed) {
    Utils.showLoading('Đang cập nhật trạng thái bình chọn...');
    try {
      await FirebaseService.toggleCloseAnnouncement(id, isClosed);
      Utils.hideLoading();
      Utils.toast(isClosed ? 'Đã mở lại cuộc bình chọn' : 'Đã đóng cuộc bình chọn', 'success');
    } catch (e) {
      Utils.hideLoading();
      Utils.toast('Lỗi cập nhật: ' + e.message, 'error');
    }
  },

  async handleDelete(id) {
    if (typeof Swal !== 'undefined') {
      const res = await Swal.fire({
        title: 'Xóa bài viết?',
        text: 'Hành động này sẽ xóa toàn bộ nội dung, bình chọn và các bình luận liên quan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D90012',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Đồng ý xóa',
        cancelButtonText: 'Hủy'
      });
      if (!res.isConfirmed) return;
    } else {
      if (!confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return;
    }

    Utils.showLoading('Đang xóa bài viết...');
    try {
      await FirebaseService.deleteAnnouncement(id);
      Utils.hideLoading();
      Utils.toast('Đã xóa bài viết thành công!', 'success');
    } catch (e) {
      Utils.hideLoading();
      Utils.toast('Lỗi khi xóa bài: ' + e.message, 'error');
    }
  },

  /**
   * Mở modal kiểm duyệt bình luận và XÁC THỰC DANH TÍNH ẨN DANH DÀNH CHO ADMIN
   */
  openCommentsModal(announcementId) {
    this.activeCommentsAnnouncementId = announcementId;
    const post = this.announcements.find((a) => a.id === announcementId);
    if (!post) return;

    const titleEl = document.getElementById('adminCommentsModalTitle');
    if (titleEl) {
      titleEl.textContent = `Kiểm Duyệt Bình Luận: "${post.title}"`;
    }

    if (this.commentsUnsub) {
      this.commentsUnsub();
      this.commentsUnsub = null;
    }

    if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
      this.commentsUnsub = FirebaseService.listenToComments(announcementId, (comments) => {
        this.renderAdminComments(announcementId, comments);
      });
    }

    if (window.App && App.openModal) {
      App.openModal('modalAdminViewComments');
    }
  },

  renderAdminComments(announcementId, comments) {
    const listEl = document.getElementById('adminCommentsContainer');
    if (!listEl) return;

    if (!comments || !comments.length) {
      listEl.innerHTML = `
        <div class="text-center py-8 text-xs text-slate-400">
          Chưa có bình luận nào cho bài viết này.
        </div>
      `;
      return;
    }

    listEl.innerHTML = comments.map((c) => {
      const isAnon = !!c.isAnonymous;
      let timeStr = '';
      if (c.createdAt) {
        try {
          const d = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
          timeStr = d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        } catch (e) {}
      }

      return `
        <div class="p-3.5 rounded-xl ${isAnon ? 'bg-purple-950/40 border border-purple-800/60' : 'bg-[#080D1A] border border-[#1E293B]'} text-xs">
          <div class="flex items-start justify-between gap-3 mb-2">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <!-- Badge chế độ -->
                ${isAnon ? `
                  <span class="bg-purple-900/80 text-purple-200 border border-purple-500/60 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                    <span>🕵️</span>
                    <span>ẨN DANH VỚI NHÂN VIÊN</span>
                  </span>
                ` : `
                  <span class="bg-blue-900/80 text-blue-200 border border-blue-500/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    🌐 CÔNG KHAI
                  </span>
                `}

                <!-- HIỂN THỊ DANH TÍNH THẬT CHO ADMIN -->
                <span class="text-amber-300 font-mono font-bold">${escapeHtml(c.empId || 'Không có mã')}</span>
                <span class="text-white font-bold">${escapeHtml(c.empName || 'Chưa rõ tên')}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-0.5">${timeStr}</div>
            </div>

            <!-- Nút xóa bình luận -->
            <button onclick="AdminAnnouncements.deleteComment('${announcementId}', '${c.id}')" class="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[11px] font-semibold transition" title="Xóa bình luận vi phạm">
              🗑️ Xóa
            </button>
          </div>

          <div class="text-slate-200 leading-relaxed pl-2 border-l-2 ${isAnon ? 'border-purple-500' : 'border-slate-600'} whitespace-pre-line">
            ${escapeHtml(c.content)}
          </div>
        </div>
      `;
    }).join('');
  },

  async deleteComment(announcementId, commentId) {
    if (!confirm('Bạn có chắc muốn xóa bình luận này không?')) return;
    Utils.showLoading('Đang xóa bình luận...');
    try {
      await FirebaseService.deleteComment(announcementId, commentId);
      Utils.hideLoading();
      Utils.toast('Đã xóa bình luận!', 'success');
    } catch (e) {
      Utils.hideLoading();
      Utils.toast('Lỗi khi xóa bình luận: ' + e.message, 'error');
    }
  }
};

if (typeof window !== 'undefined') {
  window.AdminAnnouncements = AdminAnnouncements;
}

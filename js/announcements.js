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
 * PHÂN HỆ THÔNG BÁO & BÌNH CHỌN CHO NHÂN VIÊN (AGARI HR)
 * Cung cấp chức năng:
 * - Xem bảng tin thông báo & các cuộc bình chọn thời gian thực
 * - Tham gia bình chọn (Vote) & xem tỷ lệ phần trăm
 * - Bình luận vào bài viết (Hỗ trợ chế độ Công Khai hoặc Ẩn Danh)
 */
const AnnouncementsModule = {
  announcements: [],
  currentFilter: 'all', // 'all' | 'announcement' | 'poll'
  activeCommentsId: null,
  commentsUnsub: null,
  commentsCache: {},

  init() {
    this.bindEvents();
    this.setupRealtime();
  },

  setupRealtime() {
    if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
      if (typeof FirebaseService.seedInitialAnnouncementsIfEmpty === 'function') {
        FirebaseService.seedInitialAnnouncementsIfEmpty();
      }

      FirebaseService.listenToAnnouncements((items) => {
        this.announcements = items || [];
        this.render();
        this.updateBadge();
      });
    }
  },

  bindEvents() {
    // Bộ lọc: Tất cả / Thông báo / Bình chọn
    document.querySelectorAll('.filter-announcement-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const filter = e.currentTarget.dataset.filter || 'all';
        this.setFilter(filter);
      });
    });

    // Mở modal khi bấm vào nút Thông Báo trên Header
    const btnHeaderNotice = document.getElementById('btnHeaderAnnouncements');
    if (btnHeaderNotice) {
      btnHeaderNotice.addEventListener('click', () => {
        if (window.App && App.openModal) {
          App.openModal('modalAnnouncements');
        }
      });
    }
  },

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-announcement-tab').forEach((btn) => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('bg-agari-red', 'text-white', 'shadow-sm');
        btn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
      } else {
        btn.classList.remove('bg-agari-red', 'text-white', 'shadow-sm');
        btn.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
      }
    });
    this.render();
  },

  getCurrentUser() {
    let empId = localStorage.getItem('agr_empId') || '';
    let empName = localStorage.getItem('agr_empName') || '';
    return { empId, empName };
  },

  async promptForUserInfo() {
    if (typeof Swal !== 'undefined') {
      const { value: formValues } = await Swal.fire({
        title: 'Xác Nhận Danh Tính Nhân Sự',
        html: `
          <p class="text-xs text-slate-500 mb-3 text-left">Vui lòng nhập Mã OPS và Họ Tên để hệ thống ghi nhận lượt bình chọn hoặc bình luận:</p>
          <div class="space-y-3 text-left">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Mã Nhân Viên (Mã OPS):</label>
              <input id="swalInputEmpId" class="swal2-input !m-0 !w-full !text-sm uppercase font-mono" placeholder="Ví dụ: OPS123456" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">Họ và Tên:</label>
              <input id="swalInputEmpName" class="swal2-input !m-0 !w-full !text-sm" placeholder="Ví dụ: Nguyễn Văn A" />
            </div>
          </div>
        `,
        focusConfirm: false,
        confirmButtonText: 'Xác Nhận & Tiếp Tục',
        confirmButtonColor: '#D90012',
        showCancelButton: true,
        cancelButtonText: 'Hủy',
        preConfirm: () => {
          const empId = document.getElementById('swalInputEmpId').value.trim().toUpperCase();
          const empName = document.getElementById('swalInputEmpName').value.trim();
          if (!empId) {
            Swal.showValidationMessage('Vui lòng nhập Mã OPS');
            return false;
          }
          if (!empName) {
            Swal.showValidationMessage('Vui lòng nhập Họ và Tên');
            return false;
          }
          return { empId, empName };
        }
      });

      if (formValues) {
        localStorage.setItem('agr_empId', formValues.empId);
        localStorage.setItem('agr_empName', formValues.empName);
        return formValues;
      }
      return null;
    } else {
      const empId = prompt('Nhập Mã OPS của bạn:');
      if (!empId) return null;
      const empName = prompt('Nhập Họ Tên của bạn:') || 'Nhân Viên';
      localStorage.setItem('agr_empId', empId.toUpperCase());
      localStorage.setItem('agr_empName', empName);
      return { empId: empId.toUpperCase(), empName };
    }
  },

  render() {
    const container = document.getElementById('employeeAnnouncementsList');
    if (!container) return;

    let items = this.announcements;
    if (this.currentFilter === 'announcement') {
      items = items.filter((i) => i.type === 'announcement');
    } else if (this.currentFilter === 'poll') {
      items = items.filter((i) => i.type === 'poll');
    }

    if (!items.length) {
      container.innerHTML = `
        <div class="bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-sm">
          <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-3xl mx-auto mb-3">
            📭
          </div>
          <h4 class="font-bold text-slate-700 text-base">Chưa có bài đăng nào</h4>
          <p class="text-xs text-slate-400 mt-1">Các thông báo và bình chọn mới từ Ban Quản Trị sẽ hiển thị tại đây.</p>
        </div>
      `;
      return;
    }

    const { empId: currentEmpId } = this.getCurrentUser();

    container.innerHTML = items.map((item) => {
      const isPoll = item.type === 'poll';
      const isClosed = item.status === 'closed';
      const isPinned = !!item.pinned;
      const allowComments = item.allowComments !== false;

      // Check user vote
      const userVote = (item.votes && currentEmpId && item.votes[currentEmpId]) ? item.votes[currentEmpId] : null;
      const hasVoted = !!userVote;

      // Calculate total votes
      let totalVotes = 0;
      if (item.options && Array.isArray(item.options)) {
        totalVotes = item.options.reduce((sum, opt) => sum + (opt.count || 0), 0);
      }

      // Format date
      let dateDisplay = 'Vừa xong';
      if (item.createdAt) {
        try {
          const d = item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
          dateDisplay = d.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        } catch (e) {}
      }

      // Options HTML
      let pollSectionHtml = '';
      if (isPoll && item.options && item.options.length) {
        const canViewResults = hasVoted || isClosed || item.showResults === 'always';

        if (!canViewResults && !isClosed) {
          // Giao diện chọn phương án để vote
          const isMulti = item.pollType === 'multiple';
          const maxChoices = item.maxChoices || 1;
          const inputType = isMulti ? 'checkbox' : 'radio';

          const optionsList = item.options.map((opt) => `
            <label class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/40 cursor-pointer transition">
              <input type="${inputType}" name="poll_opt_${item.id}" value="${opt.id}" class="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded" />
              <span class="text-xs sm:text-sm font-medium text-slate-800 flex-1">${escapeHtml(opt.text)}</span>
            </label>
          `).join('');

          pollSectionHtml = `
            <div class="mt-4 pt-4 border-t border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-700">Các phương án bình chọn:</span>
                <span class="text-[11px] text-purple-600 font-semibold">${isMulti ? `(Chọn tối đa ${maxChoices} phương án)` : '(Chọn 1 phương án)'}</span>
              </div>
              <div class="space-y-2 mb-3">
                ${optionsList}
              </div>
              <button onclick="AnnouncementsModule.handleVote('${item.id}', ${isMulti}, ${maxChoices})" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2">
                <span>🗳️</span>
                <span>Bình Chọn Ngay</span>
              </button>
            </div>
          `;
        } else {
          // Giao diện hiển thị thanh kết quả
          const optionsList = item.options.map((opt) => {
            const count = opt.count || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isUserChoice = userVote && userVote.optionIds && userVote.optionIds.includes(opt.id);

            return `
              <div class="p-3 rounded-xl border ${isUserChoice ? 'border-purple-300 bg-purple-50/50' : 'border-slate-200 bg-slate-50/60'}">
                <div class="flex items-center justify-between text-xs sm:text-sm mb-1.5 font-semibold text-slate-800">
                  <div class="flex items-center gap-2">
                    <span>${escapeHtml(opt.text)}</span>
                    ${isUserChoice ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">✓ Lựa chọn của bạn</span>' : ''}
                  </div>
                  <span class="text-purple-700 font-mono">${count} phiếu (${pct}%)</span>
                </div>
                <div class="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                </div>
              </div>
            `;
          }).join('');

          pollSectionHtml = `
            <div class="mt-4 pt-4 border-t border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-slate-700">Kết quả bình chọn (${totalVotes} lượt tham gia):</span>
                ${hasVoted && !isClosed ? `
                  <button onclick="AnnouncementsModule.reVote('${item.id}')" class="text-[11px] text-purple-600 hover:underline font-semibold">
                    Thay đổi lựa chọn
                  </button>
                ` : ''}
              </div>
              <div class="space-y-2.5">
                ${optionsList}
              </div>
            </div>
          `;
        }
      }

      // Image attachment
      let imageHtml = '';
      if (item.imageUrl) {
        imageHtml = `
          <div class="mt-3 rounded-2xl overflow-hidden border border-slate-200 max-h-72 bg-slate-900 flex items-center justify-center">
            <img src="${escapeHtml(item.imageUrl)}" alt="Đính kèm" class="w-full h-auto object-cover hover:scale-[1.02] transition cursor-pointer" onclick="window.open('${escapeHtml(item.imageUrl)}', '_blank')" />
          </div>
        `;
      }

      const isCommentsOpen = this.activeCommentsId === item.id;

      return `
        <article class="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition relative">
          <!-- Pinned Badge -->
          ${isPinned ? `
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200 mb-3">
              <span>📌</span>
              <span>Được Ghim Lên Đầu</span>
            </div>
          ` : ''}

          <!-- Header info -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-10 h-10 rounded-2xl ${isPoll ? 'bg-purple-100 text-purple-600' : 'bg-red-100 text-agari-red'} flex items-center justify-center text-xl font-bold">
                ${isPoll ? '📊' : '📢'}
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-slate-900 text-xs sm:text-sm">${escapeHtml(item.author || 'Phòng Nhân Sự')}</span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isPoll ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-agari-red'}">
                    ${isPoll ? 'Bình Chọn' : 'Thông Báo'}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 font-medium">${dateDisplay}</div>
              </div>
            </div>

            <!-- Status tag -->
            <div>
              ${isPoll ? (isClosed ? '<span class="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Đã đóng</span>' : '<span class="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">Đang mở</span>') : ''}
            </div>
          </div>

          <!-- Body Title & Content -->
          <h3 class="text-base sm:text-lg font-extrabold text-slate-900 mt-3.5 mb-2 leading-snug">
            ${escapeHtml(item.title)}
          </h3>

          <div class="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            ${escapeHtml(item.content)}
          </div>

          ${imageHtml}
          ${pollSectionHtml}

          <!-- Action bar -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1 font-medium">
                <span>👁️</span>
                <span>${(item.reads && item.reads.length) || 0} đã xem</span>
              </span>
            </div>

            ${allowComments ? `
              <button onclick="AnnouncementsModule.toggleComments('${item.id}')" class="px-3 py-1.5 rounded-xl ${isCommentsOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} font-bold transition flex items-center gap-1.5">
                <span>💬</span>
                <span>${item.commentCount || 0} Bình luận</span>
              </button>
            ` : '<span class="text-[11px] text-slate-400 italic">Bình luận đã tắt</span>'}
          </div>

          <!-- Comments Drawer -->
          <div id="commentsDrawer_${item.id}" class="${isCommentsOpen ? 'block' : 'hidden'} mt-4 pt-4 border-t border-slate-200">
            <h4 class="font-bold text-slate-800 text-xs sm:text-sm mb-3 flex items-center gap-2">
              <span>💬</span>
              <span>Bình Luận & Đóng Góp Ý Kiến</span>
            </h4>

            <!-- Danh sách bình luận -->
            <div id="commentsList_${item.id}" class="space-y-2.5 max-h-80 overflow-y-auto pr-1 mb-4">
              <div class="text-center py-4 text-xs text-slate-400">Đang tải bình luận...</div>
            </div>

            <!-- Form gửi bình luận -->
            <div class="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200">
              <div class="mb-2">
                <textarea id="commentInput_${item.id}" rows="2" placeholder="Chia sẻ suy nghĩ hoặc ý kiến của bạn về bài viết..." class="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-agari-red resize-none"></textarea>
              </div>

              <div class="flex items-center justify-between flex-wrap gap-2">
                <!-- Checkbox Ẩn danh -->
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" id="anonCheck_${item.id}" class="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" />
                  <span class="text-xs font-bold text-purple-700 flex items-center gap-1">
                    <span>🕵️</span>
                    <span>Bình luận ẩn danh</span>
                  </span>
                </label>

                <button onclick="AnnouncementsModule.submitComment('${item.id}')" class="px-4 py-2 rounded-xl bg-agari-red hover:bg-agari-red-dark text-white font-bold text-xs shadow-md transition flex items-center gap-1.5">
                  <span>Gửi Ý Kiến</span>
                  <span>🚀</span>
                </button>
              </div>
              <p class="text-[10px] text-slate-400 mt-2">
                * Bình luận ẩn danh sẽ che giấu danh tính với các đồng nghiệp khác. Ban Quản trị vẫn có thể xác thực nếu có hành vi vi phạm chuẩn mực.
              </p>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  async handleVote(announcementId, isMulti, maxChoices) {
    let { empId, empName } = this.getCurrentUser();
    if (!empId) {
      const user = await this.promptForUserInfo();
      if (!user) return;
      empId = user.empId;
      empName = user.empName;
    }

    const selectedInputs = document.querySelectorAll(`input[name="poll_opt_${announcementId}"]:checked`);
    if (!selectedInputs.length) {
      Utils.toast('Vui lòng chọn ít nhất một phương án để bình chọn!', 'warning');
      return;
    }

    if (isMulti && selectedInputs.length > maxChoices) {
      Utils.toast(`Bạn chỉ được chọn tối đa ${maxChoices} phương án!`, 'warning');
      return;
    }

    const optionIds = Array.from(selectedInputs).map((inp) => inp.value);

    Utils.showLoading('Đang ghi nhận bình chọn của bạn...');
    try {
      await FirebaseService.submitVote(announcementId, empId, empName, optionIds);
      Utils.hideLoading();
      Utils.toast('Bình chọn thành công! Cảm ơn ý kiến của bạn.', 'success');
    } catch (e) {
      Utils.hideLoading();
      Utils.toast(e.message || 'Lỗi khi gửi bình chọn', 'error');
    }
  },

  reVote(announcementId) {
    // Cho phép hiển thị lại danh sách lựa chọn để thay đổi phương án
    const item = this.announcements.find((a) => a.id === announcementId);
    if (!item || item.status === 'closed') return;
    const { empId } = this.getCurrentUser();
    if (item.votes && item.votes[empId]) {
      delete item.votes[empId];
      this.render();
    }
  },

  toggleComments(announcementId) {
    if (this.activeCommentsId === announcementId) {
      this.activeCommentsId = null;
      if (this.commentsUnsub) {
        this.commentsUnsub();
        this.commentsUnsub = null;
      }
      this.render();
      return;
    }

    this.activeCommentsId = announcementId;
    this.render();

    // Mark as read
    const { empId } = this.getCurrentUser();
    if (empId && FirebaseService.markAnnouncementRead) {
      FirebaseService.markAnnouncementRead(announcementId, empId);
    }

    // Subscribe to comments
    if (this.commentsUnsub) {
      this.commentsUnsub();
      this.commentsUnsub = null;
    }

    if (typeof FirebaseService !== 'undefined' && FirebaseService.isInitialized) {
      this.commentsUnsub = FirebaseService.listenToComments(announcementId, (comments) => {
        this.renderCommentsList(announcementId, comments);
      });
    }
  },

  renderCommentsList(announcementId, comments) {
    const listEl = document.getElementById(`commentsList_${announcementId}`);
    if (!listEl) return;

    if (!comments || !comments.length) {
      listEl.innerHTML = `
        <div class="text-center py-4 text-xs text-slate-400">
          Chưa có bình luận nào. Hãy là người đầu tiên để lại ý kiến!
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

      // QUY TẮC HIỂN THỊ CHO NHÂN VIÊN:
      // Nếu là ẩn danh: Che giấu danh tính, hiển thị "Nhân viên ẩn danh 👤"
      const displayName = isAnon ? 'Nhân viên ẩn danh' : escapeHtml(c.empName || 'Nhân sự');
      const avatarContent = isAnon ? '🕵️' : (c.empName ? c.empName.charAt(0).toUpperCase() : '👤');

      return `
        <div class="p-3 rounded-2xl ${isAnon ? 'bg-purple-50/70 border border-purple-200/60' : 'bg-slate-50 border border-slate-200'} text-xs">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full ${isAnon ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-700'} flex items-center justify-center font-bold text-[10px]">
                ${avatarContent}
              </div>
              <span class="font-bold ${isAnon ? 'text-purple-900 italic' : 'text-slate-800'}">${displayName}</span>
              ${isAnon ? '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-800">ẨN DANH</span>' : ''}
            </div>
            <span class="text-[10px] text-slate-400">${timeStr}</span>
          </div>
          <div class="text-slate-700 pl-8 leading-relaxed whitespace-pre-line">${escapeHtml(c.content)}</div>
        </div>
      `;
    }).join('');
  },

  async submitComment(announcementId) {
    let { empId, empName } = this.getCurrentUser();
    if (!empId) {
      const user = await this.promptForUserInfo();
      if (!user) return;
      empId = user.empId;
      empName = user.empName;
    }

    const input = document.getElementById(`commentInput_${announcementId}`);
    const anonCheck = document.getElementById(`anonCheck_${announcementId}`);
    if (!input) return;

    const content = input.value.trim();
    if (!content) {
      Utils.toast('Vui lòng nhập nội dung bình luận!', 'warning');
      return;
    }

    const isAnonymous = anonCheck ? anonCheck.checked : false;

    Utils.showLoading('Đang gửi bình luận...');
    try {
      await FirebaseService.addComment(announcementId, {
        empId: empId,
        empName: empName,
        isAnonymous: isAnonymous,
        content: content
      });
      input.value = '';
      Utils.hideLoading();
      Utils.toast(isAnonymous ? 'Đã gửi bình luận ở chế độ ẩn danh!' : 'Đã gửi bình luận!', 'success');
    } catch (e) {
      Utils.hideLoading();
      Utils.toast('Lỗi khi gửi bình luận', 'error');
    }
  },

  updateBadge() {
    const badge = document.getElementById('badgeUnreadAnnouncements');
    const headerBadge = document.getElementById('headerAnnouncementsBadge');

    const total = this.announcements.length;
    const activePolls = this.announcements.filter((a) => a.type === 'poll' && a.status !== 'closed').length;

    if (badge) {
      if (total > 0) {
        badge.classList.remove('hidden');
        badge.textContent = activePolls > 0 ? `${activePolls} Bình chọn` : 'Mới';
      } else {
        badge.classList.add('hidden');
      }
    }

    if (headerBadge) {
      if (activePolls > 0 || total > 0) {
        headerBadge.classList.remove('hidden');
      } else {
        headerBadge.classList.add('hidden');
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.AnnouncementsModule = AnnouncementsModule;
}

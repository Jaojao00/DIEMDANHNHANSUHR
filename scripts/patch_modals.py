import os

file_path = "index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

modal_html = """
<!-- ==============================================================
     ADMIN NOTIFICATION MODAL
     ============================================================== -->
<div class="modal-overlay hidden" id="adminNotifModal" role="dialog" aria-modal="true">
  <div class="modal" style="max-width: 600px;">
    <div class="modal-header">
      <div class="modal-icon" style="background:#ff4b4b22; color:#ff4b4b;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
      </div>
      <h3 class="modal-title">Yêu Cầu Thay Đổi Lịch</h3>
      <button class="modal-close" id="closeAdminNotifModal">&times;</button>
    </div>
    <div class="modal-body">
      <div id="adminNotifList">
        <p style="text-align:center; color:var(--text-muted); padding: 20px;">Không có yêu cầu nào đang chờ duyệt.</p>
      </div>
    </div>
  </div>
</div>

<!-- ==============================================================
     ADMIN APPROVAL MODAL
     ============================================================== -->
<div class="modal-overlay hidden" id="adminApproveModal" role="dialog" aria-modal="true">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-icon" style="background:#43e97b22; color:#43e97b;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <h3 class="modal-title">Duyệt Yêu Cầu</h3>
      <button class="modal-close" id="closeAdminApproveModal">&times;</button>
    </div>
    <div class="modal-body" style="text-align:center">
      <p>Bạn có chắc chắn muốn duyệt yêu cầu thay đổi lịch của nhân sự này không?</p>
      <p style="font-size:13px; color:var(--text-muted); margin-bottom: 20px;">Dữ liệu sẽ được ghi đè trực tiếp lên Google Sheets và không thể hoàn tác.</p>
      <div style="display:flex; gap:10px; justify-content:center;">
        <button class="btn btn-primary" id="confirmApproveBtn" style="padding: 10px 30px;">Duyệt</button>
        <button class="btn btn-outline" id="rejectApproveBtn" style="padding: 10px 30px; border-color:#ff4b4b; color:#ff4b4b;">Từ chối</button>
      </div>
    </div>
  </div>
</div>
"""

if "id=\"adminNotifModal\"" not in content:
    content = content.replace('<!-- Scripts -->', modal_html + '\n<!-- Scripts -->')
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected modals into index.html")
else:
    print("Already exists.")

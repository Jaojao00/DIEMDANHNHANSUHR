import re
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

modal_html = '''
    <!-- ITEM REQUEST MODAL -->
    <div id="itemRequestModal" class="modal-overlay hidden" role="dialog" aria-modal="true">
      <div class="modal request-modal modal-responsive">
        <div class="modal-header">
          <h3 id="itemRequestModalTitle">👕 Yêu Cầu Cấp Đổi Áo/Thẻ</h3>
          <button class="modal-close-btn" id="itemRequestModalCloseBtn" aria-label="Đóng hộp thoại">x</button>
        </div>
        <div class="modal-body" style="padding: 20px">
          <form id="itemRequestForm" autocomplete="off">
            <div class="form-group">
              <label class="form-label">Loại Yêu Cầu <span class="required-star">*</span></label>
              <div style="display:flex; gap:20px; align-items:center;">
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                  <input type="radio" name="itemReqType" value="Đổi Áo" checked onchange="ItemRequestModule.toggleFields()"> Đổi Áo
                </label>
                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                  <input type="radio" name="itemReqType" value="Đổi Thẻ" onchange="ItemRequestModule.toggleFields()"> Đổi Thẻ
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="itemReqEmpId">Mã Nhân Viên <span class="required-star">*</span></label>
              <input type="text" id="itemReqEmpId" class="form-input" placeholder="Ví dụ: OPS12345" required />
            </div>

            <div class="form-group">
              <label class="form-label" for="itemReqName">Họ và Tên <span class="required-star">*</span></label>
              <input type="text" id="itemReqName" class="form-input" placeholder="Nhập họ và tên..." required />
            </div>

            <div class="form-group">
              <label class="form-label" for="itemReqShift">Ca Làm Việc <span class="required-star">*</span></label>
              <select id="itemReqShift" class="form-input" required>
                <option value="">-- Chọn Ca --</option>
                <option value="Ca Sáng">Ca Sáng (06:00-11:00)</option>
                <option value="Ca OS Sáng">Ca OS Sáng (06:00-15:00)</option>
                <option value="Ca Chiều">Ca Chiều (13:00-22:00)</option>
                <option value="Ca Tối">Ca Tối (18:00-22:00)</option>
                <option value="Ca Đêm">Ca Đêm (22:00-06:00)</option>
              </select>
            </div>

            <div id="itemReqShirtFields">
              <div class="form-group">
                <label class="form-label" for="itemReqRole">Chức Danh <span class="required-star">*</span></label>
                <select id="itemReqRole" class="form-input" onchange="ItemRequestModule.calculatePrice()">
                  <option value="">-- Chọn Chức Danh --</option>
                  <option value="OS">OS</option>
                  <option value="BPO">BPO</option>
                  <option value="S-BPO">S-BPO</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="itemReqQuantity">Số Lượng <span class="required-star">*</span></label>
                <input type="number" id="itemReqQuantity" class="form-input" value="1" min="1" max="10" oninput="ItemRequestModule.calculatePrice()" />
              </div>

              <div class="form-group">
                <label class="form-label" for="itemReqDate">Ngày Lấy <span class="required-star">*</span></label>
                <input type="date" id="itemReqDate" class="form-input" />
              </div>

              <div class="form-group">
                <label class="form-label" for="itemReqPrice">Giá Tiền</label>
                <input type="text" id="itemReqPrice" class="form-input" readonly style="background:#2a2b36; font-weight:bold; color:#FFD75A;" placeholder="0" />
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-full" id="itemReqSubmitBtn">Gửi Yêu Cầu</button>
          </form>
        </div>
      </div>
    </div>
'''

content = content.replace('<!-- REQUEST SUCCESS MODAL -->', modal_html + '\n    <!-- REQUEST SUCCESS MODAL -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added modal")

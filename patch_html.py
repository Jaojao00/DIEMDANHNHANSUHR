with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

modal_html = """
    <!-- Complaint Modal -->
    <div id="complaintModal" class="modal-overlay hidden" style="z-index: 10000; align-items: center; justify-content: center; display: flex;">
      <div class="modal-content" style="background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 25px; width: 90%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0; color: #fff; font-size: 1.2rem; text-align: center; margin-bottom: 20px;">Gửi Phiếu Khiếu Nại</h3>
        
        <div style="margin-bottom: 15px;">
           <label style="display:block; margin-bottom:8px; color:#aaa; font-size: 0.9rem;">Loại khiếu nại</label>
           <select id="compType" class="input-modern" style="width:100%; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 8px;">
              <option>Thiếu ngày công</option>
              <option>Sai số giờ làm</option>
              <option>Sai tổng lương</option>
              <option>Chưa cập nhật vị trí</option>
              <option>Khác</option>
           </select>
        </div>
        
        <div style="margin-bottom: 15px;">
           <label style="display:block; margin-bottom:8px; color:#aaa; font-size: 0.9rem;">Nội dung chi tiết</label>
           <textarea id="compDesc" class="input-modern" rows="3" placeholder="Ví dụ: Ngày 16/09 em đi làm ca 10:30 - 23:00 nhưng trên web bị thiếu..." style="width:100%; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 10px; border-radius: 8px; resize: none;"></textarea>
        </div>
        
        <div style="margin-bottom: 20px;">
           <label style="display:block; margin-bottom:8px; color:#aaa; font-size: 0.9rem;">Ảnh minh chứng (nếu có)</label>
           <input type="file" id="compImage" accept="image/*" class="input-modern" style="width:100%; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px; border-radius: 8px;">
        </div>
        
        <div style="display:flex; gap:12px;">
           <button class="btn btn-outline" style="flex:1; border-radius: 8px; border-color: rgba(255,255,255,0.2); color: #fff;" onclick="window.closeComplaintModal()">Hủy</button>
           <button class="btn btn-primary" style="flex:1; border-radius: 8px;" onclick="window.submitComplaint()">Gửi Phiếu</button>
        </div>
      </div>
    </div>
"""

if "id=\"complaintModal\"" not in content:
    # insert before </body>
    content = content.replace("</body>", modal_html + "\n  </body>")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Injected modal HTML into index.html")

import re
with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# Replace the modal content to add the new fields
old_modal_start = '<h3 style="margin-top:0; color: #fff; font-size: 1.2rem; text-align: center; margin-bottom: 20px;">Gửi Phiếu Khiếu Nại</h3>'

new_fields = """<h3 style="margin-top:0; color: #fff; font-size: 1.2rem; text-align: center; margin-bottom: 20px;">Gửi Phiếu Khiếu Nại</h3>
        
        <div style="margin-bottom: 12px; display: flex; gap: 10px;">
           <div style="flex: 1;">
               <label style="display:block; margin-bottom:5px; color:#aaa; font-size: 0.85rem;">Họ và Tên</label>
               <input type="text" id="compName" class="input-modern" readonly style="width:100%; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px; border-radius: 8px; opacity: 0.8;">
           </div>
           <div style="flex: 1;">
               <label style="display:block; margin-bottom:5px; color:#aaa; font-size: 0.85rem;">Mã OPS / CCCD</label>
               <input type="text" id="compCode" class="input-modern" readonly style="width:100%; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px; border-radius: 8px; opacity: 0.8;">
           </div>
        </div>
        
        <div style="margin-bottom: 12px;">
           <label style="display:block; margin-bottom:5px; color:#aaa; font-size: 0.85rem;">Số điện thoại liên hệ *</label>
           <input type="tel" id="compPhone" class="input-modern" placeholder="Nhập SĐT để quản lý liên hệ..." style="width:100%; background:rgba(0,0,0,0.3); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding: 8px; border-radius: 8px;">
        </div>"""

if old_modal_start in content and "id=\"compPhone\"" not in content:
    content = content.replace(old_modal_start, new_fields)
    print("Injected new fields into index.html")

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)

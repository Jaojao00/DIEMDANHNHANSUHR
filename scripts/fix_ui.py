import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

old_ui = '''    <div class="reg-body" style="padding: 20px;">
      <div class="form-group">
        <label>Ch?n Ca Mu?n ?i</label>
        <select id="crShiftSelect" class="form-control" style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border);">
          <option value="CA_NGAY">CA NG?Y (06:00-22:00)</option>
          <option value="18:00-22:00">Ca T?i (18:00-22:00)</option>
          <option value="22:00-06:00">Ca ?m (22:00-06:00)</option>
        </select>
      </div>
      <div class="form-group">
        <label>M Nhn Vin</label>
        <div style="display: flex; gap: 10px;">
          <input type="text" id="crEmpId" class="form-control" placeholder="VD: OPS123456" style="text-transform: uppercase;">
          <button class="btn btn-primary" onclick="RegApp.searchChangeRequest()" style="white-space: nowrap; padding: 0 20px;">Tra c?u</button>
        </div>
      </div>'''

# The encoding might mess up the exact matching.
# Let's use a robust string replacement with regex or find
import re

start_str = '    <div class="reg-body" style="padding: 20px;">'
end_str = '      <div id="crResultArea" style="display:none; margin-top: 20px;">'

start_idx = html.find(start_str)
end_idx = html.find(end_str)

if start_idx != -1 and end_idx != -1:
    new_ui = '''    <div class="reg-body">
      <div class="view-schedule-lookup">
        <div class="reg-section-title">Tra c?u yu c?u d?i l?ch</div>
        
        <div class="form-group" style="margin-bottom:12px">
          <label for="crShiftSelect">Ch?n Ca Mu?n D?i</label>
          <div class="input-wrapper" style="position: relative;">
            <select id="crShiftSelect" class="form-control" style="background: transparent; color: var(--text-primary); border: none; width: 100%; outline: none; -webkit-appearance: none; appearance: none; padding-right: 30px;">
              <option value="CA_NGAY">CA NGY (06:00-22:00)</option>
              <option value="18:00-22:00">Ca T?i (18:00-22:00)</option>
              <option value="22:00-06:00">Ca Dm (22:00-06:00)</option>
            </select>
            <div style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--primary);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>
            </div>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:12px">
          <label for="crEmpId">M Nhn Vin</label>
          <div class="input-wrapper">
            <input type="text" id="crEmpId" placeholder="VD: Ops224190" autocomplete="off" autocapitalize="none" style="text-transform: uppercase;"/>
          </div>
        </div>
        
        <button class="reg-submit-btn" onclick="RegApp.searchChangeRequest()" style="margin-bottom:0">? Tra c?u</button>
      </div>
      
'''
    # Wait, the Unicode encoding in the new_ui needs to be correct.
    new_ui = new_ui.replace("Tra c?u yu c?u d?i l?ch", "Tra cứu yêu cầu sửa lịch")
    new_ui = new_ui.replace("Ch?n Ca Mu?n D?i", "Chọn Ca Muốn Đổi")
    new_ui = new_ui.replace("CA NGY", "CA NGÀY")
    new_ui = new_ui.replace("Ca T?i", "Ca Tối")
    new_ui = new_ui.replace("Ca Dm", "Ca Đêm")
    new_ui = new_ui.replace("M Nhn Vin", "Mã Nhân Viên")
    new_ui = new_ui.replace("? Tra c?u", "🔍 Tra cứu lịch")
    
    html = html[:start_idx] + new_ui + html[end_idx:]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Replaced index.html UI successfully")
else:
    print("Could not find start or end index")

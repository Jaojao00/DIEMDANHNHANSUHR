import os

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I want to find the <div class="form-group" style="margin-bottom:12px"> that contains crShiftSelect
# And replace the whole form-group with a new list of cards.

# Let's find the exact string that contains the <div class="form-group" style="margin-bottom:12px"> for crShiftSelect
# Note: I used this in the previous fix:
old_part = '''        <div class="form-group" style="margin-bottom:12px">
          <label for="crShiftSelect">Chọn Ca Muốn Đổi</label>
          <div class="input-wrapper" style="position: relative;">
            <select id="crShiftSelect" class="form-control" style="background: transparent; color: var(--text-primary); border: none; width: 100%; outline: none; -webkit-appearance: none; appearance: none; padding-right: 30px;">
              <option value="CA_NGAY">CA NGÀY (06:00-22:00)</option>
              <option value="18:00-22:00">Ca Tối (18:00-22:00)</option>
              <option value="22:00-06:00">Ca Đêm (22:00-06:00)</option>
            </select>
            <div style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--primary);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"></path></svg>
            </div>
          </div>
        </div>'''

new_part = '''        <div class="form-group" style="margin-bottom:12px">
          <label>Chọn Ca Muốn Đổi</label>
          <div class="cr-shift-cards">
            <div class="reg-shift-card selected" onclick="RegApp.selectCRShift('CA_NGAY', this)" data-shift="CA_NGAY" data-name="CA NGÀY" style="margin-bottom: 10px;">
              <div class="reg-shift-icon" style="background: rgba(255, 179, 71, 0.15); color: #ffb347;">☀️</div>
              <div class="reg-shift-info">
                <div class="reg-shift-name">CA NGÀY</div>
                <div class="reg-shift-time" style="color: #ffb347; border-color: rgba(255,179,71,0.2);">06:00-22:00</div>
              </div>
              <div class="reg-shift-arrow checkmark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>

            <div class="reg-shift-card" onclick="RegApp.selectCRShift('18:00-22:00', this)" data-shift="18:00-22:00" data-name="Ca Tối" style="margin-bottom: 10px;">
              <div class="reg-shift-icon" style="background: rgba(150, 150, 255, 0.15); color: #a3a3ff;">🌃</div>
              <div class="reg-shift-info">
                <div class="reg-shift-name">Ca Tối</div>
                <div class="reg-shift-time" style="color: #a3a3ff; border-color: rgba(150, 150, 255, 0.2);">18:00-22:00</div>
              </div>
              <div class="reg-shift-arrow checkmark" style="display:none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="reg-shift-arrow arrow-icon" style="color: var(--text-muted);">→</div>
            </div>

            <div class="reg-shift-card" onclick="RegApp.selectCRShift('22:00-06:00', this)" data-shift="22:00-06:00" data-name="Ca Đêm" style="margin-bottom: 10px;">
              <div class="reg-shift-icon" style="background: rgba(180, 150, 255, 0.15); color: #c4a3ff;">🌙</div>
              <div class="reg-shift-info">
                <div class="reg-shift-name">Ca Đêm</div>
                <div class="reg-shift-time" style="color: #c4a3ff; border-color: rgba(180, 150, 255, 0.2);">22:00-06:00</div>
              </div>
              <div class="reg-shift-arrow checkmark" style="display:none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div class="reg-shift-arrow arrow-icon" style="color: var(--text-muted);">→</div>
            </div>
          </div>
        </div>'''

if old_part in html:
    html = html.replace(old_part, new_part)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Replaced dropdown with cards successfully")
else:
    print("Could not find the old part in index.html")
    # Let's try flexible search
    import re
    match = re.search(r'<div class="form-group" style="margin-bottom:12px">.*?<select id="crShiftSelect".*?</select>.*?</div>\s*</div>\s*</div>', html, re.DOTALL)
    if match:
        html = html[:match.start()] + new_part + html[match.end()-6:] # Keep the last </div>
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("Replaced dropdown using regex")
    else:
        print("Regex also failed")


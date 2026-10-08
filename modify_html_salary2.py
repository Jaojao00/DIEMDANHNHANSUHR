import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the reg-header
old_header = r'<div id="empViewScheduleView" style="display: none">\s*<div class="reg-header">[\s\S]*?<div class="reg-body">\s*<div class="view-schedule-lookup">'

new_header = '''<div id="empViewScheduleView" style="display: none">
        <div class="reg-body" style="padding-top: 20px;">
          <!-- Thanh điều hướng Tra cứu -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
              <div style="font-weight:bold; color: #fff; display:flex; align-items:center; gap:10px;">
                  <div style="width:28px; height:28px; background: linear-gradient(135deg, var(--primary), #FF7B00); border-radius:8px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px;">🔍</div>
                  Tra Cứu
              </div>
              <div style="display:flex; gap: 24px; font-size: 0.95rem;">
                  <span style="color: var(--primary); cursor: pointer; font-weight: 600; border-bottom: 2px solid var(--primary); padding-bottom: 4px; transition: 0.3s;" id="tabNavSchedule" onclick="toggleLookupTab('schedule')">Lịch làm việc</span>
                  <span style="color: var(--text-secondary); cursor: pointer; font-weight: 500; padding-bottom: 4px; transition: 0.3s;" id="tabNavSalary" onclick="toggleLookupTab('salary')">Bảng lương</span>
              </div>
          </div>

          <!-- TAB LỊCH LÀM VIỆC -->
          <div id="tabContentSchedule">
            <div class="view-schedule-lookup">'''

content = re.sub(old_header, new_header, content)

# Replace the result area and insert salary tab
old_result_area = r'<div id="vsResultArea">[\s\S]*?</div>\s*</div>\s*</div>\s*</div>\s*<!-- Toast Notifications -->'

new_result_area = '''<div id="vsResultArea">
            <div class="vs-empty-state">
              <div class="vs-empty-icon">📝</div>
              <div>Nhập mã nhân viên để xem lịch đã có</div>
            </div>
          </div>
          </div> <!-- End Tab Schedule -->

          <!-- TAB TRA CỨU LƯƠNG -->
          <div id="tabContentSalary" style="display:none;">
            <div class="view-schedule-lookup">
              <div class="reg-section-title" style="margin-bottom:15px; color:#fff;">💰 Tra cứu lương</div>
              <div class="form-group" style="margin-bottom: 12px">
                <label for="salaryEmpId">Mã Nhân Viên / CCCD</label>
                <div class="input-wrapper">
                  <input
                    type="text"
                    id="salaryEmpId"
                    placeholder="VD: OPS12345 hoặc CCCD..."
                    autocomplete="off"
                    autocapitalize="none"
                  />
                </div>
              </div>
              <button
                class="reg-submit-btn"
                id="salaryLookupBtn"
                onclick="window.lookupSalary()"
                style="margin-bottom: 0"
              >
                🔍 Tra cứu lương
              </button>
            </div>
            
            <div id="salaryResultArea" style="margin-top:20px;">
              <div class="vs-empty-state">
                <div class="vs-empty-icon">💵</div>
                <div>Nhập mã nhân viên hoặc CCCD để tra cứu lương</div>
              </div>
            </div>
          </div> <!-- End Tab Salary -->

        </div>
      </div>

      <!-- Toast Notifications -->'''

content = re.sub(old_result_area, new_result_area, content)

# Add inline JS right before </body>
js_code = '''
<script>
window.toggleLookupTab = function(tab) {
    const tabSched = document.getElementById('tabContentSchedule');
    const tabSal = document.getElementById('tabContentSalary');
    const navSched = document.getElementById('tabNavSchedule');
    const navSal = document.getElementById('tabNavSalary');
    
    if (tab === 'schedule') {
        tabSched.style.display = 'block';
        tabSal.style.display = 'none';
        navSched.style.color = 'var(--primary)';
        navSched.style.fontWeight = '600';
        navSched.style.borderBottom = '2px solid var(--primary)';
        navSal.style.color = 'var(--text-secondary)';
        navSal.style.fontWeight = '500';
        navSal.style.borderBottom = 'none';
    } else {
        tabSched.style.display = 'none';
        tabSal.style.display = 'block';
        navSal.style.color = 'var(--primary)';
        navSal.style.fontWeight = '600';
        navSal.style.borderBottom = '2px solid var(--primary)';
        navSched.style.color = 'var(--text-secondary)';
        navSched.style.fontWeight = '500';
        navSched.style.borderBottom = 'none';
    }
}
</script>
</body>'''
if '<script>window.toggleLookupTab' not in content:
    content = content.replace('</body>', js_code)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated index.html layout perfectly")

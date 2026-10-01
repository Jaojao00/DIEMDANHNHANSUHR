import re
with open('js/registration/regApp.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace openChangeRequestModal
new_open_modal = '''  openChangeRequestModal: () => {
    const modal = document.getElementById('regChangeRequest');
    const step1 = document.getElementById('regStep1');
    if (modal) modal.style.display = 'block';
    if (step1) step1.style.display = 'none';
  },'''
content = re.sub(r'openChangeRequestModal:\s*\(\)\s*=>\s*\{[\s\S]*?return;\n\s*\},', new_open_modal, content)

# Replace submitChangeRequest limits
old_submit_start = r'submitChangeRequest:\s*async\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(lastChangeReqTime\)\s*\{[\s\S]*?return;\n\s*\}\n\s*\}'

new_submit_start = '''submitChangeRequest: async () => {
    if (RegApp.isSubmittingChange) return;
    const empId = RegApp.crOriginalData.empId.toLowerCase();
    const phone = RegApp.crOriginalData.empPhone || '';

    const now = Date.now();
    const currentMonth = new Date().getMonth();

    let historyStr = localStorage.getItem(gr_req_history_);
    let history = historyStr ? JSON.parse(historyStr) : [];
    history = history.filter(ts => new Date(ts).getMonth() === currentMonth);

    if (history.length >= 4) {
        if (typeof Utils !== 'undefined') Utils.showGenericAlertModal('CẢNH CÁO', 'Bạn đã vượt quá giới hạn 4 lần thay đổi lịch trong tháng này. Nếu cố tình spam, hệ thống sẽ tự động khóa tài khoản và xóa toàn bộ lịch làm việc của bạn!', '⚠️');
        return;
    }

    if (history.length > 0) {
        const lastChangeReqTime = history[history.length - 1];
        const timeDiff = now - parseInt(lastChangeReqTime);
        if (timeDiff < 48 * 60 * 60 * 1000) {
            if (typeof Utils !== 'undefined') Utils.showToast('Bạn đã gửi yêu cầu thay đổi lịch gần đây. Vui lòng chờ 48h để gửi lại.', 'error');
            return;
        }
    }'''

content = re.sub(old_submit_start, new_submit_start, content)

# We also need to update the success callback to push to history
old_success = r'localStorage\.setItem\(gr_last_change_req_\$\{empId\},\s*Date\.now\(\)\);'
new_success = '''history.push(now);
        localStorage.setItem(gr_req_history_, JSON.stringify(history));'''
content = re.sub(old_success, new_success, content)

with open('js/registration/regApp.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated regApp.js")

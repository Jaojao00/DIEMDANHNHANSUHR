import re

with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Replace toggleDeleteBtn
old_toggle = '''  toggleDeleteBtn: () => {
    const checked = document.querySelectorAll('.reg-checkbox:checked').length;
    const btn = document.getElementById('btnDeleteSelectedReg');
    if (btn) {
      btn.style.display = checked > 0 ? 'inline-block' : 'none';
      btn.innerText = `Xóa đã chọn (${checked})`;
    }
  },'''

new_toggle = '''  toggleDeleteBtn: () => {
    const checkedBoxes = document.querySelectorAll('.reg-checkbox:checked');
    const checked = checkedBoxes.length;
    const btn = document.getElementById('btnDeleteSelectedReg');
    if (btn) {
      btn.style.display = checked > 0 ? 'inline-block' : 'none';
      btn.innerText = `Xóa đã chọn (${checked})`;
    }
    const copyBtn = document.getElementById('btnCopySelected');
    if (copyBtn) {
      copyBtn.style.display = checked > 0 ? 'flex' : 'none';
      const copyCount = document.getElementById('copySelectedCount');
      if (copyCount) copyCount.innerText = checked;
    }
  },'''

if old_toggle in js:
    js = js.replace(old_toggle, new_toggle)
    print("Replaced toggleDeleteBtn")
else:
    # Try regex if exact match fails
    pattern = re.compile(r'  toggleDeleteBtn: \(\) => \{.*?\n  \},', re.DOTALL)
    if pattern.search(js):
        js = pattern.sub(new_toggle, js)
        print("Replaced toggleDeleteBtn using regex")
    else:
        print("Could not find toggleDeleteBtn")

# 2. Add Event Listener
event_listener_code = '''
document.addEventListener('DOMContentLoaded', () => {
  const btnCopySelected = document.getElementById('btnCopySelected');
  if (btnCopySelected) {
    btnCopySelected.addEventListener('click', () => {
      const checkedBoxes = document.querySelectorAll('.reg-checkbox:checked');
      if (checkedBoxes.length === 0) return;
      
      let copyText = "";
      checkedBoxes.forEach(cb => {
        const tr = cb.closest('tr');
        if (tr) {
          const maNV = tr.cells[2] ? tr.cells[2].innerText.trim() : "";
          const hoTen = tr.cells[3] ? tr.cells[3].innerText.trim() : "";
          copyText += maNV + "\\t" + hoTen + "\\n";
        }
      });
      
      navigator.clipboard.writeText(copyText).then(() => {
        Utils.showToast(`Đã copy ${checkedBoxes.length} nhân viên vào bộ nhớ tạm!`, 'success');
      }).catch(err => {
        Utils.showToast('Lỗi khi copy: ' + err, 'error');
      });
    });
  }
});
'''

js += "\n" + event_listener_code

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Added event listener to app.js")

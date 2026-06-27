import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace openChangeRequestModal
old_open = """  openChangeRequestModal: () => {
    alert('Chức năng này đang phát triển, vui lòng chờ');
  },"""

new_open = """  openChangeRequestModal: () => {
    document.getElementById('regStep1').style.display = 'none';
    document.getElementById('regChangeRequest').style.display = 'block';
    
    // Đặt mặc định ca đang chọn là CA_NGAY
    const firstCard = document.querySelector('.cr-shift-cards .reg-shift-card');
    if (firstCard) {
      RegApp.selectCRShift('CA_NGAY', firstCard);
    }
  },"""

content = content.replace(old_open, new_open)

# Replace submitChangeRequest
# Use regex to replace the entire submitChangeRequest block
pattern = r'(submitChangeRequest:\s*async\s*\(\)\s*=>\s*\{)(.*?)(^\s*\})'

new_submit = """  submitChangeRequest: async () => {
    const btn = document.getElementById('crSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Đang gửi yêu cầu...';
    
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) throw new Error('Lỗi kết nối máy chủ!');
      
      const payload = {
        action: 'submit_change_request',
        empId: RegApp.crOriginalData.empId,
        empName: RegApp.crOriginalData.empName,
        empPhone: RegApp.crOriginalData.empPhone,
        shiftId: RegApp.crOriginalData.shiftId,
        shiftLabel: RegApp.crOriginalData.shiftLabel,
        period: RegApp.crOriginalData.period,
        oldSelections: RegApp.crOriginalData.selections,
        selections: RegApp.crCurrentSelections
      };
      
      const res = await fetch(API_LINK, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        alert('Hệ thống đã gửi yêu cầu thay đổi lịch thành công! Vui lòng chờ Admin xác nhận.');
        RegApp.closeChangeRequestModal();
      } else {
        throw new Error(data.error || 'Lỗi không xác định từ máy chủ');
      }
    } catch(e) {
      console.error(e);
      alert('Lỗi: ' + e.message);
    } finally {
      btn.textContent = 'Gửi yêu cầu thay đổi';
    }
  }"""

content = re.sub(r'submitChangeRequest:\s*async\s*\(\)\s*=>\s*\{.*?\n  \}', new_submit, content, flags=re.DOTALL)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated registration.js")

import re

with open('employee.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace submit logic to validate reason
old_submit = '''        if (reqType === 'Đổi Áo') {
          role = document.getElementById('itemReqRole').value;
          quantity = document.getElementById('itemReqQuantity').value;
          pickupDate = document.getElementById('itemReqDate').value;
          price = document.getElementById('itemReqPrice').value;
          if (!role || !quantity || !pickupDate) {
             if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng điền đầy đủ thông tin áo', 'error');
             return;
          }
        } else if (reqType === 'Dư về') {
          pickupDate = document.getElementById('itemReqDate').value;
          price = document.getElementById('itemReqPrice').value;
          if (!pickupDate) {
             if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng chọn ngày dư về', 'error');
             return;
          }
        }

        const submitBtn = document.getElementById('itemReqSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Đang gửi...';

        try {
          const payload = {
            action: 'request_item',
            type: reqType,
            empId: empId,
            name: name,
            shift: shift,
            role: role,
            quantity: quantity,
            pickupDate: pickupDate,
            price: price
          };'''

new_submit = '''        const reasonEl = document.getElementById('itemReqReason');
        const reason = reasonEl ? reasonEl.value : '';
        
        if ((reqType === 'Đổi Áo' || reqType === 'Đổi Thẻ') && !reason) {
          if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng chọn lý do', 'error');
          return;
        }

        if (reqType === 'Đổi Áo') {
          role = document.getElementById('itemReqRole').value;
          quantity = document.getElementById('itemReqQuantity').value;
          pickupDate = document.getElementById('itemReqDate').value;
          price = document.getElementById('itemReqPrice').value;
          if (!role || !quantity || !pickupDate) {
             if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng điền đầy đủ thông tin áo', 'error');
             return;
          }
        } else if (reqType === 'Dư về') {
          pickupDate = document.getElementById('itemReqDate').value;
          price = document.getElementById('itemReqPrice').value;
          if (!pickupDate) {
             if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng chọn ngày dư về', 'error');
             return;
          }
        }

        const submitBtn = document.getElementById('itemReqSubmitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Đang gửi...';

        try {
          const payload = {
            action: 'request_item',
            type: reqType,
            empId: empId,
            name: name,
            shift: shift,
            role: role,
            quantity: quantity,
            pickupDate: pickupDate,
            price: price,
            reason: reason
          };'''

content = content.replace(old_submit, new_submit)

with open('employee.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated submit logic in employee.js")

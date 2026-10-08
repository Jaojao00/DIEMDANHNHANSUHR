import re

with open('employee.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = '''        try {
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
          };

          let urlToUse = State.apiLink || (typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : '');
          console.log('Sending request to:', urlToUse, 'Payload:', payload);
          const response = await fetch(urlToUse, {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          const resData = await response.json();

          if (resData.success || !resData.error) {
            if (typeof Utils !== 'undefined') Utils.showGenericSuccessModal('Thành công', 'Yêu cầu cấp đổi của bạn đã được ghi nhận!', '👍');
            if (modal) modal.classList.add('hidden');
            form.reset();
          } else {
             if (typeof Utils !== 'undefined') Utils.showToast(resData.error || 'Lỗi gửi yêu cầu', 'error');
          }
        } catch (e) {
          console.error(e);
          if (typeof Utils !== 'undefined') Utils.showToast('Không thể kết nối đến máy chủ.', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Gửi Yêu Cầu';
        }'''

new_logic = '''        try {
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
          };

          let urlToUse = State.apiLink || (typeof CONFIG !== 'undefined' ? CONFIG.APPS_SCRIPT_URL : '');
          
          // Chạy ngầm API để không làm treo giao diện
          fetch(urlToUse, {
            method: 'POST',
            body: JSON.stringify(payload)
          }).catch(e => console.error(e));

          // Báo thành công lập tức (Optimistic UI)
          if (typeof Utils !== 'undefined') Utils.showGenericSuccessModal('Thành công', 'Yêu cầu của bạn đã được ghi nhận!', '👍');
          if (modal) modal.classList.add('hidden');
          form.reset();
          
        } catch (e) {
          console.error(e);
          if (typeof Utils !== 'undefined') Utils.showToast('Đã có lỗi xảy ra', 'error');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = 'Gửi Yêu Cầu';
        }'''

content = content.replace(old_logic, new_logic)

with open('employee.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated employee.js to use optimistic fire-and-forget UI")

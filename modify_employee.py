import re

with open('employee.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace toggleFields
old_toggle = '''  toggleFields: () => {
    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const shirtFields = document.getElementById('itemReqShirtFields');
    if (shirtFields) {
      if (reqType === 'Đổi Áo') {
        shirtFields.style.display = 'block';
        document.getElementById('itemReqRole').required = true;
        document.getElementById('itemReqQuantity').required = true;
        document.getElementById('itemReqDate').required = true;
      } else {
        shirtFields.style.display = 'none';
        document.getElementById('itemReqRole').required = false;
        document.getElementById('itemReqQuantity').required = false;
        document.getElementById('itemReqDate').required = false;
      }
    }
    ItemRequestModule.calculatePrice();
  },'''

new_toggle = '''  toggleFields: () => {
    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const shirtFields = document.getElementById('itemReqShirtFields');
    const dateLabel = document.getElementById('itemReqDateLabel');
    if (shirtFields) {
      if (reqType === 'Đổi Áo') {
        shirtFields.style.display = 'block';
        document.getElementById('itemReqRole').required = true;
        document.getElementById('itemReqQuantity').required = true;
        document.getElementById('itemReqDate').required = true;
        document.getElementById('itemReqRole').parentElement.style.display = 'block';
        document.getElementById('itemReqQuantity').parentElement.style.display = 'block';
        if(dateLabel) dateLabel.innerHTML = 'Ngày Lấy <span class="required-star">*</span>';
      } else if (reqType === 'Dư về') {
        shirtFields.style.display = 'block';
        document.getElementById('itemReqRole').required = false;
        document.getElementById('itemReqQuantity').required = false;
        document.getElementById('itemReqDate').required = true;
        
        document.getElementById('itemReqRole').parentElement.style.display = 'none';
        document.getElementById('itemReqQuantity').parentElement.style.display = 'none';
        if(dateLabel) dateLabel.innerHTML = 'Ngày Dư Về <span class="required-star">*</span>';
      } else {
        shirtFields.style.display = 'none';
        document.getElementById('itemReqRole').required = false;
        document.getElementById('itemReqQuantity').required = false;
        document.getElementById('itemReqDate').required = false;
      }
    }
    ItemRequestModule.calculatePrice();
  },'''
content = content.replace(old_toggle, new_toggle)

# Replace calculatePrice
old_calc = '''  calculatePrice: () => {
    const role = document.getElementById('itemReqRole').value;
    const quantity = parseInt(document.getElementById('itemReqQuantity').value) || 1;
    const priceEl = document.getElementById('itemReqPrice');
    
    if (role === 'OS') {
      priceEl.value = (30000 * quantity).toLocaleString('vi-VN') + ' đ';
    } else if (role === 'BPO') {
      priceEl.value = (40000 * quantity).toLocaleString('vi-VN') + ' đ';
    } else if (role === 'S-BPO') {
      priceEl.value = 'C&B truy thu';
    } else {
      priceEl.value = '0 đ';
    }
  }'''
  
new_calc = '''  calculatePrice: () => {
    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const role = document.getElementById('itemReqRole').value;
    const quantity = parseInt(document.getElementById('itemReqQuantity').value) || 1;
    const priceEl = document.getElementById('itemReqPrice');
    
    if (reqType === 'Dư về') {
      priceEl.value = '30.000 đ';
    } else if (reqType === 'Đổi Áo') {
      if (role === 'OS') {
        priceEl.value = (30000 * quantity).toLocaleString('vi-VN') + ' đ';
      } else if (role === 'BPO') {
        priceEl.value = (40000 * quantity).toLocaleString('vi-VN') + ' đ';
      } else if (role === 'S-BPO') {
        priceEl.value = 'C&B truy thu';
      } else {
        priceEl.value = '0 đ';
      }
    } else {
      priceEl.value = '0 đ';
    }
  }'''
content = content.replace(old_calc, new_calc)

# Replace submit logic
old_submit_logic = '''        if (reqType === 'Đổi Áo') {
          role = document.getElementById('itemReqRole').value;
          quantity = document.getElementById('itemReqQuantity').value;
          pickupDate = document.getElementById('itemReqDate').value;
          price = document.getElementById('itemReqPrice').value;
          if (!role || !quantity || !pickupDate) {
             if (typeof Utils !== 'undefined') Utils.showToast('Vui lòng điền đầy đủ thông tin áo', 'error');
             return;
          }
        }'''
        
new_submit_logic = '''        if (reqType === 'Đổi Áo') {
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
        }'''
content = content.replace(old_submit_logic, new_submit_logic)

with open('employee.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated employee.js for Dư về")

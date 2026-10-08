import re

with open('employee.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_toggle = '''  toggleFields: () => {
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

new_toggle = '''  toggleFields: () => {
    let reqType = 'Đổi Áo';
    const typeRadios = document.getElementsByName('itemReqType');
    for (const radio of typeRadios) {
      if (radio.checked) reqType = radio.value;
    }

    const shirtFields = document.getElementById('itemReqShirtFields');
    const dateLabel = document.getElementById('itemReqDateLabel');
    
    const reasonGroup = document.getElementById('itemReqReasonGroup');
    const reasonSelect = document.getElementById('itemReqReason');
    
    if (reasonGroup && reasonSelect) {
      if (reqType === 'Đổi Áo') {
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
        reasonSelect.innerHTML = '<option value="">-- Chọn Lý Do --</option><option value="Áo cũ rách">Áo cũ rách</option><option value="Mất áo do sự cố">Mất áo do sự cố</option><option value="Mua thêm áo">Mua thêm áo</option>';
      } else if (reqType === 'Đổi Thẻ') {
        reasonGroup.style.display = 'block';
        reasonSelect.required = true;
        reasonSelect.innerHTML = '<option value="">-- Chọn Lý Do --</option><option value="Mất thẻ">Mất thẻ</option><option value="Hư thẻ">Hư thẻ</option><option value="Cũ muốn cấp mới">Cũ muốn cấp mới</option><option value="Lý do khác">Lý do khác</option>';
      } else {
        reasonGroup.style.display = 'none';
        reasonSelect.required = false;
        reasonSelect.innerHTML = '';
      }
    }

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

with open('employee.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated toggleFields in employee.js")

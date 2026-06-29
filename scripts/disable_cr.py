import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_block = '''  openChangeRequestModal: () => {
    document.getElementById('regStep1').style.display = 'none';
    document.getElementById('regChangeRequest').style.display = 'block';
    document.getElementById('crResultArea').style.display = 'none';
    document.getElementById('crEmpId').value = '';
    // Reset shift selection to CA_NGAY by default
    const defaultCard = document.querySelector('.cr-shift-cards .reg-shift-card[data-shift="CA_NGAY"]');
    if (defaultCard) RegApp.selectCRShift('CA_NGAY', defaultCard);
  },'''

new_block = '''  openChangeRequestModal: () => {
    alert('Chức năng này đang phát triển, vui lòng chờ');
  },'''

# Try exact replace first
if old_block in js:
    js = js.replace(old_block, new_block)
else:
    # Use regex
    js = re.sub(r'openChangeRequestModal:\s*\(\)\s*=>\s*{[^}]+},', new_block, js)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Disabled openChangeRequestModal successfully.")

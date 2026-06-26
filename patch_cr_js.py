import os

with open('registration.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add selectCRShift method to RegApp
# Let's insert it before openChangeRequestModal
new_method = '''  crSelectedShift: 'CA_NGAY',
  crSelectedShiftName: 'CA NGÀY',
  selectCRShift: (shiftId, element) => {
    RegApp.crSelectedShift = shiftId;
    RegApp.crSelectedShiftName = element.getAttribute('data-name') || shiftId;
    
    // Reset all cards in the change request modal
    const cards = document.querySelectorAll('.cr-shift-cards .reg-shift-card');
    cards.forEach(c => {
      c.classList.remove('selected');
      c.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      const checkmark = c.querySelector('.checkmark');
      if (checkmark) checkmark.style.display = 'none';
      const arrow = c.querySelector('.arrow-icon');
      if (arrow) arrow.style.display = 'block';
    });
    
    // Select the clicked card
    element.classList.add('selected');
    element.style.borderColor = 'var(--primary)';
    const checkmark = element.querySelector('.checkmark');
    if (checkmark) checkmark.style.display = 'block';
    const arrow = element.querySelector('.arrow-icon');
    if (arrow) arrow.style.display = 'none';
  },
'''

if 'selectCRShift:' not in js:
    js = js.replace('openChangeRequestModal:', new_method + '\n  openChangeRequestModal:')

# Update searchChangeRequest to use RegApp.crSelectedShift
old_search_logic1 = "const shiftId = document.getElementById('crShiftSelect').value;"
new_search_logic1 = "const shiftId = RegApp.crSelectedShift;"

old_search_logic2 = "document.getElementById('crShiftName').textContent = document.getElementById('crShiftSelect').options[document.getElementById('crShiftSelect').selectedIndex].text;"
new_search_logic2 = "document.getElementById('crShiftName').textContent = RegApp.crSelectedShiftName;"

js = js.replace(old_search_logic1, new_search_logic1)
js = js.replace(old_search_logic2, new_search_logic2)

# Fix openChangeRequestModal to reset to CA_NGAY default state
old_open_modal = "document.getElementById('crEmpId').value = '';"
new_open_modal = '''document.getElementById('crEmpId').value = '';
    // Reset shift selection to CA_NGAY by default
    const defaultCard = document.querySelector('.cr-shift-cards .reg-shift-card[data-shift="CA_NGAY"]');
    if (defaultCard) RegApp.selectCRShift('CA_NGAY', defaultCard);'''

js = js.replace(old_open_modal, new_open_modal)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Patched registration.js for the new CR shift UI")

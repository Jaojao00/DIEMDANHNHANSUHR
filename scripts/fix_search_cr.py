import os

with open('registration.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix the infinite recursion in selectCRShift
# The bug is that selectCRShift contains openChangeRequestModal logic!
# I will use a regex to replace the entire selectCRShift block with a clean version.

import re

# Find the selectCRShift function block
match = re.search(r'selectCRShift:\s*\([^)]*\)\s*=>\s*{.*?(?=openChangeRequestModal:)', js, re.DOTALL)
if match:
    old_select_cr = match.group(0)
    
    clean_select_cr = '''selectCRShift: (shiftId, element) => {
    RegApp.crSelectedShift = shiftId;
    RegApp.crSelectedShiftName = element.getAttribute('data-name') || shiftId;
    
    const cards = document.querySelectorAll('.cr-shift-cards .reg-shift-card');
    cards.forEach(c => {
      c.classList.remove('selected');
      c.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      const checkmark = c.querySelector('.checkmark');
      if (checkmark) checkmark.style.display = 'none';
      const arrow = c.querySelector('.arrow-icon');
      if (arrow) arrow.style.display = 'block';
    });
    
    element.classList.add('selected');
    element.style.borderColor = 'var(--primary)';
    const checkmark = element.querySelector('.checkmark');
    if (checkmark) checkmark.style.display = 'block';
    const arrow = element.querySelector('.arrow-icon');
    if (arrow) arrow.style.display = 'none';
  },
  
  '''
    js = js.replace(old_select_cr, clean_select_cr)

# 2. Rewrite searchChangeRequest to use the API correctly
search_cr_match = re.search(r'searchChangeRequest:\s*async\s*\(\)\s*=>\s*{.*?(?=renderChangeTable:)', js, re.DOTALL)
if search_cr_match:
    old_search_cr = search_cr_match.group(0)
    
    new_search_cr = '''searchChangeRequest: async () => {
    const empId = document.getElementById('crEmpId').value.trim().toLowerCase();
    const shiftId = RegApp.crSelectedShift;
    if (!empId) return alert('Vui lòng nhập Mã nhân viên!');
    
    try {
      const API_LINK = localStorage.getItem('agr_api_link') || (typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '');
      if (!API_LINK) return alert('Lỗi kết nối máy chủ!');

      // Fetch the schedule for the selected shift to get the user's registrations
      document.getElementById('crResultArea').style.display = 'none';
      const res = await fetch(`${API_LINK}?action=load&shiftId=${shiftId}`);
      const dataArr = await res.json();
      
      if (!dataArr || dataArr.length === 0 || dataArr.error) {
        return alert(dataArr.error || 'Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
      }
      
      const empData = dataArr.find(r => (r.id || '').toLowerCase() === empId);
      if (!empData) {
        return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
      }
      
      // Build crCurrentSelections from positions array
      RegApp.crCurrentSelections = [];
      if (empData.positions && Array.isArray(empData.positions) && RegApp.dates) {
        empData.positions.forEach((pos, idx) => {
          if (pos && pos.trim() !== "" && RegApp.dates[idx]) {
            RegApp.crCurrentSelections.push({
              id: RegApp.dates[idx].id,
              label: RegApp.dates[idx].label,
              value: pos
            });
          }
        });
      }
      
      RegApp.crOriginalData = {
        empId: empData.id,
        empName: empData.name,
        shiftId: shiftId,
        selections: JSON.parse(JSON.stringify(RegApp.crCurrentSelections))
      };
      RegApp.crFirebaseId = null; // No longer using Firebase
      
      document.getElementById('crEmpName').textContent = (empData.name || '').toUpperCase();
      document.getElementById('crShiftName').textContent = RegApp.crSelectedShiftName;
      
      RegApp.renderChangeTable();
      document.getElementById('crResultArea').style.display = 'block';
      
      // Now check if they already have a pending request
      const resReq = await fetch(API_LINK, { method: 'POST', body: JSON.stringify({ action: 'get_change_requests' }) });
      const reqData = await resReq.json();
      
      if (reqData && reqData.data) {
        const pendingForEmp = reqData.data.filter(r => r.empId.toLowerCase() === empId.toLowerCase());
        if (pendingForEmp.length > 0) {
          const matchedReq = pendingForEmp.find(r => r.shiftId === shiftId);
          if (matchedReq) {
            RegApp.crFirebaseId = matchedReq.id; // Store reqId here
            // Update selections from pending request
            if (matchedReq.selections) {
              RegApp.crCurrentSelections = JSON.parse(JSON.stringify(matchedReq.selections));
            }
            alert('Bạn đang có một yêu cầu sửa lịch CHƯA ĐƯỢC DUYỆT cho ca này. Bạn có thể tiếp tục chỉnh sửa và gửi lại.');
            RegApp.renderChangeTable();
          }
        }
      }
      
    } catch (e) {
      console.error(e);
      alert('Lỗi tra cứu: ' + e.message);
    }
  },
  
  '''
    js = js.replace(old_search_cr, new_search_cr)

with open('registration.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("registration.js patched successfully.")

import os
import re

with open('registration.js', 'r', encoding='utf-8') as f:
    js = f.read()

# I need to replace the searchChangeRequest body
# Let's find searchChangeRequest again
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

      document.getElementById('crResultArea').style.display = 'none';
      
      // Sử dụng get_registration giống như phần Xem lịch (ViewScheduleApp)
      const res = await fetch(`${API_LINK}?action=get_registration&empId=${encodeURIComponent(empId)}`);
      const dataArr = await res.json();
      
      if (!dataArr || dataArr.length === 0 || dataArr.error) {
        return alert(dataArr.error || 'Không tìm thấy dữ liệu đăng ký của bạn trên hệ thống!');
      }
      
      // Lọc ra đúng ca mà người dùng đang chọn (CA_NGAY gồm nhiều ca con)
      let targetShiftIds = [];
      if (shiftId === 'CA_NGAY') {
        targetShiftIds = ['06:00-15:00', '06:00-10:00', '15:00-22:00', 'CA_NGAY'];
      } else {
        targetShiftIds = [shiftId];
      }
      
      const empData = dataArr.find(r => targetShiftIds.includes(r.shiftId));
      if (!empData) {
        return alert('Không tìm thấy dữ liệu đăng ký của bạn cho ca này trên hệ thống!');
      }
      
      // Build crCurrentSelections từ mảng selections của backend (WORK, OFF, v.v.)
      RegApp.crCurrentSelections = [];
      if (empData.selections && Array.isArray(empData.selections) && RegApp.dates) {
        empData.selections.forEach(sel => {
          if (sel.choice && sel.choice !== "OFF" && sel.choice.trim() !== "") {
            const matchedDate = RegApp.dates.find(d => d.label === sel.label || d.id === sel.label.substring(0, 10));
            if (matchedDate) {
              RegApp.crCurrentSelections.push({
                id: matchedDate.id,
                label: matchedDate.label,
                value: sel.choice
              });
            } else {
              // Fallback nếu không khớp được RegApp.dates
              RegApp.crCurrentSelections.push({
                id: sel.label.substring(0, 10),
                label: sel.label,
                value: sel.choice
              });
            }
          }
        });
      }
      
      RegApp.crOriginalData = {
        empId: empData.empId,
        empName: empData.empName,
        shiftId: empData.shiftId,
        shiftLabel: empData.shiftLabel,
        selections: JSON.parse(JSON.stringify(RegApp.crCurrentSelections))
      };
      RegApp.crFirebaseId = null;
      
      document.getElementById('crEmpName').textContent = (empData.empName || '').toUpperCase();
      document.getElementById('crShiftName').textContent = empData.shiftLabel || RegApp.crSelectedShiftName;
      
      RegApp.renderChangeTable();
      document.getElementById('crResultArea').style.display = 'block';
      
      // Check pending requests
      const resReq = await fetch(API_LINK, { method: 'POST', body: JSON.stringify({ action: 'get_change_requests' }) });
      const reqData = await resReq.json();
      
      if (reqData && reqData.data) {
        const pendingForEmp = reqData.data.filter(r => r.empId.toLowerCase() === empId.toLowerCase());
        if (pendingForEmp.length > 0) {
          const matchedReq = pendingForEmp.find(r => targetShiftIds.includes(r.shiftId));
          if (matchedReq) {
            RegApp.crFirebaseId = matchedReq.id; // Store reqId
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
else:
    print("Failed to find searchChangeRequest block.")

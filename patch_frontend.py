import os
import re

file_path = "registration.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

frontend_logic = """
  ,
  crOriginalData: null,
  crCurrentSelections: [],
  crFirebaseId: null,

  openChangeRequestModal: () => {
    document.getElementById('regStep1').style.display = 'none';
    document.getElementById('regChangeRequest').style.display = 'block';
    document.getElementById('crResultArea').style.display = 'none';
    document.getElementById('crEmpId').value = '';
  },

  closeChangeRequestModal: () => {
    document.getElementById('regChangeRequest').style.display = 'none';
    document.getElementById('regStep1').style.display = 'block';
  },

  searchChangeRequest: async () => {
    const empId = document.getElementById('crEmpId').value.trim().toLowerCase();
    const shiftId = document.getElementById('crShiftSelect').value;
    if (!empId) return alert('Vui lòng nhập Mã nhân viên!');
    
    try {
      const db = window.FirebaseDB?.db;
      if (!db) return alert('Lỗi kết nối CSDL.');
      const { collection, query, where, getDocs } = window.FirebaseDB;
      const q = query(collection(db, "registrations"), where("empId", "==", empId), where("shiftId", "==", shiftId));
      const qSnap = await getDocs(q);
      
      if (qSnap.empty) {
        return alert('Không tìm thấy dữ liệu đăng ký cũ của bạn cho ca này trên hệ thống!');
      }
      
      const docs = qSnap.docs.map(d => Object.assign({ id: d.id }, d.data()));
      docs.sort((a,b) => b.timestamp - a.timestamp);
      const data = docs[0];
      
      RegApp.crOriginalData = data;
      RegApp.crFirebaseId = data.id;
      RegApp.crCurrentSelections = JSON.parse(JSON.stringify(data.selections || []));
      
      document.getElementById('crEmpName').textContent = (data.empName || '').toUpperCase();
      document.getElementById('crShiftName').textContent = document.getElementById('crShiftSelect').options[document.getElementById('crShiftSelect').selectedIndex].text;
      
      RegApp.renderChangeTable();
      document.getElementById('crResultArea').style.display = 'block';
      const btn = document.getElementById('crSubmitBtn');
      btn.disabled = true;
      btn.style.background = 'var(--text-muted)';
      btn.style.cursor = 'not-allowed';
      
    } catch(e) {
      console.error(e);
      alert('Đã xảy ra lỗi khi tra cứu.');
    }
  },

  renderChangeTable: () => {
    const thead = document.getElementById('crTable').querySelector('thead');
    const tbody = document.getElementById('crTableBody');
    
    let isCaNgay = RegApp.crOriginalData.shiftId === "CA_NGAY";
    
    if (isCaNgay) {
      thead.innerHTML = `
        <tr>
          <th>Ngày</th>
          <th style="color:#43e97b; min-width:80px">Ca OS Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-15:00</small></th>
          <th style="color:#4facf7; min-width:80px">Ca Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-10:00</small></th>
          <th style="color:#ffb347; min-width:80px">Ca Chiều<br><small style="font-weight:normal;opacity:0.8">15:00-22:00</small></th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr>
          <th>Ngày</th>
          <th style="color:var(--primary); min-width:80px">Đăng Ký Làm</th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
    }
    
    let html = '';
    RegApp.crCurrentSelections.forEach((sel, index) => {
      html += '<tr><td>' + sel.label + '</td>';
      if (isCaNgay) {
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="06:00-15:00" ' + (sel.choice === '06:00-15:00' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="06:00-10:00" ' + (sel.choice === '06:00-10:00' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="15:00-22:00" ' + (sel.choice === '15:00-22:00' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="OFF" ' + (sel.choice === 'OFF' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
      } else {
        const valShift = RegApp.crOriginalData.shiftId;
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="' + valShift + '" ' + (sel.choice === valShift ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
        html += '<td><label class="reg-radio"><input type="radio" name="cr_choice_' + index + '" value="OFF" ' + (sel.choice === 'OFF' ? 'checked' : '') + ' onchange="RegApp.crChangeSelection(' + index + ', this.value)"><span></span></label></td>';
      }
      html += '</tr>';
    });
    tbody.innerHTML = html;
  },

  crChangeSelection: (index, value) => {
    RegApp.crCurrentSelections[index].choice = value;
    RegApp.checkChangeDiff();
  },

  checkChangeDiff: () => {
    let isDiff = false;
    const orig = RegApp.crOriginalData.selections || [];
    for(let i=0; i<RegApp.crCurrentSelections.length; i++) {
      if (!orig[i] || RegApp.crCurrentSelections[i].choice !== orig[i].choice) {
        isDiff = true; break;
      }
    }
    const btn = document.getElementById('crSubmitBtn');
    if (isDiff) {
      btn.disabled = false;
      btn.style.background = 'var(--primary)';
      btn.style.cursor = 'pointer';
    } else {
      btn.disabled = true;
      btn.style.background = 'var(--text-muted)';
      btn.style.cursor = 'not-allowed';
    }
  },

  submitChangeRequest: async () => {
    const btn = document.getElementById('crSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'Đang gửi yêu cầu...';
    
    try {
      const db = window.FirebaseDB?.db;
      if (!db) throw new Error('Không thể kết nối CSDL');
      const { collection, addDoc, serverTimestamp } = window.FirebaseDB;
      
      const payload = {
        empId: RegApp.crOriginalData.empId,
        empName: RegApp.crOriginalData.empName,
        empPhone: RegApp.crOriginalData.empPhone,
        shiftId: RegApp.crOriginalData.shiftId,
        shiftLabel: RegApp.crOriginalData.shiftLabel,
        period: RegApp.crOriginalData.period,
        oldSelections: RegApp.crOriginalData.selections,
        selections: RegApp.crCurrentSelections,
        status: 'pending',
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        targetRegId: RegApp.crFirebaseId
      };
      
      await addDoc(collection(db, "change_requests"), payload);
      
      alert('Bạn đã gửi yêu cầu sửa lịch thành công, vui lòng chụp lại màn hình và gửi cho Admin. Hãy chờ Admin xét duyệt nhé!');
      RegApp.closeChangeRequestModal();
    } catch(e) {
      console.error(e);
      alert('Lỗi: ' + e.message);
    } finally {
      btn.textContent = 'Gửi yêu cầu thay đổi';
    }
  }
};
"""

if "openChangeRequestModal:" not in content:
    # Find the last occurrence of '};'
    pos = content.rfind('};')
    if pos != -1:
        content = content[:pos] + frontend_logic + content[pos+2:]
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Injected RegApp methods into registration.js")
    else:
        print("Error: Could not find };")
else:
    print("Already exists.")

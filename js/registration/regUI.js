// js/registration/regUI.js
/**
 * UI Rendering logic using Template Literals
 */

const RegUI = {
  renderShiftList(shifts, onShiftSelectStr) {
    if (!shifts || shifts.length === 0) return '';
    
    return shifts.map(shift => `
      <div class="reg-shift-card" onclick="${onShiftSelectStr}('${shift.id}')">
        <div class="rsc-icon" style="background:${shift.color}22; color:${shift.color};">
          ${shift.icon}
        </div>
        <div class="rsc-info">
          <div class="rsc-name">${shift.label}</div>
          <div class="rsc-time" style="color:${shift.color}; background:${shift.color}1A; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px; font-weight: bold; border: 1px solid ${shift.color}33;">
            ${shift.displayTime || shift.id}
          </div>
        </div>
        <div class="rsc-arrow">→</div>
      </div>
    `).join('');
  },

  renderDateTable(dates, selectedShift) {
    if (!dates || dates.length === 0) {
      return {
        thead: '',
        tbody: '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">Admin chưa cấu hình ngày đăng ký. Vui lòng liên hệ quản lý.</td></tr>'
      };
    }

    let theadHtml = '';
    let tbodyHtml = '';

    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (selectedShift.id === 'CA_NGAY') {
      theadHtml = `
        <tr>
          <th>Ngày</th>
          <th style="color:#43e97b; min-width:80px">Ca OS Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-15:00</small></th>
          <th style="color:#4facf7; min-width:80px">Ca Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-10:00</small></th>
          <th style="color:#ffb347; min-width:80px">Ca Chiều<br><small style="font-weight:normal;opacity:0.8">15:00-22:00</small></th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
      tbodyHtml = dates.map((d, i) => {
        const isPast = d.iso < todayISO;
        if (isPast) {
          return `<tr style="display:none">
            <td>${d.label}</td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="OFF" data-date="${d.iso}" checked></td>
          </tr>`;
        }
        return `
          <tr>
            <td>${d.label}</td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="06:00-15:00" data-date="${d.iso}"></td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="06:00-10:00" data-date="${d.iso}"></td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="15:00-22:00" data-date="${d.iso}"></td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="OFF" data-date="${d.iso}"></td>
          </tr>
        `;
      }).join('');
    } else {
      theadHtml = `
        <tr>
          <th>Ngày</th>
          <th id="regColShift">Ca làm việc</th>
          <th>OFF (Không đăng ký)</th>
        </tr>
      `;
      tbodyHtml = dates.map((d, i) => {
        const isPast = d.iso < todayISO;
        if (isPast) {
          return `<tr style="display:none">
            <td>${d.label}</td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="OFF" data-date="${d.iso}" checked></td>
          </tr>`;
        }
        return `
          <tr>
            <td>${d.label}</td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="WORK" data-date="${d.iso}"></td>
            <td><input type="radio" class="reg-radio" name="regDay_${i}" value="OFF"  data-date="${d.iso}"></td>
          </tr>
        `;
      }).join('');
    }

    return { thead: theadHtml, tbody: tbodyHtml };
  },

  renderChangeTable(originalData, currentSelections, onChangeFnStr) {
    let isCaNgay = originalData.shiftId === "CA_NGAY";
    
    let theadHtml = '';
    if (isCaNgay) {
      theadHtml = `
        <tr>
          <th>Ngày</th>
          <th style="color:#43e97b; min-width:80px">Ca OS Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-15:00</small></th>
          <th style="color:#4facf7; min-width:80px">Ca Sáng<br><small style="font-weight:normal;opacity:0.8">06:00-10:00</small></th>
          <th style="color:#ffb347; min-width:80px">Ca Chiều<br><small style="font-weight:normal;opacity:0.8">15:00-22:00</small></th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
    } else {
      theadHtml = `
        <tr>
          <th>Ngày</th>
          <th style="color:var(--primary); min-width:80px">Đăng Ký Làm</th>
          <th style="color:#ff4b4b; min-width:80px">OFF<br><small style="font-weight:normal;opacity:0.8">(Không đăng ký)</small></th>
        </tr>
      `;
    }
    
    let tbodyHtml = currentSelections.map((sel, index) => {
      let row = `<tr><td>${sel.label}</td>`;
      if (isCaNgay) {
        row += `
          <td><label class="reg-radio"><input type="radio" name="cr_choice_${index}" value="06:00-15:00" ${sel.choice === '06:00-15:00' ? 'checked' : ''} onchange="${onChangeFnStr}(${index}, this.value)"><span></span></label></td>
          <td><label class="reg-radio"><input type="radio" name="cr_choice_${index}" value="06:00-10:00" ${sel.choice === '06:00-10:00' ? 'checked' : ''} onchange="${onChangeFnStr}(${index}, this.value)"><span></span></label></td>
          <td><label class="reg-radio"><input type="radio" name="cr_choice_${index}" value="15:00-22:00" ${sel.choice === '15:00-22:00' ? 'checked' : ''} onchange="${onChangeFnStr}(${index}, this.value)"><span></span></label></td>
          <td><label class="reg-radio"><input type="radio" name="cr_choice_${index}" value="OFF" ${sel.choice === 'OFF' ? 'checked' : ''} onchange="${onChangeFnStr}(${index}, this.value)"><span></span></label></td>
        `;
      } else {
        const valShift = originalData.shiftId;
        row += `
          <td><label class="reg-radio"><input type="radio" name="cr_choice_${index}" value="${valShift}" ${sel.choice === valShift ? 'checked' : ''} onchange="${onChangeFnStr}(${index}, this.value)"><span></span></label></td>
          <td><label class="reg-radio"><input type="radio" name="cr_choice_${index}" value="OFF" ${sel.choice === 'OFF' ? 'checked' : ''} onchange="${onChangeFnStr}(${index}, this.value)"><span></span></label></td>
        `;
      }
      row += '</tr>';
      return row;
    }).join('');

    return { thead: theadHtml, tbody: tbodyHtml };
  },

  renderViewScheduleTable(allRegs, shiftsData) {
    if (!allRegs || allRegs.length === 0) return '';
    
    return allRegs.map(reg => {
      const shiftObj = shiftsData ? (shiftsData.find(s => s.id === reg.shiftId) || {}) : {};
      
      let html = `
        <div class="view-schedule-result">
          <div class="vsr-header">
            <div class="vsr-name">${shiftObj.icon || '📅'} ${reg.shiftLabel || reg.shiftId}</div>
            <div class="vsr-meta">${reg.shiftId} &nbsp;|&nbsp; ${reg.empName || reg.empId}</div>
          </div>
          <table class="vsr-table">
      `;

      html += (reg.selections || []).map(sel => {
        const isOff = sel.choice === 'OFF';
        return `
          <tr>
            <td class="vsr-date">${sel.label}</td>
            <td class="vsr-shift ${isOff ? 'off' : 'working'}">
              ${isOff ? '— OFF' : (reg.shiftLabel || reg.shiftId)}
            </td>
          </tr>
        `;
      }).join('');
      
      html += `
          </table>
          <div style="margin-top:12px;font-size:12px;color:var(--text-muted)">
            Cập nhật: ${new Date(reg.timestamp || Date.now()).toLocaleString('vi-VN')}
          </div>
        </div>
      `;
      return html;
    }).join('');
  }
};

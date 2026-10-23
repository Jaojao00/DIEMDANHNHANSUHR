// CÁC HÀM TIỆN ÍCH HỆ THỐNG AGARI HR (UTILS)
const Utils = {
    /**
   * Chuẩn hóa thông minh Mã OPS:
   * - Viết thường hay viết hoa đều được: ops, Ops, OPS, oPs, ...
   * - Tự động sửa lỗi phổ biến gõ nhầm số 0 thành chữ O: 0ps, 0PS, 0Ps -> OPS
   * - Tự động sửa lỗi bộ gõ tiếng Việt Telex: oóp, óps, óp, ôps, oop -> OPS
   * - Tự động loại bỏ khoảng trắng thừa: "ops 248693" -> "OPS248693"
   * - Chuẩn hóa tất cả về chữ in hoa: 'OPS' + [4-6 chữ số]
   */
  normalizeOpsId(id) {
    if (!id) return '';
    let s = String(id).trim().replace(/\s+/g, '');
    // Sửa số 0 ở đầu nếu là 0ps / 0PS thành OPS
    s = s.replace(/^0[pP][sS]/i, 'OPS');
    // Sửa lỗi Telex nếu có: OÓP, ÓPS, ÓP, ÔPS, OÔP, OOP -> OPS
    s = s.replace(/^(OÓP|ÓPS|ÓP|ÔPS|OÔP|OOP)/i, 'OPS');
    return s.toUpperCase();
  },

  /**
   * Kiểm tra định dạng Mã OPS hợp lệ:
   * - Không phân biệt chữ thường hay hoa: ops, Ops, OPS, oPs,... đều được chấp nhận
   * - Chấp nhận cả số 0 nếu gõ nhầm thay cho chữ O: 0ps, 0PS,...
   * - Phía sau bắt buộc là 4 đến 6 chữ số
   * Ví dụ hợp lệ: OPS170621, Ops170621, ops170621, 0PS248693, 0ps248693, ops1234
   */
  isValidOpsId(id) {
    if (!id || typeof id !== 'string') return false;
    const s = this.normalizeOpsId(id);
    return /^OPS\d{4,6}$/.test(s);
  },

  /**
   * Trả về thông báo lỗi chi tiết định dạng HTML khi Mã OPS không hợp lệ
   */
  getOpsIdErrorMessage(id) {
    if (!id || !String(id).trim()) {
      return `
        <div class="text-left text-xs sm:text-sm space-y-2">
          <p>Vui lòng điền <strong>Mã OPS</strong> của bạn để tiếp tục.</p>
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <strong>Quy định:</strong> Chữ <code>Ops</code> (viết thường hay hoa đều được: ops, Ops, OPS) kèm <strong>4 đến 6 chữ số</strong>.<br>
            Ví dụ đúng: <span class="font-mono text-emerald-700 font-bold">OPS170621</span> hoặc <span class="font-mono text-emerald-700 font-bold">Ops170621</span>
          </div>
        </div>
      `;
    }

    const clean = String(id).trim();
    const normalized = this.normalizeOpsId(clean);

    // 1. Chỉ toàn chữ số (như 264973)
    if (/^\d{4,6}$/.test(clean)) {
      return `
        <div class="text-left text-xs sm:text-sm space-y-2">
          <p class="text-red-600 font-bold">❌ Mã bạn nhập "${clean}" bị THIẾU chữ "OPS" ở đầu!</p>
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
            Hệ thống không chấp nhận mã chỉ có số.<br>
            👉 Vui lòng thêm chữ Ops vào đầu (thường hay hoa đều được):<br>
            <span class="font-mono font-bold text-emerald-700 text-sm">OPS${clean}</span> hoặc <span class="font-mono font-bold text-emerald-700 text-sm">Ops${clean}</span>
          </div>
        </div>
      `;
    }

    if (/^\d+$/.test(clean)) {
      return `
        <div class="text-left text-xs sm:text-sm space-y-2">
          <p class="text-red-600 font-bold">❌ Mã bạn nhập "${clean}" chỉ có số và sai độ dài!</p>
          <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
            👉 Quy định chuẩn: Bắt buộc có chữ <code>Ops</code> (viết thường hay hoa đều được) kèm <strong>4 đến 6 số</strong> phía sau (Ví dụ: <strong>OPS170621</strong> hoặc <strong>Ops170621</strong>).
          </div>
        </div>
      `;
    }

    // 2. Có chữ OPS nhưng phần số bị sai số lượng
    if (/^OPS/i.test(normalized)) {
      const numbers = normalized.slice(3);
      if (!/^\d+$/.test(numbers)) {
        return `
          <div class="text-left text-xs sm:text-sm space-y-2">
            <p class="text-red-600 font-bold">❌ Phần sau chữ Ops phải là các chữ số!</p>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
              Bạn đang nhập: "<strong>${clean}</strong>".<br>
              👉 Vui lòng chỉ nhập số sau chữ Ops (Ví dụ: <strong>OPS170621</strong> hoặc <strong>Ops170621</strong>).
            </div>
          </div>
        `;
      }
      if (numbers.length < 4 || numbers.length > 6) {
        return `
          <div class="text-left text-xs sm:text-sm space-y-2">
            <p class="text-red-600 font-bold">❌ Số lượng chữ số không hợp lệ (Hiện tại có ${numbers.length} số)!</p>
            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
              Quy định: Sau chữ Ops phải có từ <strong>4 đến 6 chữ số</strong>.<br>
              👉 Ví dụ đúng: <span class="font-mono font-bold text-emerald-700">OPS170621</span> (6 số) hoặc <span class="font-mono font-bold text-emerald-700">Ops1234</span> (4 số).
            </div>
          </div>
        `;
      }
    }

    // 3. Lỗi khác
    return `
      <div class="text-left text-xs sm:text-sm space-y-2">
        <p class="text-red-600 font-bold">❌ Mã OPS "${clean}" không đúng định dạng!</p>
        <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
          Định dạng hợp lệ gồm chữ <code>Ops</code> (viết thường hay hoa đều được: ops, Ops, OPS) kèm <strong>4 đến 6 số</strong> phía sau.<br>
          👉 Ví dụ đúng: <span class="font-mono font-bold text-emerald-700">OPS170621</span> hoặc <span class="font-mono text-emerald-700">Ops170621</span>
        </div>
      </div>
    `;
  },

  /**
   * Gắn trình kiểm tra và chuẩn hóa realtime cho input Mã OPS
   */
  bindOpsInputValidation(inputEl, helperEl = null) {
    if (!inputEl) return;
    
    // Khi gõ: nếu đã hợp lệ thì gỡ viền đỏ
    inputEl.addEventListener('input', () => {
      let val = inputEl.value;
      if (inputEl.classList.contains('border-red-500')) {
        if (Utils.isValidOpsId(val)) {
          inputEl.classList.remove('border-red-500', 'bg-red-50');
          if (helperEl) helperEl.innerHTML = '';
        }
      }
    });

    // Khi người dùng click ra ngoài (blur): tự động chuẩn hóa và cập nhật giá trị vào ô nhập
    inputEl.addEventListener('blur', () => {
      let val = (inputEl.value || '').trim();
      if (!val) {
        inputEl.classList.remove('border-red-500', 'bg-red-50');
        if (helperEl) helperEl.innerHTML = '';
        return;
      }

      if (Utils.isValidOpsId(val)) {
        const norm = Utils.normalizeOpsId(val);
        inputEl.value = norm;
        inputEl.classList.remove('border-red-500', 'bg-red-50');
        if (helperEl) {
          helperEl.innerHTML = `<span class="text-emerald-600 font-semibold text-[11px]">✓ Mã hợp lệ: ${norm}</span>`;
        }
      } else {
        inputEl.classList.add('border-red-500', 'bg-red-50');
        if (helperEl) {
          helperEl.innerHTML = `<span class="text-red-500 font-semibold text-[11px]">⚠️ Sai định dạng! Bắt buộc: Ops (thường/hoa) + 4-6 số (VD: OPS170621 hoặc Ops170621)</span>`;
        }
      }
    });
  },
  /**
   * Chuẩn hóa CCCD / Mã nhân viên
   * Xử lý trường hợp CCCD 12 số bị mất số 0 đầu trên Excel thành 11 số (Nguyên tắc 8)
   */
  sanitizeId(input) {
    if (!input) return '';
    let cleaned = String(input).trim().toUpperCase();
    // Bỏ các ký tự đặc biệt không mong muốn
    cleaned = cleaned.replace(/[^A-Z0-9]/g, '');
    return cleaned;
  },

  /**
   * So khớp 2 mã CCCD/Mã NV thông minh
   * So sánh tương thích nếu 1 bên 11 số và 1 bên 12 số (do mất số 0 đầu)
   */
  isIdMatch(idA, idB) {
    const a = this.sanitizeId(idA);
    const b = this.sanitizeId(idB);
    if (!a || !b) return false;
    if (a === b) return true;
    
    // Kiểm tra CCCD 11 số vs 12 số (bị mất số 0 ở đầu)
    if (/^\d{11}$/.test(a) && /^\d{12}$/.test(b) && '0' + a === b) return true;
    if (/^\d{12}$/.test(a) && /^\d{11}$/.test(b) && a === '0' + b) return true;
    
    return false;
  },

  /**
   * Định dạng tiền tệ VNĐ chuẩn
   */
  formatCurrency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(num);
  },

  /**
   * Lấy thời gian hiện tại chuẩn múi giờ Asia/Ho_Chi_Minh
   */
  getCurrentVNTime() {
    return new Date().toLocaleString('vi-VN', {
      timeZone: CONFIG.TIMEZONE || 'Asia/Ho_Chi_Minh',
      hour12: false
    });
  },

  /**
   * Lấy thời gian hiện tại theo Date object chuẩn múi giờ Asia/Ho_Chi_Minh
   */
  getVNNow() {
    try {
      const vnStr = new Date().toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE || 'Asia/Ho_Chi_Minh' });
      return new Date(vnStr);
    } catch (e) {
      return new Date();
    }
  },

  /**
   * Lấy số phút trôi qua từ 00:00 trong ngày theo giờ Việt Nam (0 - 1439)
   */
  getVNMinutesInDay() {
    const vnDate = this.getVNNow();
    return vnDate.getHours() * 60 + vnDate.getMinutes();
  },

  /**
   * Format Date object thành chuỗi DD/MM/YYYY
   */
  formatDateVN(dateObj = new Date()) {
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },

  /**
   * Format Date object thành YYYY-MM-DD (dùng cho input date)
   */
  formatDateISO(dateObj = new Date()) {
    const d = new Date(dateObj);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  },

  /**
   * Nén ảnh qua Canvas HTML5 xuống dưới 500KB và chuyển thành Base64
   */
  async compressImage(file, maxSizeKB = 500, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Không có tệp ảnh'));
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Giới hạn chiều rộng tối đa 1280px để giữ nét mà nhẹ
          const MAX_DIM = 1280;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Nén với chất lượng quality
          let base64 = canvas.toDataURL('image/jpeg', quality);
          
          // Tính dung lượng ước tính
          let sizeKB = Math.round((base64.length * 3) / 4 / 1024);
          if (sizeKB > maxSizeKB && quality > 0.4) {
            // Giảm tiếp chất lượng nếu vẫn > maxSizeKB
            resolve(Utils.compressImage(file, maxSizeKB, quality - 0.2));
          } else {
            resolve({
              base64: base64,
              sizeKB: sizeKB,
              width: width,
              height: height
            });
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  },

  /**
   * SweetAlert2 Toast Thông báo nhanh
   */
  toast(message, icon = 'success') {
    if (typeof Swal !== 'undefined') {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });
      Toast.fire({
        icon: icon,
        title: message
      });
    } else {
      console.log(`[TOAST - ${icon}] ${message}`);
    }
  },

  /**
   * SweetAlert2 Alert hộp thoại
   */
  showAlert(title, text, icon = 'info') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: title,
        html: text,
        icon: icon,
        confirmButtonColor: '#D90012',
        confirmButtonText: 'Đã hiểu'
      });
    } else {
      alert(`${title}: ${text}`);
      return Promise.resolve();
    }
  },

  /**
   * SweetAlert2 Confirm
   */
  confirm(title, text, confirmText = 'Đồng ý', cancelText = 'Hủy') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({
        title: title,
        html: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#D90012',
        cancelButtonColor: '#64748B',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText
      });
    } else {
      const result = confirm(`${title}\n${text}`);
      return Promise.resolve({ isConfirmed: result });
    }
  },

  /**
   * SweetAlert2 Loading
   */
  showLoading(title = 'Đang xử lý...') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: title,
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    }
  },

  hideLoading() {
    if (typeof Swal !== 'undefined') {
      Swal.close();
    }
  },

  /**
   * Xuất mảng đối tượng ra CSV kèm BOM UTF-8 (\uFEFF) mở Excel không lỗi font tiếng Việt
   */
  exportToCsv(filename, rows) {
    if (!rows || !rows.length) {
      this.toast('Không có dữ liệu để xuất file', 'warning');
      return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      '\uFEFF' + // BOM Unicode để Excel hiển thị đúng tiếng Việt
      keys.join(separator) +
      '\n' +
      rows
        .map((row) => {
          return keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : String(row[k]);
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator);
        })
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Utils = Utils;
}

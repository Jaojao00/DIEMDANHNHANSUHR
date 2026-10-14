// CÁC HÀM TIỆN ÍCH HỆ THỐNG AGARI HR (UTILS)
const Utils = {
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
      timeZone: CONFIG.TIMEZONE,
      hour12: false
    });
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

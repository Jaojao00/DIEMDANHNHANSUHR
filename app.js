/**
 * AGR - Hệ Thống Điểm Danh v3.0
 * app.js - Xử lý logic nghiệp vụ toàn cục và bootstrap app
 */

// Sửa hàm escapeHTML để chỉ xử lý null/undefined
window.escapeHTML = function (str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Gộp các DOMContentLoaded handlers và cải tiến repair / clipboard / utils checks
document.addEventListener("DOMContentLoaded", () => {
  // Khởi tạo các module nếu tồn tại
  if (typeof EmployeeApp !== 'undefined') EmployeeApp.init();
  if (typeof AdminApp !== 'undefined') AdminApp.init();
  if (typeof EmpNav !== 'undefined') EmpNav.init();

  // Global âm thanh khi click nút (chỉ khi Utils.playClickSound tồn tại)
  document.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest(".nav-item") || e.target.closest(".shift-tab")) {
      if (window.Utils && typeof window.Utils.playClickSound === "function") {
        window.Utils.playClickSound();
      }
    }
  });

  // Khởi tạo ngày lịch main view (xử lý cả input và non-input)
  const mainDateInput = document.getElementById("mainScheduleDateInput");
  if (mainDateInput) {
    const savedDate = localStorage.getItem("agr_schedule_date");
    const setDateText = (text) => {
      if ("value" in mainDateInput) mainDateInput.value = text;
      else mainDateInput.textContent = text;
    };
    if (savedDate) {
      const parts = savedDate.split("-");
      setDateText(parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : savedDate);
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setDateText(`${dd}/${mm}/${yyyy}`);
    }
  }

  // Repair button: chỉ xoá key có tiền tố 'agr_' để tránh mất dữ liệu khác
    const repairBtn = document.getElementById("repairBtn");
  if (repairBtn) {
    repairBtn.addEventListener("click", () => {
      const ua = navigator.userAgent || navigator.vendor || window.opera;
      const currentUrl = window.location.href;
      
      // If Android, try to open in Chrome via Intent
      if (/android/i.test(ua)) {
        const cleanUrl = currentUrl.replace(/^https?:\/\//, '');
        const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end;`;
        window.location.href = intentUrl;
        
        // Fallback
        setTimeout(() => {
          window.open(currentUrl, '_blank', 'noopener,noreferrer');
        }, 500);
      } else {
        // iOS or desktop
        window.open(currentUrl, '_blank', 'noopener,noreferrer');
      }
    });
  }

  // Copy selected: fallback cho navigator.clipboard
  const btnCopySelected = document.getElementById("btnCopySelected");
  if (btnCopySelected) {
    btnCopySelected.addEventListener("click", () => {
      const checkedBoxes = document.querySelectorAll(".reg-checkbox:checked");
      if (checkedBoxes.length === 0) return;

      let copyText = "";
      checkedBoxes.forEach((cb) => {
        const tr = cb.closest("tr");
        if (tr) {
          // Tham khảo: dùng data attributes hoặc class để lấy, có fallback sang cell index
          const colManv = tr.querySelector(".col-manv");
          const colHoten = tr.querySelector(".col-hotennv");
          
          let maNV = "";
          let hoTen = "";
          
          if (colManv && colHoten) {
            maNV = colManv.textContent.trim();
            hoTen = colHoten.textContent.trim();
          } else if (tr.cells.length >= 4) {
            maNV = tr.cells[2] ? tr.cells[2].innerText.trim() : "";
            hoTen = tr.cells[3] ? tr.cells[3].innerText.trim() : "";
          }
          
          copyText += maNV + "\t" + hoTen + "\n";
        }
      });

      const doToast = (msg, type) => {
        if (window.Utils && typeof window.Utils.showToast === "function") {
          window.Utils.showToast(msg, type);
        } else {
          alert(msg);
        }
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(copyText).then(
          () => doToast(`Đã copy ${checkedBoxes.length} nhân viên vào bộ nhớ tạm!`, "success"),
          (err) => doToast("Lỗi khi copy: " + err, "error")
        );
      } else {
        // Fallback: textarea + execCommand
        const ta = document.createElement("textarea");
        ta.value = copyText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          doToast(`Đã copy ${checkedBoxes.length} nhân viên vào bộ nhớ tạm!`, "success");
        } catch (err) {
          doToast("Lỗi khi copy: " + err, "error");
        }
        document.body.removeChild(ta);
      }
    });
  }
});

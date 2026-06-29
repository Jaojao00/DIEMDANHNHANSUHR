window.escapeHTML = function (str) {
  if (!str) return "";
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
/**
 * AGR - Hệ Thống Điểm Danh v3.0
 * app.js - Xử lý logic nghiệp vụ cho 2 luồng: Nhân viên (Mobile) và Admin (Desktop)
 */
// ==========================================
// KHỞI CHẠY (BOOTSTRAP)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  EmployeeApp.init();
  AdminApp.init();
  EmpNav.init();

  // Khởi tạo ngày lịch main view
  const mainDateInput = document.getElementById("mainScheduleDateInput");
  if (mainDateInput) {
    const savedDate = localStorage.getItem("agr_schedule_date");
    if (savedDate) {
      const parts = savedDate.split("-");
      if (parts.length === 3) {
        mainDateInput.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        mainDateInput.textContent = savedDate;
      }
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      mainDateInput.textContent = `${dd}/${mm}/${yyyy}`;
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const repairBtn = document.getElementById("repairBtn");
  if (repairBtn) {
    repairBtn.addEventListener("click", () => {
      if (
        confirm(
          "Bạn có chắc chắn muốn dọn dẹp bộ nhớ tạm (xóa cache) và tải lại trang để sửa lỗi? Mọi dữ liệu lưu nháp hoặc thao tác đang làm dở sẽ bị xóa.",
        )
      ) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload(true);
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btnCopySelected = document.getElementById("btnCopySelected");
  if (btnCopySelected) {
    btnCopySelected.addEventListener("click", () => {
      const checkedBoxes = document.querySelectorAll(".reg-checkbox:checked");
      if (checkedBoxes.length === 0) return;

      let copyText = "";
      checkedBoxes.forEach((cb) => {
        const tr = cb.closest("tr");
        if (tr) {
          const maNV = tr.cells[2] ? tr.cells[2].innerText.trim() : "";
          const hoTen = tr.cells[3] ? tr.cells[3].innerText.trim() : "";
          copyText += maNV + "\t" + hoTen + "\n";
        }
      });

      navigator.clipboard
        .writeText(copyText)
        .then(() => {
          Utils.showToast(
            `Đã copy ${checkedBoxes.length} nhân viên vào bộ nhớ tạm!`,
            "success",
          );
        })
        .catch((err) => {
          Utils.showToast("Lỗi khi copy: " + err, "error");
        });
    });
  }
});

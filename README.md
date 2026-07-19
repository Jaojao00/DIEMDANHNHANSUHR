<div align="center">
  <img src="https://img.shields.io/badge/AGR-Operations-blue?style=for-the-badge&logo=appveyor" alt="Logo">
  <h1 align="center">Hệ Thống Điểm Danh & Quản Lý Nhân Sự AGR</h1>

  <p align="center">
    <strong>Giải pháp quản lý lịch làm việc, điểm danh tự động và đăng ký ca thông minh.</strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/version-3.2.0-blue?style=flat-square" alt="version">
    <img src="https://img.shields.io/badge/platform-GitHub%20Pages-brightgreen?style=flat-square" alt="platform">
    <img src="https://img.shields.io/badge/backend-Google%20Apps%20Script-yellow?style=flat-square" alt="backend">
    <img src="https://img.shields.io/badge/database-Google%20Sheets-success?style=flat-square" alt="database">
    <img src="https://img.shields.io/badge/license-Private-red?style=flat-square" alt="license">
  </p>
</div>

---

## 📖 Mục Lục

- [🌟 Tổng Quan](#-tổng-quan)
- [✨ Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [🏗 Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [📁 Cấu Trúc Mã Nguồn](#-cấu-trúc-mã-nguồn)
- [🚀 Hướng Dẫn Triển Khai (Deploy)](#-hướng-dẫn-triển-khai-deploy)
- [🛡 Bảo Mật & Xác Thực](#-bảo-mật--xác-thực)
- [💡 Ghi Chú Phát Triển](#-ghi-chú-phát-triển)

---

## 🌟 Tổng Quan

**AGR Attendance System** là ứng dụng web toàn diện được thiết kế đặc biệt cho bộ phận Vận hành (Operations). Ứng dụng giúp số hóa hoàn toàn quy trình điểm danh, đăng ký lịch làm việc và quản lý nhân sự một cách nhanh chóng, chính xác. 

Hệ thống được chia làm **2 giao diện chính** để tối ưu hóa trải nghiệm người dùng:

| Phân hệ | Đối tượng | Nền tảng ưu tiên | Tính năng cốt lõi |
|---------|-----------|------------------|-------------------|
| 📱 **Employee UI** | Nhân viên | Mobile-first | Điểm danh, xin nghỉ/lên ca, đăng ký & tra cứu lịch |
| 💻 **Admin UI** | Quản trị viên | Desktop-first | Quản lý lịch ca tổng, duyệt yêu cầu, thêm nhân sự, dashboard realtime |

---

## ✨ Tính Năng Nổi Bật

### 👨‍💼 Dành Cho Nhân Viên (Employee)
- **⚡ Điểm Danh Nhanh:** Nhập Mã NV, Họ Tên, SĐT Zalo. Kiểm tra hợp lệ realtime.
- **📅 Đăng Ký Lịch Thông Minh:** Giao diện ma trận (Matrix UI) giúp chọn ca làm việc dễ dàng, trực quan.
- **🔍 Tra Cứu Trạng Thái:** Xem nhanh lịch đã đăng ký và vị trí làm việc.
- **📝 Gửi Yêu Cầu Nhanh:** Hỗ trợ gửi form xin Off hoặc xin lên ca với thao tác 1 chạm.
- **📋 Copy Hàng Loạt:** Sao chép danh sách mã NV để dán vào báo cáo Excel cực nhanh.

### 👑 Dành Cho Quản Trị Viên (Admin)
- **🔐 Quản Lý Đăng Nhập:** Bảo vệ dữ liệu bằng xác thực tài khoản an toàn.
- **📊 Bảng Điều Khiển (Dashboard):** Thống kê số lượng nhân sự, trạng thái điểm danh theo thời gian thực (Realtime).
- **⚙️ Quản Lý Linh Hoạt:** Thêm, sửa, cập nhật trạng thái nhân sự trực tiếp trên giao diện lưới (Grid).
- **🤖 Tự Động Hóa (Cron Jobs):** Đồng bộ dữ liệu ca làm việc, xử lý đơn xin nghỉ/lên ca vào lúc 00:00 hằng ngày thông qua Script tự động.
- **📈 Chế Độ Kế Hoạch (Plan vs Actual):** Theo dõi sát sao lượng nhân sự dự kiến so với thực tế để kịp thời điều phối.

---

## 🏗 Kiến Trúc Hệ Thống

Dự án sử dụng mô hình Serverless nhẹ nhàng nhưng hiệu quả cao, tiết kiệm chi phí vận hành:

```mermaid
graph TD;
    A[Giao diện Người dùng (GitHub Pages)] -->|HTTPS / Fetch API| B(Google Apps Script - Backend);
    B -->|Xử lý Data| C[(Google Sheets - Database)];
    C -->|Trigger tự động| D[Xử lý định kỳ 00:00];
    
    subgraph Frontend
    A1[Employee UI] -.-> A;
    A2[Admin UI] -.-> A;
    A3[Registration UI] -.-> A;
    end
```

---

## 📁 Cấu Trúc Mã Nguồn

```text
📦 DIEMDANHNHANSUHR
 ┣ 📂 js
 ┃ ┣ 📂 admin          # Logic phân hệ Quản trị viên (Giao diện, xử lý, API)
 ┃ ┣ 📂 registration   # Logic phân hệ Đăng ký & Tra cứu lịch
 ┃ ┗ 📂 ui             # Các component dùng chung (Modal, thông báo)
 ┣ 📂 backend
 ┃ ┗ 📜 handlers.js    # Mã nguồn Google Apps Script (doGet, doPost, Trigger)
 ┣ 📜 index.html       # Entry point duy nhất (Single Page App)
 ┣ 📜 style.css        # File giao diện chính (Dark mode chủ đạo)
 ┣ 📜 app.js           # File khởi chạy hệ thống (Bootstrapper)
 ┣ 📜 dataManager.js   # Quản lý State toàn cục & giao tiếp API
 ┣ 📜 employee.js      # Logic dành riêng cho giao diện điểm danh
 ┣ 📜 utils.js         # Các hàm tiện ích (Format thời gian, Toast, Error Handlers)
 ┣ 📜 config.js        # File cấu hình (API URL, Tùy chỉnh hằng số)
 ┣ 📜 README.md        # Tài liệu hướng dẫn (Bạn đang đọc nó)
 ┗ 📜 SECURITY.md      # Chính sách và quy định bảo mật
```

---

## 🚀 Hướng Dẫn Triển Khai (Deploy)

### 1. Triển khai Backend (Google Apps Script)
1. Tạo một file Google Sheets mới để làm cơ sở dữ liệu.
2. Trên thanh menu Sheets, chọn **Tiện ích mở rộng (Extensions) > Apps Script**.
3. Copy toàn bộ nội dung file `backend/handlers.js` (hoặc `google-apps-script.js`) dán vào Editor.
4. Chạy hàm `setupAutoTriggers()` một lần duy nhất để cài đặt các Cron Jobs tự động.
5. Nhấn **Deploy > New deployment**, chọn kiểu **Web App**.
6. Mục "Execute as", chọn **Me**. Mục "Who has access", chọn **Anyone**.
7. Lấy URL Web App được tạo ra ở bước cuối cùng.

### 2. Triển khai Frontend (GitHub Pages)
1. Mở file `config.js` trong thư mục gốc của dự án.
2. Cập nhật biến `CONFIG.API_URL` bằng đường dẫn Web App vừa lấy ở trên.
3. Commit và Push code lên GitHub.
4. Bật **GitHub Pages** từ nhánh `main`. Truy cập link để sử dụng ứng dụng.

---

## 🛡 Bảo Mật & Xác Thực

Hệ thống có nhiều cơ chế kiểm soát nhằm hạn chế thao tác sai lệch hoặc gian lận:

- **Định dạng Mã NV:** Phải khớp với khuôn dạng chuẩn (Ví dụ: `Ops` hoặc `OPS` kèm 5-6 chữ số).
- **Chống điểm danh trùng:** Hệ thống sẽ chặn nếu nhân viên cố gắng điểm danh nhiều lần trong cùng một ca.
- **Chặn theo khung giờ:** 
  - Khóa gửi yêu cầu xin nghỉ (Off) từ 18:00 đến 06:00 sáng hôm sau.
  - Phân quyền giới hạn thời gian mở/đóng ca điểm danh tự động.
- **Giới hạn yêu cầu (Rate Limiting):** Chặn các thao tác spam (ví dụ nhập sai thông tin liên tiếp).

> Xem thêm chi tiết tại [SECURITY.md](SECURITY.md)

---

<div align="center">
  <p>Được thiết kế và phát triển với ❤️ dành riêng cho đội ngũ Vận hành AGR.</p>
</div>

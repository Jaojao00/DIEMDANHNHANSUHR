# HỆ THỐNG ĐIỂM DANH & QUẢN TRỊ NHÂN SỰ AGARI HR (DIEMDANHNHANSUHR - v78)

> **Website chính thức:** [diemdanhnhansuhr.vercel.app](https://diemdanhnhansuhr.vercel.app/)  
> **Master Google Spreadsheet:** `1J4azfR-SJfl3fXLQfxN_vI3eOsn1miDPLyntJw0HVeI`  
> **Google Drive Khiếu Nại:** `18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu`  
> **Google Apps Script Web App Endpoint:** `https://script.google.com/macros/s/AKfycby5jNluqcVJKvOnzQTMMXifq4Xl8IG7_U40_bMA0-ZPa8A60usIhcFdK5gNGb75qC4/exec`

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

Hệ thống hoạt động theo mô hình **Đồng Bộ 3 Tầng (3-Tier Sync)** đảm bảo tốc độ cao, thời gian thực và không bao giờ bị nghẽn mạng:
1. **Tầng 1 - Firebase Firestore (Realtime Layer):** Cập nhật trạng thái điểm danh tức thì (<100ms) giữa các màn hình Admin và thiết bị quét.
2. **Tầng 2 - Google Sheets Master (Google Apps Script REST API):** Lưu trữ hồ sơ, quản lý bảng lương, đơn từ, booking SOC qua cơ chế `LockService` chống xung đột.
3. **Tầng 3 - LocalStorage & Service Worker (Offline-First):** Lưu trữ đệm ngoại tuyến, hỗ trợ PWA cài đặt trực tiếp lên màn hình chính.

---

## 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```
web điểm danh/
├── .clasp.json                  # Cấu hình Google Clasp trỏ vào ./backend
├── .gitignore                   # Danh sách loại trừ Git
├── vercel.json                  # Cấu hình Vercel deployment, SPA routing, headers
├── manifest.json                # PWA Web App Manifest
├── sw.js                        # Service Worker quản lý offline cache (hr-app-v78)
├── index.html                   # Single Page Application (Cổng Nhân Viên & Admin)
├── package.json                 # Scripts hỗ trợ Clasp, Serve, Vercel
├── DESIGN_SYSTEM.md             # Quy chuẩn thiết kế (Typography & Color Palette)
├── css/
│   └── style.css                # CSS tùy chỉnh, biến màu Agari, z-index rules
├── js/
│   ├── config.js                # URL Apps Script, Spreadsheet ID, danh sách ca
│   ├── utils.js                 # Chuẩn hóa CCCD 11/12 số, nén ảnh Canvas, SweetAlert2
│   ├── firebaseInit.js          # Khởi tạo Firestore listener
│   ├── dataManager.js           # Quản lý State tập trung và gọi API chuẩn
│   ├── employee.js              # Nghiệp vụ điểm danh một chạm & các modal nghiệp vụ
│   ├── app.js                   # Entry point, đồng hồ thời gian thực Asia/Ho_Chi_Minh
│   ├── admin/
│   │   ├── adminCore.js         # Quản lý phiên token Admin (agr_admin_token) 60 phút
│   │   ├── adminUI.js           # Bảng Roster, phân bổ vị trí xoay ca, live feed
│   │   ├── adminSalary.js       # Bảng lương Admin, lọc tháng, xuất CSV có BOM UTF-8
│   │   ├── adminBooking.js      # Điều phối Booking SOC South, copy format Zalo/Telegram
│   │   ├── adminRequests.js     # Duyệt đơn xin đổi lịch (Change Request CR_)
│   │   ├── adminRegistration.js # Quản lý đăng ký ca, cài đặt ngày mở/đóng cổng
│   │   └── adminManager.js      # Thao tác nâng cao: Thêm NV đột xuất, Off hàng loạt, Lưu lịch
│   └── registration/
│       ├── regAPI.js            # API client đăng ký ca
│       └── regApp.js            # Giao diện chọn lịch 15 ngày WORK/OFF
└── backend/
    ├── main.js                  # doGet() & doPost() router, verifyAdminToken()
    ├── handlers.js              # Bộ hàm nghiệp vụ xử lý Sheets & Google Drive
    ├── auth.js                  # Xác thực Admin token SHA-256
    ├── config.js                # Danh sách sheet, tài khoản admin, timezone
    ├── triggers.js              # Triggers theo giờ và onEdit audit logs
    └── utils.js                 # Tiện ích backend, sanitize ID, JSON response
```

---

## 3. CÁC TÍNH NĂNG CHÍNH

### A. Cổng Nhân Viên (Employee Portal)
- **Điểm Danh Một Chạm:** Quét CCCD / Mã OPS / SĐT, hiển thị thẻ vị trí đầu ca và các khung giờ xoay ca (`18H-20H`, `20H-22H`). Cảnh báo màu cam (`npw-icon`) nếu chưa có vị trí.
- **Xin Nghỉ / Xin Off:** Tiếp nhận đơn xin nghỉ, tự động ghi vào sheet `XIN_OFF`.
- **Xin Lên Ca (Thế Ca / Tăng Cường):** Đăng ký làm bù hoặc tăng ca đột xuất, tự động xếp vào danh sách chờ `A-OS` trạng thái `pending`.
- **Cấp Đổi Áo Thẻ & Dư Vé:** Đăng ký nhận đồng phục, thẻ nhân viên hoặc hoàn vé xe.
- **Phiếu Khiếu Nại Kèm Ảnh:** Tự động nén ảnh qua Canvas HTML5 dưới 500KB, gửi Base64 lưu trực tiếp vào Google Drive folder `18JlzPq70UtlMv0LijpvoftCiQ_qLkpgu`.
- **Tra Cứu Lương & KPI Cá Nhân:** Nhập CCCD để xem chi tiết từng ngày công, giờ vào/ra, tổng lương tạm tính và biểu đồ cột trực quan bằng `Chart.js`.
- **Đăng Ký Lịch Định Kỳ:** Tích chọn `WORK` hoặc `OFF` cho chu kỳ 15 ngày, tự động khóa trùng ca.
- **Yêu Cầu Sửa Lịch (Change Request):** Tạo mã định danh `CR_...` gửi lên hệ thống chờ Admin phê duyệt.

### B. Bảng Điều Khiển Quản Trị (Admin Dashboard)
- **Bảo Mật:** Đăng nhập phân quyền với email `tainguyenhr.dev@gmail.com` hoặc `ptbt472@gmail.com`. Phiên đăng nhập 60 phút lưu tại `localStorage` với key `agr_admin_token`.
- **Tab 1 - Vị Trí Làm Việc:** Thống kê tổng quan (Tổng NV, Đã điểm danh, Chưa điểm danh, Xin OFF), Live Activity Feed cập nhật theo giây, chỉnh sửa inline vị trí xoay ca và bấm "Lưu Lịch & Vị Trí", công cụ Thêm CTV đột xuất & Off hàng loạt.
- **Tab 2 - Lịch Làm Việc:** Quản lý danh sách đăng ký theo chu kỳ, duyệt hoặc từ chối các yêu cầu `CR_`, cấu hình ngày mở/đóng cổng, nút đồng bộ cưỡng bức Roster hôm nay.
- **Tab 3 - Booking SOC South:** Bộ lọc nâng cao theo ngày, ca và Total Request, tích chọn và copy nhanh báo cáo định dạng chuẩn gửi Zalo/Telegram.
- **Tab 4 - Bảng Lương:** Lọc theo tháng, tìm kiếm tức thì theo CCCD / Họ tên, thống kê tổng chi phí lương, nút xuất file Excel có gắn BOM Unicode (`\uFEFF`) không bao giờ bị lỗi font tiếng Việt.

---

## 4. HƯỚNG DẪN TRIỂN KHAI BẰNG GIT & VERCEL

### Bước 1: Khởi tạo và đẩy mã nguồn lên GitHub
```bash
# 1. Kiểm tra trạng thái Git
git status

# 2. Thêm toàn bộ mã nguồn
git add .

# 3. Tạo commit ban đầu
git commit -m "feat: rebuild Agari HR attendance and operations portal v78"

# 4. Đổi nhánh sang main
git branch -M main

# 5. Thêm remote repository GitHub
git remote add origin https://github.com/Jaojao00/DIEMDANHNHANSUHR.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

### Bước 2: Triển khai tự động lên Vercel
1. Truy cập [Vercel Dashboard](https://vercel.com/dashboard) và chọn **Add New Project**.
2. Chọn kho lưu trữ Git `DIEMDANHNHANSUHR` (hoặc kho Git cá nhân của bạn).
3. Tại phần **Build and Output Settings**:
   - Framework Preset: **Other**
   - Root Directory: `./` (Thư mục gốc)
   - Build Command: *(Để trống)*
   - Output Directory: `./` (Thư mục gốc)
4. Bấm **Deploy**. Vercel sẽ tự động cấp phát domain HTTPS (ví dụ: `diemdanhnhansuhr.vercel.app`) với mạng lưới CDN toàn cầu.
5. Mỗi khi bạn thực hiện `git push`, Vercel sẽ tự động build và cập nhật phiên bản mới nhất!

### Bước 3: Đồng bộ Backend Google Apps Script (Tùy chọn)
Nếu cần chỉnh sửa và đẩy trực tiếp mã nguồn trong thư mục `backend/` lên Google Apps Script:
```bash
# Đẩy code lên Google Apps Script
npx @google/clasp push
```

---

## 5. CÁC NGUYÊN TẮC BẤT KHẢ XÂM PHẠM (CRITICAL CONSTRAINTS)
1. **Chuẩn giao tiếp GAS:** Mọi request gửi lên Apps Script qua hàm `fetch()` bắt buộc dùng `Content-Type: "text/plain;charset=utf-8"` và `body: JSON.stringify({...})`.
2. **Token Admin:** Khóa lưu token trong `localStorage` luôn là `agr_admin_token`.
3. **Z-Index:** Mọi modal tự dựng phải để z-index tối đa `1050` để không che khuất popup SweetAlert2 (`1060`).
4. **Xử lý số CCCD:** Luôn dùng `.trim()`, `.toLowerCase()` và hỗ trợ đối chiếu thông minh trường hợp CCCD bị mất số `0` ở đầu (11 vs 12 số).

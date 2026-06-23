<p align="center">
  <strong style="font-size:32px">🏢 AGR</strong>
</p>

<h1 align="center">Hệ Thống Điểm Danh & Quản Lý Nhân Sự</h1>

<p align="center">
  <em>Web app quản lý lịch làm việc, điểm danh tự động và đăng ký ca — chạy trên <strong>GitHub Pages</strong>, backend <strong>Google Apps Script</strong> + <strong>Google Sheets</strong>.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.1.0-blue?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/platform-GitHub%20Pages-brightgreen?style=flat-square" alt="platform">
  <img src="https://img.shields.io/badge/backend-Google%20Apps%20Script-yellow?style=flat-square" alt="backend">
  <img src="https://img.shields.io/badge/license-Private-red?style=flat-square" alt="license">
</p>

---

## 📖 Mục Lục

- [Tổng Quan](#-tổng-quan)
- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Cấu Trúc File](#-cấu-trúc-file)
- [Tính Năng Chi Tiết](#-tính-năng-chi-tiết)
- [Hệ Thống Ca Làm Việc](#-hệ-thống-ca-làm-việc)
- [API Reference](#-api-reference)
- [Hướng Dẫn Deploy](#-hướng-dẫn-deploy)
- [Cấu Hình Google Sheets](#-cấu-hình-google-sheets)
- [Validation & Bảo Mật](#-validation--bảo-mật)
- [Xử Lý Sự Cố](#-xử-lý-sự-cố)

---

## 🌟 Tổng Quan

**AGR Attendance System** là hệ thống điểm danh và quản lý lịch làm việc dành cho nhân sự vận hành (Operations). Hệ thống chia làm **2 luồng chính**:

| Luồng | Đối tượng | Giao diện | Mô tả |
|-------|-----------|-----------|-------|
| **Employee View** | Nhân viên | Mobile-first | Điểm danh, xin nghỉ/lên ca, đăng ký lịch, xem lịch đã đăng ký |
| **Admin View** | Quản trị viên | Desktop | Quản lý lịch ca, theo dõi điểm danh realtime, cài đặt khung giờ, duyệt yêu cầu |

---

## 🏗 Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (GitHub Pages)                   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Employee UI  │  │   Admin UI   │  │ Registration UI   │  │
│  │  (Mobile)    │  │  (Desktop)   │  │   (Mobile)        │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │             │
│         └────────┬────────┴────────────────────┘             │
│                  │                                           │
│           ┌──────┴──────┐                                    │
│           │   config.js │  ← URL API, validation rules       │
│           └──────┬──────┘                                    │
└──────────────────┼──────────────────────────────────────────┘
                   │ HTTPS (fetch)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│              BACKEND (Google Apps Script)                     │
│                                                              │
│   doGet()                        doPost()                    │
│   ├─ action=load                 ├─ action=save              │
│   ├─ action=load_requests        ├─ action=checkin           │
│   ├─ action=get_registration     ├─ action=request           │
│   └─ action=get_shift_regs       ├─ action=submit_reg        │
│                                  ├─ action=admin_login       │
│                                  └─ action=reset_regs        │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Google Sheets (Database)                   │
│                                                              │
│   ┌────────────────┐  ┌────────────┐  ┌──────────────────┐   │
│   │ Ca_0600_1000   │  │  XIN_OFF   │  │ LỊCHT6_22:00-... │   │
│   │ Ca_0600_1500   │  │ (Yêu cầu) │  │ (Đăng ký lịch)   │   │
│   │ Ca_1500_2200   │  └────────────┘  └──────────────────┘   │
│   │ Ca_1800_2200   │                                         │
│   │ Ca_2200_0600   │                                         │
│   └────────────────┘                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu Trúc File

```
DIEMDANHNHANSUHR/
│
├── index.html               # Trang web chính
│                             #   ├─ Employee View (Mobile)
│                             #   ├─ Admin View (Desktop)
│                             #   ├─ Registration View
│                             #   └─ Modals & Bottom Navigation Bar
│
├── style.css                 # Giao diện Dark mode AGR
│                             #   ├─ CSS variables, typography (Inter + JetBrains Mono)
│                             #   └─ Responsive Mobile-first & Glassmorphism effects
│
├── app.js                    # Logic nghiệp vụ chính
│                             #   ├─ State, Utils, DataManager
│                             #   ├─ Quản lý bộ nhớ đệm (Cache)
│                             #   └─ Chặn điểm danh sai giờ (Khóa khung giờ)
│
├── registration.js           # Module đăng ký lịch & Tra cứu lịch
│
├── config.js                 # Cấu hình hệ thống (API URL, Regex)
│
└── google-apps-script.js     # Backend Google Apps Script (Auto-scheduler 00:00)
```

---

## ✨ Tính Năng Chi Tiết

### 👤 Nhân Viên (Employee View — Mobile)

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **Chọn ca làm việc** | Giao diện card hiển thị 5 ca, nhấn để vào điểm danh |
| 2 | **Điểm danh thủ công** | Nhập Mã NV + Họ tên + SĐT Zalo → Xác nhận |
| 3 | **Xem vị trí làm việc** | Sau khi điểm danh → hiển thị vị trí cố định, sau giờ nghỉ, 4h-6h |
| 4 | **Xin Nghỉ / Xin Off** | Gửi yêu cầu xin off với lý do |
| 5 | **Xin Lên Ca** | Đăng ký thêm ca, chọn ca mục tiêu (kèm tự động gán vào danh sách Ca mới) |
| 6 | **Đăng ký lịch** | Chọn ca → Chọn WORK/OFF cho từng ngày trong kỳ |
| 7 | **Xem lịch đã đăng ký** | Tra cứu bằng mã NV → hiển thị lịch tất cả ca |
| 8 | **Nút Xóa Cache Nhanh** | Nổi bật góc màn hình để refresh tức thì và sửa lỗi treo máy |

### 🔧 Quản Trị Viên (Admin View — Desktop)

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **Đăng nhập bảo mật** | Xác thực email + mật khẩu qua API |
| 2 | **Bảng lịch ca động** | Hiển thị danh sách NV theo từng ca, cột vị trí tùy biến |
| 3 | **Thống kê realtime** | Tổng NV / Đã điểm danh / Chưa điểm danh / Xin Off |
| 4 | **Đồng bộ Robot 00:00**| Tự động lên lịch, cập nhật trực tiếp dữ liệu "Xin Nghỉ/Xin Lên Ca" mỗi rạng sáng |
| 5 | **Tìm kiếm & Lọc** | Lọc theo mã NV, họ tên, trạng thái |
| 6 | **Chế độ Kế Hoạch (PLAN)**| Quản lý và theo dõi số lượng nhân sự dự kiến so với thực tế (ACTUAL) |

---

## 🛡 Validation & Bảo Mật

### Mã Nhân Viên
Format: `Ops` (hoặc `OPS`, `ops`) + **5-6 chữ số**
```
✅ Ops224190    ✅ OPS193039    ✅ ops143922
❌ Op224190     ❌ ABC123456
```

### Chống Gian Lận & Quy Trình

| Biện pháp | Mô tả |
|-----------|-------|
| **Chặn điểm danh trùng** | Mỗi NV chỉ được điểm danh 1 lần/ca |
| **Kiểm tra khung giờ** | Nhân viên chỉ được điểm danh đúng vào khung giờ đăng ký hoặc giờ chốt ca. (VD Ca Sáng điểm danh trước 19h ngày hôm trước hoặc sau 15h ra ca) |
| **Khóa xin off ban đêm** | Không cho gửi yêu cầu off từ 18:00 – 06:00 |
| **Rate limiting** | Tối đa 10 lần thử, khóa 5 phút khi vượt giới hạn |

> Chi tiết các chính sách an toàn, vui lòng xem tại file `SECURITY.md`.

---

## 🚀 Hướng Dẫn Deploy

### Cập nhật Google Apps Script Backend
1. Mở Google Sheet → **Extensions → Apps Script**
2. Dán nội dung file `google-apps-script.js` vào editor
3. Chạy hàm `setupAutoTriggers()` để cấu hình Robot tự động chạy điểm danh lúc 00:00 mỗi đêm.
4. Nhấn **Deploy → New deployment** dưới dạng Web App (Quyền "Anyone").
5. Copy URL dán vào file `config.js` trên Frontend.

---

<p align="center">
  <strong>AGR Attendance System v3.1.0</strong><br>
  <sub>Built with ❤️ for AGR Operations Team</sub>
</p>

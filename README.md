<p align="center">
  <strong style="font-size:32px">🏢 AGR</strong>
</p>

<h1 align="center">Hệ Thống Điểm Danh & Quản Lý Nhân Sự</h1>

<p align="center">
  <em>Web app quản lý lịch làm việc, điểm danh tự động và đăng ký ca — chạy trên <strong>GitHub Pages</strong>, backend <strong>Google Apps Script</strong> + <strong>Google Sheets</strong>.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-blue?style=flat-square" alt="version">
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
├── index.html               # Trang web chính (779 dòng)
│                             #   ├─ Employee View (Mobile) — 3 phase: Chọn ca → Điểm danh → Thành công
│                             #   ├─ Admin View (Desktop) — Bảng điều khiển + Theo dõi
│                             #   ├─ Registration View — Đăng ký lịch làm việc
│                             #   ├─ View Schedule — Tra cứu lịch đã đăng ký
│                             #   ├─ Modals: Login, Manager, Confirm, Settings, Request
│                             #   └─ Bottom Navigation Bar (3 tab)
│
├── style.css                 # Giao diện Dark mode AGR (48KB)
│                             #   ├─ Design system: CSS variables, typography (Inter + JetBrains Mono)
│                             #   ├─ Responsive: Mobile-first, breakpoints
│                             #   ├─ Components: Cards, Tables, Modals, Forms, Buttons
│                             #   └─ Animations: Toast, Checkmark, Transitions
│
├── app.js                    # Logic nghiệp vụ chính (1726 dòng)
│                             #   ├─ State — Quản lý trạng thái ứng dụng
│                             #   ├─ Utils — Tiện ích (format, toast, time window)
│                             #   ├─ DataManager — CRUD API layer (load/save/checkin/request)
│                             #   ├─ EmployeeApp — Giao diện nhân viên (chọn ca, form, success)
│                             #   └─ AdminApp — Giao diện admin (bảng, thống kê, quản lý lịch)
│
├── registration.js           # Module đăng ký lịch (311 dòng)
│                             #   ├─ EmpNav — Điều hướng Bottom Nav (3 tab)
│                             #   ├─ RegApp — Đăng ký lịch làm việc (chọn ca → chọn ngày → gửi)
│                             #   └─ ViewScheduleApp — Tra cứu lịch đã đăng ký
│
├── config.js                 # Cấu hình hệ thống
│                             #   ├─ APPS_SCRIPT_URL — Endpoint backend
│                             #   ├─ Validation rules (regex, min length)
│                             #   ├─ Camera & Scanning settings
│                             #   ├─ UI/UX timings (toast, refresh, cooldown)
│                             #   └─ Anti-fraud (max attempts, lockout)
│
├── google-apps-script.js     # Backend Google Apps Script v3 (567 dòng)
│                             #   ├─ doPost: save, checkin, request, submit_registration,
│                             #   │          reset_registrations, admin_login
│                             #   └─ doGet: load, load_requests, get_registration,
│                             #             get_shift_registrations
│
├── Code.gs                   # Backend Google Apps Script v1 (legacy, 311 dòng)
│                             #   ├─ doGet: getSchedule, getAttendance
│                             #   └─ doPost: recordAttendance
│
└── README.md                 # Tài liệu hướng dẫn (file này)
```

---

## ✨ Tính Năng Chi Tiết

### 👤 Nhân Viên (Employee View — Mobile)

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **Chọn ca làm việc** | Giao diện card hiển thị 5 ca, nhấn để vào điểm danh |
| 2 | **Điểm danh thủ công** | Nhập Mã NV + Họ tên + SĐT Zalo → Xác nhận |
| 3 | **Xem vị trí làm việc** | Sau khi điểm danh → hiển thị vị trí cố định, sau giờ nghỉ, 4h-6h |
| 4 | **Xin Nghỉ / Xin Off** | Gửi yêu cầu xin off với lý do (khóa 18:00-06:00) |
| 5 | **Xin Lên Ca** | Đăng ký thêm ca, chọn ca mục tiêu |
| 6 | **Đăng ký lịch** | Chọn ca → Chọn WORK/OFF cho từng ngày trong kỳ |
| 7 | **Xem lịch đã đăng ký** | Tra cứu bằng mã NV → hiển thị lịch tất cả ca |
| 8 | **Bottom Navigation** | 3 tab: Điểm danh / Đăng ký lịch / Xem lịch |

### 🔧 Quản Trị Viên (Admin View — Desktop)

| # | Tính năng | Mô tả |
|---|-----------|-------|
| 1 | **Đăng nhập bảo mật** | Xác thực email + mật khẩu qua API |
| 2 | **Bảng lịch ca động** | Hiển thị danh sách NV theo từng ca, cột vị trí tùy biến |
| 3 | **Thống kê realtime** | Tổng NV / Đã điểm danh / Chưa điểm danh / Xin Off |
| 4 | **Tab chuyển ca** | Chuyển nhanh giữa 5 ca làm việc |
| 5 | **Tìm kiếm & Lọc** | Lọc theo mã NV, họ tên, trạng thái (đã/chưa điểm danh, xin off, xin lên ca) |
| 6 | **Quản lý lịch** | Dán dữ liệu từ Google Sheets → Phân tích → Preview → Lưu |
| 7 | **Toggle Đã Chốt / Đăng Ký** | Chuyển giữa xem lịch đã chốt và danh sách đăng ký |
| 8 | **Cài đặt khung giờ** | Thiết lập thời gian cho phép điểm danh từng ca |
| 9 | **Cấu hình đăng ký lịch** | Thiết lập khoảng ngày cho phép NV đăng ký |
| 10 | **Lịch sử điểm danh** | Log realtime ai đã điểm danh, thời gian |
| 11 | **Progress bar** | Thanh tiến trình điểm danh tổng thể |

---

## 🕐 Hệ Thống Ca Làm Việc

| Ca | Thời gian | Icon | Cột vị trí | Khung giờ điểm danh mặc định |
|----|-----------|------|------------|-------------------------------|
| **Ca Sáng** | 06:00 – 10:00 | 🌅 | Vị Trí Đầu Ca, Vị Trí 2–5 | Theo cấu hình admin |
| **Ca OS Sáng** | 06:00 – 15:00 | 🌄 | 6h-7h (1)(2), 12h-13h (1)(2), 13h-15h | Theo cấu hình admin |
| **Ca Chiều** | 15:00 – 22:00 | ☀️ | 13h-15h → 21h-22h (7 cột) | Theo cấu hình admin |
| **Ca Tối** | 18:00 – 22:00 | 🌆 | Giống Ca Chiều (7 cột) | Theo cấu hình admin |
| **Ca Đêm** | 22:00 – 06:00 | 🌙 | Vị Trí Cố Định, Sau Giờ Nghỉ, 4h-6h, Xuất Tải | Theo cấu hình admin |

> **Lưu ý:** Mỗi ca có số lượng và tên cột vị trí riêng biệt, được cấu hình trong `State.shifts` (app.js). Admin có thể tùy chỉnh khung giờ cho phép điểm danh trong **⚙️ Cài Đặt**.

---

## 📡 API Reference

Backend sử dụng Google Apps Script Web App, giao tiếp qua REST API (GET/POST).

### GET Endpoints

| Action | Params | Mô tả |
|--------|--------|-------|
| `load` | `shiftId` | Tải lịch làm việc theo ca |
| `load_requests` | — | Tải danh sách yêu cầu xin off/lên ca |
| `get_registration` | `empId` | Tra cứu lịch đăng ký của 1 NV |
| `get_shift_registrations` | `shiftId` | Tải toàn bộ đăng ký của 1 ca |

### POST Endpoints

| Action | Payload | Mô tả |
|--------|---------|-------|
| `save` | `shiftId`, `headers`, `schedule[]` | Lưu lịch ca (Admin) |
| `checkin` | `shiftId`, `empId`, `phone` | Điểm danh nhân viên |
| `request` | `empId`, `name`, `phone`, `type`, `reason`, `date`, `note` | Gửi yêu cầu xin off/lên ca |
| `submit_registration` | `empId`, `empName`, `empPhone`, `shiftId`, `selections[]` | Đăng ký lịch làm việc |
| `admin_login` | `email`, `password` | Xác thực admin |
| `reset_registrations` | — | Xóa toàn bộ sheet đăng ký lịch cũ |

---

## 🚀 Hướng Dẫn Deploy

### Bước 1: Deploy Frontend lên GitHub Pages

1. Tạo repository trên GitHub (hoặc fork repo này)
2. Upload các file: `index.html`, `style.css`, `app.js`, `registration.js`, `config.js`
3. Vào **Settings → Pages → Source**: Deploy from `main` / `/ (root)`
4. Đợi ~1 phút, trang sẽ chạy tại: `https://<username>.github.io/<repo-name>/`

### Bước 2: Tạo Google Apps Script Backend

1. Mở Google Sheet → **Extensions → Apps Script**
2. Dán nội dung file `google-apps-script.js` vào editor
3. Nhấn **Deploy → New deployment**:
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy URL deploy (dạng `https://script.google.com/macros/s/.../exec`)

### Bước 3: Kết nối Frontend ↔ Backend

Mở `config.js`, dán URL vào:

```javascript
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
```

Upload lại `config.js` lên GitHub. **Xong!**

---

## 📊 Cấu Hình Google Sheets

Backend sử dụng Google Sheets làm database với các sheet sau:

### Sheet lịch ca (tự động tạo)

Mỗi ca tạo 1 sheet riêng, tên: `Ca_0600_1000`, `Ca_2200_0600`, v.v.

| STT | Mã NV | Họ Tên | Định Danh | *Cột vị trí (động)* | Ghi Chú | Trạng Thái | Thời Gian | SĐT |
|-----|-------|--------|-----------|----------------------|---------|------------|-----------|-----|
| 1 | OPS193039 | Nguyễn Văn A | A-OS | Chute 53-71 | | confirmed | 22:15:00 | 0901... |

### Sheet yêu cầu: `XIN_OFF`

| Dấu thời gian | MÃ OPS | HỌ VÀ TÊN | Số Điện Thoại | XIN OFF/THẾ CA | LÝ DO | NGÀY | GHI CHÚ |
|----------------|--------|------------|---------------|----------------|-------|------|---------|

### Sheet đăng ký lịch (tự động tạo)

Tên sheet: `LỊCHT{tháng}_{caId}`, ví dụ: `LỊCHT6_22:00-06:00`

| Dấu thời gian | Mã NV | Họ và Tên | Số ĐT | Ca | Tên Ca | *Ngày 1* | *Ngày 2* | ... |
|----------------|-------|-----------|-------|----|--------|----------|----------|-----|
| | OPS123456 | Nguyễn Văn A | 090... | 22:00-06:00 | Ca Đêm | WORK | OFF | ... |

---

## 🛡 Validation & Bảo Mật

### Mã Nhân Viên

Format: `Ops` (hoặc `OPS`, `ops`) + **5-6 chữ số**

```
✅ Ops224190    ✅ OPS193039    ✅ ops143922    ✅ Ops67053
❌ Op224190     ❌ 224190       ❌ Ops22        ❌ ABC123456
```

### Số Điện Thoại Zalo

Số VN hợp lệ (10 số), bắt đầu bằng: `03x`, `05x`, `07x`, `08x`, `09x`

### Chống Gian Lận

| Biện pháp | Mô tả |
|-----------|-------|
| Chặn điểm danh trùng | Mỗi NV chỉ được điểm danh 1 lần/ca |
| Kiểm tra khung giờ | Chỉ cho phép điểm danh trong giờ quy định (tùy chọn) |
| Rate limiting | Tối đa 10 lần thử, khóa 5 phút khi vượt giới hạn |
| Khóa xin off ban đêm | Không cho gửi yêu cầu off từ 18:00 – 06:00 |
| Chặn đăng ký trùng ca | Mỗi NV chỉ được đăng ký 1 ca/kỳ |

### Xác thực Admin

- Đăng nhập bằng email + mật khẩu
- Xác thực phía server (Google Apps Script)
- Session lưu trên localStorage

> ⚠️ **Không chia sẻ** Apps Script URL công khai. SDT Zalo chỉ dùng để xác minh, không hiển thị công khai.

---

## 🐛 Xử Lý Sự Cố

<details>
<summary><strong>🔴 Lịch không tải được</strong></summary>

- Kiểm tra URL API trong `config.js` hoặc **Cài đặt → Liên kết hệ thống**
- Đảm bảo Apps Script đã được deploy là **Web app** với quyền **Anyone**
- Mở Console (F12) để xem lỗi chi tiết
- Thử deploy lại Apps Script với phiên bản mới

</details>

<details>
<summary><strong>🔴 Điểm danh báo lỗi "Không tìm thấy mã NV"</strong></summary>

- Kiểm tra mã NV có đúng format `OpsXXXXX` hoặc `OpsXXXXXX`
- Đảm bảo NV đã có trong lịch ca hiện tại
- Admin cần dán và lưu lịch ca trước khi NV điểm danh

</details>

<details>
<summary><strong>🟡 Giao diện không hiển thị đúng trên mobile</strong></summary>

- Hệ thống được thiết kế mobile-first, hỗ trợ tốt nhất trên Chrome/Safari
- Đảm bảo truy cập qua HTTPS (GitHub Pages mặc định có HTTPS)
- Thử xóa cache trình duyệt và tải lại trang

</details>

<details>
<summary><strong>🟡 Không đăng nhập được Admin</strong></summary>

- Kiểm tra email và mật khẩu chính xác
- Mật khẩu phân biệt chữ hoa/chữ thường
- Đảm bảo có kết nối internet (xác thực qua server)

</details>

---

## 🔧 Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | HTML5 + Vanilla JS + CSS3 (Dark mode) |
| **Typography** | Inter (UI) + JetBrains Mono (code/mã) |
| **Hosting** | GitHub Pages (Static) |
| **Backend** | Google Apps Script (Serverless) |
| **Database** | Google Sheets |
| **Auth** | Email/Password qua Apps Script |

---

<p align="center">
  <strong>AGR Attendance System v3.0.0</strong><br>
  <sub>Built with ❤️ for AGR Operations Team</sub>
</p>

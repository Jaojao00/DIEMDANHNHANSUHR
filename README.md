# AGR - Hệ Thống Điểm Danh & Lịch Làm Việc

Hệ thống web app quản lý lịch làm việc và điểm danh tự động, chạy trên **GitHub Pages** và kết nối với **Google Sheets**.

---

## 📁 Cấu trúc file

```
xác nhận lịch làm việc/
├── index.html      ← Trang web chính
├── style.css       ← Giao diện dark mode AGR
├── app.js          ← Logic ứng dụng (camera, form, API)
├── config.js       ← Cấu hình (URL Apps Script, regex, ...)
├── Code.gs         ← Google Apps Script backend (copy vào GAS)
└── README.md       ← Hướng dẫn này
```

---

## 🚀 Hướng dẫn Deploy lên GitHub Pages

### Bước 1: Tạo GitHub Repository

1. Truy cập https://github.com → **New repository**
2. Đặt tên: `agr-attendance` (hoặc tên bất kỳ)
3. Chọn **Public**
4. Nhấn **Create repository**

### Bước 2: Upload các file

Upload 4 file sau lên repository:
- `index.html`
- `style.css`
- `app.js`
- `config.js`

### Bước 3: Bật GitHub Pages

1. Vào **Settings** → **Pages**
2. **Source**: Deploy from a branch
3. **Branch**: `main` → `/ (root)`
4. Nhấn **Save**
5. Đợi ~1 phút, trang sẽ chạy tại:
   `https://<username>.github.io/<repository-name>/`

> Ở bước này, trang đã chạy được với **dữ liệu demo** (lịch ca đêm mẫu)

---

## 🔗 Kết nối Google Sheets (Tùy chọn)

### Bước 1: Chuẩn bị Google Sheet

Tạo một Google Sheet với **2 sheet con**:

**Sheet 1: `LichLamViec`**
| STT | MaCTV | HoTen | DinhDanh | ViTriCoDinh | SauGioNghi | 4h-6h | Ngay | Highlight |
|-----|-------|-------|----------|-------------|------------|-------|------|-----------|
| 1 | OPS193039 | Nguyễn Thanh Bảo Long | A-OS | Chute 53-71 | Chute 53-71 | Xả xe 102 | 16/06/2026 | |
| 2 | Ops156293 | Lê Phúc Hậu | A-OS | A1-A4 | Xả 76 79 | OB17 | 16/06/2026 | |

> Cột `Highlight`: điền `red` hoặc `yellow` để tô màu hàng đó trên web

**Sheet 2: `DiemDanh`**  
Để trống, hệ thống sẽ tự tạo header khi có điểm danh đầu tiên.

### Bước 2: Tạo Apps Script

1. Mở Google Sheet → **Extensions** → **Apps Script**
2. Xóa code cũ, dán nội dung file `Code.gs` vào
3. Nhấn **Save** (Ctrl+S)

### Bước 3: Deploy Web App

1. Nhấn **Deploy** → **New deployment**
2. Chọn type: **Web app**
3. Cài đặt:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Nhấn **Deploy** → Copy URL (dạng `https://script.google.com/macros/s/...`)

### Bước 4: Cập nhật config.js

Mở `config.js`, thay `''` thành URL vừa copy:

```javascript
APPS_SCRIPT_URL: 'https://script.google.com/macros/s/ABC.../exec',
```

Upload lại `config.js` lên GitHub. Xong!

---

## 📋 Tính năng

| Tính năng | Mô tả |
|-----------|-------|
| 📋 Xem lịch ca | Hiển thị đầy đủ lịch làm việc hôm nay từ Google Sheets |
| 📷 Quét thẻ | Dùng camera đọc barcode thẻ nhân viên tự động |
| ✏️ Nhập tay | Nhập Mã NV + Họ tên + SDT Zalo để điểm danh |
| ✅ Badge xác nhận | Dấu ✓ màu xanh hiện trên bảng sau khi điểm danh |
| 🕐 Tooltip thời gian | Rê chuột vào ✓ → xem giờ điểm danh + thông tin NV |
| 🔍 Tìm kiếm | Lọc nhanh theo mã NV hoặc họ tên |
| 🔄 Tự làm mới | Tự động tải lại lịch mỗi 60 giây |
| 🛡️ Chống gian lận | Validate format mã NV, chặn điểm danh 2 lần, yêu cầu SDT |

---

## 🆔 Định dạng Mã Nhân Viên

Mã hợp lệ: `Ops` (hoặc `OPS`, `ops`) + **5 hoặc 6 chữ số**

```
✅ Ops224190    ✅ OPS193039    ✅ ops143922
✅ Ops67053     ✅ OPS35725
❌ Op224190     ❌ 224190       ❌ Ops22      ❌ ABC123456
```

---

## 📞 Số điện thoại Zalo

Phải là số điện thoại Việt Nam hợp lệ (10 số):
- Bắt đầu bằng: `03x`, `05x`, `07x`, `08x`, `09x`

---

## ⚠️ Lưu ý bảo mật

- **Không chia sẻ** Apps Script URL lên GitHub (tránh lộ quyền ghi vào Sheet)
- Thêm Apps Script URL trực tiếp vào `config.js` sau khi đã deploy
- SDT Zalo được lưu để HR liên hệ xác minh khi cần, không hiển thị công khai

---

## 🐛 Xử lý sự cố

**Camera không hoạt động:**
- Đảm bảo truy cập trang qua HTTPS (GitHub Pages mặc định có HTTPS)
- Cấp quyền camera trong cài đặt trình duyệt
- Thử trình duyệt khác (Chrome/Firefox)

**Barcode không đọc được:**
- Giữ thẻ thẳng, đủ ánh sáng
- Không che barcode
- Dùng tab "Nhập Tay" nếu quét không được

**Lịch không tải:**
- Kiểm tra Apps Script URL trong `config.js`
- Đảm bảo sheet có tên đúng: `LichLamViec`
- Xem console trình duyệt (F12) để biết lỗi cụ thể

---

*AGR Attendance System v1.0.0*

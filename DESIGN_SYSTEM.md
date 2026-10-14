# TƯ LIỆU HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM) - WEB ĐIỂM DANH

Tài liệu này lưu trữ các quy chuẩn về giao diện, màu sắc, phông chữ và các thành phần giao diện phục vụ cho việc xây dựng lại hệ thống Web Điểm Danh (AGARI / Shopee Xpress).

---

## 1. Phông Chữ (Typography)

Hệ thống sử dụng bộ phông chữ hiện đại, tối ưu cho việc hiển thị trên nền tảng số, mang lại cảm giác thân thiện nhưng vẫn chuyên nghiệp:

* **Phông chữ chính (Primary Font):** `Inter` (Google Fonts)
  * **Mục đích:** Dùng cho toàn bộ nội dung văn bản (`body text`), tiêu đề (`headings`), và nút bấm (`buttons`).
  * **Đặc điểm:** Rõ ràng, dễ đọc trên mọi kích thước màn hình, hỗ trợ đầy đủ tiếng Việt (`subsets: latin, vietnamese`).
* **Phông chữ phụ trợ:** Bộ phông hệ thống tiêu chuẩn (`sans-serif`) của Tailwind CSS được thiết lập qua biến `--font-sans`.

---

## 2. Bảng Màu Thương Hiệu (Color Palette)

Website sử dụng tông màu **Đỏ - Vàng** làm chủ đạo, thể hiện sự năng động, nhiệt huyết và đặc trưng nhận diện của thương hiệu AGARI (cũng như đối tác Shopee Xpress).

### 2.1. Màu Chủ Đạo (Primary Colors)
* 🔴 **Đỏ AGARI (AGARI Red):** `#D90000` / `#D90012`
  * **Mục đích:** Nút bấm chính (Primary Buttons), tiêu đề nổi bật, màu nền Header, và các icon nhấn mạnh.
  * **Biến thể:** Màu gradient đổ bóng từ `#d90012` sang `#ff2a3a` (dùng cho các khung Hero Banner, tạo cảm giác 3D, thu hút ánh nhìn).
* 🟡 **Vàng Nhấn (Accent Yellow):** Tailwind `yellow-400` / `yellow-300` (Mã Hex khoảng `#FBBF24` / `#FDE047`)
  * **Mục đích:** Highlights văn bản (ví dụ: *"THỐT NỐT, CẦN THƠ"*), các badge ưu đãi (*"Việc nhẹ lương tốt"*), đường viền nhấn. Sự kết hợp giữa nền Đỏ và chữ Vàng tạo độ tương phản cực kỳ cao và thu hút.

### 2.2. Màu Văn Bản & Giao Diện (Neutral & UI Colors)
* **Nền Giao Diện (Backgrounds):**
  * `#FAFAFA` hoặc `gray-50`: Nền trang tổng thể, tạo cảm giác sáng sủa, thoáng đãng, giúp làm nổi bật các thẻ nội dung màu trắng.
  * **Trắng (`#FFFFFF`):** Dùng cho nền các khối nội dung (Cards), Form điền thông tin.
* **Màu Văn Bản (Text Colors):**
  * `slate-900` / `slate-800`: Dùng cho tiêu đề phụ và nội dung chính, tạo độ tương phản vừa đủ, không bị gắt như màu đen tuyền.
  * `slate-500` / `slate-400`: Dùng cho đoạn văn bản phụ (mô tả, ghi chú, icon).
* **Màu Admin Dashboard (Quản trị viên):**
  * `#0B1120` / `#0F172A`: Tông màu xanh đen đậm, được dùng riêng cho thanh Sidebar của hệ thống quản trị, tạo sự tách biệt rõ ràng giữa khu vực User và Admin.

### 2.3. Màu Nhấn Nhẹ (Pastel / Soft Accents)
Dùng cho các khối thông tin phụ, badge trạng thái, hoặc nền icon để giao diện không bị nhàm chán:
* `bg-red-50` / `red-100`: Nền đỏ nhạt, viền đỏ nhạt (dùng bao quanh các khối lương, thời gian).
* `bg-blue-50` / `bg-yellow-50` / `bg-green-50`: Dùng cho nền các icon Tiêu chí, Yêu cầu, Trạng thái (ví dụ: trạng thái *"Đã nhận việc"* dùng màu xanh lá).

---

## 3. Cấu Hình Tham Khảo Cho Tailwind CSS (Quick Setup)

```javascript
// tailwind.config.js (tham khảo)
module.exports = {
  theme: {
    extend: {
      colors: {
        agari: {
          red: '#D90012',
          'red-dark': '#D90000',
          'red-light': '#ff2a3a',
          yellow: '#FBBF24',
          'yellow-light': '#FDE047',
        },
        admin: {
          sidebar: '#0B1120',
          'sidebar-dark': '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-sans)', 'sans-serif'],
      }
    }
  }
}
```

---

## 4. Các Thành Phần Khác (Components & Specifications)
*(Sẽ được bổ sung thêm theo yêu cầu)*

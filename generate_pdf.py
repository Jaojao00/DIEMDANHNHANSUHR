import urllib.request
import os
from fpdf import FPDF

# Download Roboto Regular and Bold
roboto_reg_url = "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf"
roboto_bold_url = "https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf"

urllib.request.urlretrieve(roboto_reg_url, "Roboto-Regular.ttf")
urllib.request.urlretrieve(roboto_bold_url, "Roboto-Bold.ttf")

class PDF(FPDF):
    def header(self):
        self.set_font('Roboto-Bold', '', 16)
        self.cell(0, 10, 'TÀI LIỆU HỆ THỐNG ĐIỂM DANH & QUẢN LÝ NHÂN SỰ AGARI', 0, 1, 'C')
        self.ln(5)

    def chapter_title(self, title):
        self.set_font('Roboto-Bold', '', 14)
        self.set_fill_color(230, 230, 230)
        self.cell(0, 8, title, 0, 1, 'L', 1)
        self.ln(2)

    def chapter_body(self, body):
        self.set_font('Roboto-Regular', '', 11)
        self.multi_cell(0, 6, body)
        self.ln()

pdf = PDF()
pdf.add_font('Roboto-Regular', '', 'Roboto-Regular.ttf', uni=True)
pdf.add_font('Roboto-Bold', '', 'Roboto-Bold.ttf', uni=True)
pdf.add_page()

# Content
content = {
    "1. TỔNG QUAN HỆ THỐNG": """Hệ thống quản lý điểm danh và tra cứu công lương nội bộ được thiết kế dành riêng cho đội ngũ nhân sự và ban quản lý. Hệ thống hoạt động theo mô hình Client-Server với Frontend (HTML, CSS, JS) và Backend (Google Apps Script + Google Sheets).
Mục đích chính:
- Tự động hóa quy trình điểm danh, đăng ký ca làm việc.
- Cung cấp công cụ tra cứu công/lương/KPI cho nhân viên.
- Trang bị hệ thống quản trị (Admin Dashboard) realtime dành cho quản lý.""",

    "2. CÁC TÍNH NĂNG CHÍNH CỦA HỆ THỐNG": """A. Giao Diện Nhân Viên (Employee Portal)
- Điểm Danh: Điểm danh đầu ca, cuối ca, xác nhận vị trí làm việc. Hiển thị thông báo trạng thái realtime.
- Lịch Làm Việc: Xem danh sách các ca làm việc đang mở. Đăng ký ca làm, đăng ký vị trí.
- Tra Cứu (Xem Lịch): Xem chi tiết danh sách những người làm cùng ca.
- Tra Cứu Lương & KPI: Tính năng mới giúp đối soát KPI, xem tổng công, số tiền tạm tính, biểu đồ số giờ làm việc. Tích hợp nhập CCCD/Mã NV để bảo mật.
- Quy Định: Bảng nội quy công ty, quy chế làm việc, thưởng phạt được tích hợp trực tiếp giúp nhân viên dễ dàng nắm bắt.

B. Giao Diện Quản Trị (Admin Dashboard)
- Realtime Tracking: Quản lý nhìn thấy tức thời trạng thái điểm danh của từng nhân sự, số lượng hiện diện/vắng mặt.
- Quản Lý Yêu Cầu (Change Requests): Duyệt hoặc từ chối các yêu cầu xin OFF, đổi ca, đổi áo, đổi thẻ.
- Duyệt Điểm Danh & Vị Trí: Quản lý trực tiếp chỉnh sửa vị trí làm việc, chấm công.
- Lưu trữ (Sync): Tự động đồng bộ toàn bộ dữ liệu xuống Google Sheets.""",

    "3. GIAO DIỆN & MÀU SẮC (UI/UX)": """Hệ thống sử dụng giao diện Dark Mode chủ đạo, lấy cảm hứng từ phong cách hiện đại và tối giản, kết hợp Theme "Đêm Hội Trăng Rằm" (Mid-Autumn).

1. Bảng màu (Color Palette):
- Nền chính (Background): #080A18 (Xanh tím than đậm) đến #1A1A2E (Tím than nhạt), tạo chiều sâu.
- Bề mặt (Surface): #141428 với độ trong suốt 80% (kết hợp blur) tạo hiệu ứng kính (Glassmorphism).
- Màu chủ đạo (Primary): #E63C1E (Đỏ Agari) và #FF8C42 (Cam sáng) dùng cho nút bấm, logo.
- Màu thành công (Success): #00D48E (Xanh ngọc).
- Màu cảnh báo (Warning): #FFB800 (Vàng).
- Màu viền & Điểm nhấn: rgba(255, 215, 90, 0.2) (Vàng mặt trăng).
- Màu chữ: #F0F0FF (Trắng sáng) cho tiêu đề, #9898C0 (Xám tím) cho chữ phụ.

2. Phông chữ (Typography):
- Inter (sans-serif): Dùng cho văn bản chính, tên nút bấm, giao diện đọc (font hiện đại, dễ nhìn, thanh thoát).
- JetBrains Mono (monospace): Dùng cho các con số, mã nhân viên (VD: OPS12345), giờ làm việc (06:00 - 15:00) nhằm tạo sự chính xác, rõ nét và phong cách công nghệ.""",

    "4. KIẾN TRÚC & CÔNG NGHỆ": """- Frontend: HTML5, CSS3, Vanilla JavaScript. Không sử dụng Framework nặng, giúp ứng dụng load cực nhanh.
- Thiết kế: Mobile-first, Responsive. CSS Variables kết hợp tính năng Breakout để hiển thị giao diện Desktop ở màn hình Tra cứu.
- PWA (Progressive Web App): Tích hợp Service Worker (sw.js) để lưu cache, cho phép load nhanh cả khi mạng yếu và cài đặt như App.
- Backend: Google Apps Script kết nối với Google Sheets. Chạy như một REST API không tốn phí duy trì server."""
}

for title, body in content.items():
    pdf.chapter_title(title)
    pdf.chapter_body(body)

pdf.output('TaiLieuHeThong.pdf')
print("PDF created")

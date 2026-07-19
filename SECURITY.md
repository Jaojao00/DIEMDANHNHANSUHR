# 🛡 Chính Sách Bảo Mật & An Toàn Hệ Thống

Tài liệu này cung cấp các hướng dẫn về quy trình báo cáo lỗ hổng, các phiên bản được hỗ trợ, và liệt kê các cơ chế bảo mật mà hệ thống **AGR Attendance** đang áp dụng để bảo vệ dữ liệu.

---

## 📦 Các Phiên Bản Được Hỗ Trợ

Chúng tôi liên tục cập nhật và duy trì hệ thống để đảm bảo tính ổn định và an toàn thông tin cao nhất. 

| Phiên bản | Trạng thái Hỗ trợ | Cập nhật bảo mật |
| :--- | :---: | :---: |
| **3.x.x** (Phiên bản hiện tại) | ✅ Đang Hỗ Trợ | Nhận bản vá mới nhất |
| **2.x.x** | ❌ Ngừng Hỗ Trợ | Không |
| **1.x.x** | ❌ Ngừng Hỗ Trợ | Không |

> **Lưu ý:** Tất cả các bản vá bảo mật, tính năng chống gian lận (Anti-fraud), và nâng cấp hiệu suất chỉ được triển khai trên nhánh **`3.x.x`** trở lên. Khuyến nghị người dùng luôn sử dụng mã nguồn mới nhất trên nhánh `main`.

---

## 🚨 Báo Cáo Lỗ Hổng Bảo Mật (Reporting a Vulnerability)

An toàn dữ liệu là ưu tiên hàng đầu. Nếu bạn phát hiện ra bất kỳ lỗi hổng bảo mật nào trong hệ thống, vui lòng **TUYỆT ĐỐI KHÔNG công khai lỗi đó lên phần Issues của GitHub** để tránh việc kẻ gian lợi dụng trước khi lỗi được khắc phục.

Vui lòng tuân thủ quy trình báo cáo sau:

1. **Email báo cáo**: Gửi thông tin chi tiết về lỗ hổng thông qua hệ thống nội bộ của đội ngũ phát triển.
2. **Nội dung báo cáo cần có**:
   - Mô tả chi tiết về lỗ hổng, vị trí xảy ra lỗi (Frontend/Backend).
   - Các bước tái hiện lỗi (Step-to-reproduce) càng chi tiết càng tốt.
   - Bằng chứng đi kèm: Ảnh chụp màn hình, Video minh họa, hoặc đoạn mã gây lỗi (nếu có).
3. **Quy trình tiếp nhận và xử lý**:
   - Đội ngũ Quản trị/Dev sẽ phản hồi xác nhận tiếp nhận thông tin trong vòng **24 giờ**.
   - Mức độ nghiêm trọng của lỗi sẽ được đánh giá. Một bản vá khẩn cấp (Hotfix) sẽ được tung ra trong vòng **48 giờ**.
   - Chi tiết về lỗ hổng sẽ được giữ bảo mật nội bộ cho đến khi bản vá được triển khai toàn diện và an toàn trên môi trường Production.

---

## 🔒 Các Cơ Chế Bảo Mật Tích Hợp

Hệ thống được thiết kế với nhiều lớp bảo vệ ở cả Frontend và Backend để chống lại các hành vi thao túng dữ liệu:

### 1. Phân Quyền Truy Cập (Access Control)
- Phân tách rõ ràng giữa giao diện dành cho **Nhân viên** và **Quản trị viên**.
- Toàn bộ dữ liệu nhạy cảm (thông tin cá nhân, danh sách lịch ca tổng) được bảo vệ bằng lớp xác thực Admin (`admin_login`) kết nối an toàn với cơ sở dữ liệu.

### 2. Chống Gian Lận & Hạn Chế Thao Tác (Anti-Fraud & Rate Limiting)
- **Khóa điểm danh trùng lặp**: Ngăn chặn 1 nhân viên điểm danh nhiều lần trong cùng một ca.
- **Giới hạn số lần thử (Rate Limiting)**: Tự động khóa tính năng nếu người dùng liên tục nhập sai thông tin hoặc có dấu hiệu spam API.
- **Khóa chống Spam cấp độ Ca (Shift-level Lock)**: Nới lỏng giới hạn chống trùng lặp từ "Cả kỳ" xuống "Ca làm việc", cho phép nhân sự linh hoạt đăng ký nhiều ca (VD: Sáng + Tối) nhưng vẫn triệt tiêu hoàn toàn khả năng submit spam cùng một ca.

### 3. Kiểm Soát Quy Trình (Process Validation)
- **Xác thực khung giờ tự động**: 
  - Khóa gửi yêu cầu xin nghỉ từ 18:00 đến 06:00 sáng hôm sau.
  - Ngăn chặn điểm danh ngoài khung giờ hợp lệ đã được cấu hình trên hệ thống.
- **Xác thực chéo dữ liệu (Data Obfuscation & Validation)**: Dữ liệu gửi đi từ thiết bị của nhân viên sẽ được Backend kiểm tra lại một lần nữa trước khi ghi vào Database, tránh việc giả mạo request (Request Forgery).

---

Cảm ơn bạn đã luôn đồng hành và đóng góp vào việc xây dựng hệ thống AGR Attendance an toàn, bảo mật!

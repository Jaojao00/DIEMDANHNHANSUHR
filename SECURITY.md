# Security Policy

## Supported Versions

Chúng tôi liên tục cập nhật và duy trì hệ thống để đảm bảo an toàn thông tin cho mọi dữ liệu của người dùng. Dưới đây là danh sách các phiên bản đang được hỗ trợ:

| Phiên bản | Trạng thái Hỗ trợ |
| :--- | :--- |
| **3.x.x** (Bản hiện tại) | ✅ Được hỗ trợ đầy đủ |
| 2.x.x | ❌ Ngừng hỗ trợ |
| 1.x.x | ❌ Ngừng hỗ trợ |

Tất cả các bản vá bảo mật và tính năng chống gian lận mới nhất chỉ được triển khai trên nhánh **`3.x.x`** trở lên. Vui lòng đảm bảo bạn đang sử dụng mã nguồn mới nhất trên nhánh `main`.

---

## Reporting a Vulnerability (Báo Cáo Lỗ Hổng Bảo Mật)

Nếu bạn phát hiện ra bất kỳ lỗi hổng bảo mật nào trong hệ thống, vui lòng TUYỆT ĐỐI KHÔNG công khai lỗi đó lên phần Issues của GitHub để tránh việc kẻ gian lợi dụng.

Vui lòng báo cáo lỗi bảo mật theo quy trình sau:

1. **Email báo cáo**: Gửi thông tin chi tiết về lỗ hổng vào email quản trị hệ thống hoặc liên hệ trực tiếp với đội ngũ phát triển nội bộ.
2. **Nội dung email**:
   - Mô tả chi tiết lỗ hổng bạn tìm thấy.
   - Các bước tái hiện lỗi (Càng chi tiết càng tốt).
   - Video hoặc ảnh chụp màn hình minh họa (nếu có).
3. **Quy trình xử lý**:
   - Đội ngũ quản trị sẽ xác nhận đã nhận được báo cáo của bạn trong vòng 24 giờ.
   - Chúng tôi sẽ đánh giá mức độ nghiêm trọng và phát hành bản vá nóng (hotfix) trong vòng 48 giờ.
   - Lỗi sẽ được giữ bí mật cho đến khi bản vá được triển khai toàn diện trên hệ thống.

### Các Cơ Chế Bảo Mật Đang Được Áp Dụng:
- **Chống gian lận điểm danh**: Khóa chức năng điểm danh nếu nhân viên nhập sai thông tin liên tiếp (Rate limiting).
- **Phân quyền truy cập**: Toàn bộ dữ liệu điểm danh, quản lý ca và thông tin liên lạc được bảo vệ sau lớp xác thực tài khoản Admin (`admin_login`).
- **Khóa chống Spam cấp độ Ca (Shift-level Lock)**: Nới lỏng khóa chống trùng lặp Firebase từ cấp độ "Kỳ đăng ký" xuống cấp độ "Ca làm việc", cho phép nhân sự linh hoạt đăng ký nhiều ca khác nhau trong ngày (VD: Ca Ngày + Ca Đêm) một cách an toàn mà vẫn ngăn chặn tuyệt đối việc spam gửi cùng một ca.
- **Data Obfuscation**: Dữ liệu nhân viên được xác thực chéo với máy chủ Google Apps Script.
- **Xác thực khung giờ**: Nhân viên bị ràng buộc bởi các thiết lập thời gian (Không được điểm danh ngoài giờ quy định, cấm gửi đơn xin nghỉ từ 18:00 đến 06:00).

Cảm ơn bạn đã đóng góp vào việc bảo vệ an toàn cho hệ thống AGR Attendance!

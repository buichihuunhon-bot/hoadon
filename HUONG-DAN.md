# Hướng dẫn sử dụng đối chiếu hóa đơn

## Mở bản mới

Giữ `index.html`, `styles.css` và `xlsx.full.min.js` trong cùng thư mục. Mở `index.html` bằng Chrome hoặc Edge.

Lần đầu mở bản mới trên máy đang có dữ liệu, nhập **một mật khẩu dữ liệu mới từ 10 ký tự trở lên**. Trang sẽ tải một bản sao lưu mã hóa trước khi chuyển dữ liệu cũ trên máy sang dạng mã hóa. Từ lần sau, cần nhập lại đúng mật khẩu này. Tên người sử dụng chỉ là nhãn hiển thị, không phải tài khoản được xác thực trên máy chủ.

Nếu trình duyệt không đủ dung lượng để mã hóa dữ liệu cũ, trang giữ nguyên dữ liệu cũ và hiện nút **Tải bản sao lưu dữ liệu cũ**.

## Đồng bộ Gist

Trên máy chính, nhập Gist ID và GitHub token rồi chọn **Tải lên Cloud**. Dữ liệu tải lên được mã hóa bằng mật khẩu dùng để mở dữ liệu trên máy. Gist cũ chưa mã hóa vẫn có thể kéo xuống; sau khi kiểm tra, tải lên lại để chuyển Gist sang dạng mã hóa.

Trên máy khác, mở cùng bản ứng dụng, nhập **cùng mật khẩu dữ liệu**, nhập Gist ID rồi chọn **Tải xuống Cloud**. Token chỉ được giữ trong phiên trình duyệt hiện tại và cần nhập lại ở phiên sau.

Trước khi Push hoặc Pull có thể ghi đè dữ liệu đã thay đổi, trang sẽ cảnh báo và tải bản sao lưu. Nút **Sao lưu JSON** và **Khôi phục JSON** dùng cùng mật khẩu dữ liệu. Hãy giữ cả tệp sao lưu lẫn mật khẩu ở nơi an toàn; quên mật khẩu sẽ không giải mã được dữ liệu đã mã hóa.

## Nhập Excel và đối soát ngân hàng

Trang bỏ qua file Excel giống hệt file đã nhập. Với bill có chuyển khoản, mở chi tiết để nhập tip, tiền thực nhận trên sao kê và mã giao dịch hoặc nội dung chuyển khoản. Tip được cộng vào số ngân hàng dự kiến, không cộng vào doanh thu hóa đơn.

Phần tự nhập và ghép sao kê ngân hàng cần một file mẫu đã che thông tin nhạy cảm để xác định đúng tên cột và cách một giao dịch khớp với một hay nhiều bill.

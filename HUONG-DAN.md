# Hướng dẫn sử dụng đối chiếu hóa đơn

## Mở dữ liệu

Giữ `index.html`, `styles.css`, `supabase-sync.js` và `xlsx.full.min.js` trong cùng thư mục nếu mở trên máy. Ứng dụng cũng có thể chạy trên GitHub Pages.

Lần đầu mở bản mới trên máy đang có dữ liệu, nhập **mật khẩu dữ liệu từ 10 ký tự trở lên**. Trang tải một bản sao lưu mã hóa trước khi chuyển dữ liệu cũ trên máy sang dạng mã hóa. Từ lần sau, cần nhập lại đúng mật khẩu này. Tên người sử dụng chỉ là nhãn hiển thị, không phải tài khoản Cloud.

Nếu trình duyệt không đủ dung lượng để mã hóa dữ liệu cũ, trang giữ nguyên dữ liệu cũ và hiện nút **Tải bản sao lưu dữ liệu cũ**. Quên mật khẩu dữ liệu sẽ không giải mã được bản sao lưu hoặc bản Cloud.

## Đồng bộ tự động qua Supabase

Sau khi người quản lý dự án chạy `supabase-setup.sql`, vào mục **Đồng bộ tự động** trên trang để tạo tài khoản email hoặc đăng nhập Cloud. Phiên đăng nhập Cloud được trình duyệt lưu; bạn vẫn nhập mật khẩu dữ liệu khi mở ứng dụng để giải mã. Dùng cùng tài khoản Cloud và cùng mật khẩu dữ liệu trên các thiết bị.

Ứng dụng tự lưu các thay đổi lên Cloud khi có kết nối, và kiểm tra bản mới khi mở trang, quay lại tab hoặc sau khoảng 30 giây. Đọc nhãn trạng thái ở đầu trang để biết dữ liệu đã lên Cloud hay chưa. Nếu có xung đột giữa thiết bị, hãy chọn bản cần giữ trong mục **Đồng bộ tự động**; ứng dụng sẽ tải bản sao lưu mã hóa trước khi thay thế dữ liệu cũ.

Bạn có thể dùng **Sao lưu JSON** và **Khôi phục JSON** để chuyển dữ liệu thủ công. Khi khôi phục bản sao lưu hoặc tải Gist cũ trong lúc đã có dữ liệu Cloud, ứng dụng yêu cầu chọn bản để tránh ghi đè âm thầm.

## Gist cũ

Mục **Chuyển dữ liệu từ GitHub Gist cũ** chỉ dùng để nhập dữ liệu từ hệ thống đồng bộ trước đây. Gist ID và token không cần thiết cho tự đồng bộ Supabase. Nếu dùng Gist cũ, token chỉ được giữ trong phiên trình duyệt hiện tại.

## Nhập Excel và đối soát ngân hàng

Trang bỏ qua file Excel giống hệt file đã nhập. Với bill có chuyển khoản, mở chi tiết để nhập tip, tiền thực nhận trên sao kê và mã giao dịch hoặc nội dung chuyển khoản. Tip được cộng vào số ngân hàng dự kiến, không cộng vào doanh thu hóa đơn.

Phần tự nhập và ghép sao kê ngân hàng cần một file mẫu đã che thông tin nhạy cảm để xác định đúng tên cột và cách một giao dịch khớp với một hay nhiều bill.

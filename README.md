# Đối chiếu hóa đơn KiotViet

Ứng dụng tĩnh để nhập hóa đơn Excel, theo dõi thanh toán, tip chuyển khoản và đối soát tiền ngân hàng. Dữ liệu được mã hóa trên trình duyệt và có thể tự đồng bộ qua Supabase.

## Thiết lập Supabase lần đầu

1. Mở dự án Supabase, vào **SQL Editor**, dán toàn bộ nội dung [supabase-setup.sql](supabase-setup.sql) rồi chọn **Run**. File này tạo bảng dữ liệu, bật Row Level Security và chỉ cho tài khoản đã đăng nhập đọc/ghi bản của chính mình. Không cần sửa Project URL hoặc publishable key trong ứng dụng.
2. Khi đã có địa chỉ GitHub Pages, vào **Authentication → URL Configuration** trong Supabase. Đặt **Site URL** là địa chỉ trang Pages của bạn, đồng thời thêm chính địa chỉ đó vào **Redirect URLs**. Việc này giúp email xác nhận tài khoản quay về đúng trang.
3. Tải các file ứng dụng lên GitHub: `index.html`, `styles.css`, `supabase-sync.js`, `xlsx.full.min.js`, `SHEETJS-LICENSE.txt` và `.nojekyll`. Nên đưa thêm `README.md`, `HUONG-DAN.md`, `supabase-setup.sql`, `.gitignore` và các file `*.test.js` để lưu hướng dẫn và bài kiểm tra. Trong **Settings → Pages**, chọn **Deploy from a branch**, nhánh chứa file và thư mục **/(root)**.
4. Mở trang Pages, nhập **mật khẩu dữ liệu** để mở ứng dụng. Trong mục **Đồng bộ tự động**, tạo tài khoản Cloud bằng email và mật khẩu tài khoản; xác nhận email nếu Supabase yêu cầu, rồi đăng nhập. Mật khẩu dữ liệu và mật khẩu tài khoản Cloud có thể khác nhau. Trên thiết bị khác, dùng **cùng mật khẩu dữ liệu** để giải mã, và đăng nhập **cùng tài khoản Cloud**.

Ứng dụng tự lưu lên Cloud sau khi nhập Excel, chỉnh tip hoặc đối soát; tự tải bản mới khi mở hoặc quay lại tab. Nhãn trạng thái ở đầu trang cho biết đã đồng bộ, đang chờ, lỗi, hay cần chọn bản dữ liệu. Nếu hai thiết bị sửa cùng lúc, ứng dụng dừng đồng bộ để bạn chọn bản Cloud hoặc bản trên máy; bản bị thay thế được tải xuống dưới dạng sao lưu JSON đã mã hóa.

## Chuyển dữ liệu đang dùng

Trước khi cập nhật trang cũ, chọn **Sao lưu JSON** và giữ file cùng mật khẩu dữ liệu. Dữ liệu lưu khi mở `index.html` trực tiếp trên máy không tự xuất hiện ở địa chỉ GitHub Pages. Trên Pages, mở bằng cùng mật khẩu dữ liệu rồi chọn **Khôi phục JSON**, hoặc dùng mục **Chuyển dữ liệu từ GitHub Gist cũ**. Sau đó đăng nhập Cloud, kiểm tra số hóa đơn và trạng thái đồng bộ trước khi nhập thêm.

Không tải hóa đơn Excel, sao kê, file sao lưu JSON, mật khẩu hay GitHub token lên repository. `.gitignore` giúp chặn các loại file dữ liệu thường gặp khi dùng Git; nếu tải bằng giao diện GitHub, vẫn phải tự kiểm tra danh sách file.

## Kiểm tra

Chạy `node gist.test.js` và `node supabase-sync.test.js`. Đây là kiểm tra logic bằng môi trường mô phỏng; sau khi chạy SQL và xuất bản Pages, cần thử đăng nhập, sửa một bill và kiểm tra bản Cloud trên thiết bị thứ hai. Tự động nhập và ghép sao kê ngân hàng hiện chưa có; tiền thực nhận được nhập trong chi tiết bill.

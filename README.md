# Đối chiếu hóa đơn KiotViet

Ứng dụng tĩnh để nhập hóa đơn Excel, theo dõi thanh toán, tip chuyển khoản và đối soát tiền ngân hàng. Dữ liệu trên máy được mã hóa bằng mật khẩu do người dùng đặt. Đồng bộ GitHub Gist cần Gist ID và token riêng.

## Đưa lên GitHub Pages

Đưa `index.html`, `styles.css`, `xlsx.full.min.js`, `SHEETJS-LICENSE.txt` và `.nojekyll` lên repository. Trong **Settings → Pages**, chọn **Deploy from a branch**, nhánh chứa các file này và thư mục **/(root)**.

Không đưa hóa đơn Excel, sao kê, file sao lưu JSON, mật khẩu hay GitHub token lên repository. `.gitignore` giúp chặn các loại file dữ liệu thường gặp khi dùng Git; vẫn cần kiểm tra danh sách file trước khi upload qua giao diện GitHub.

Trang GitHub Pages có vùng lưu trình duyệt riêng, nên dữ liệu đang thấy khi mở `index.html` trên máy sẽ không tự xuất hiện trên trang mới. Trước khi chuyển sang Pages, hãy **Sao lưu JSON** hoặc **Tải lên Cloud** từ bản đang dùng. Sau đó mở trang Pages, nhập **cùng mật khẩu dữ liệu** và **Khôi phục JSON** hoặc nhập Gist ID/token rồi **Tải xuống Cloud**. Kiểm tra số hóa đơn và vài khoản đối soát trước khi tiếp tục nhập dữ liệu.

Xem [Hướng dẫn sử dụng](HUONG-DAN.md) để biết thêm về mã hóa, đồng bộ Gist và đối soát ngân hàng.

## Kiểm tra

Chạy `node gist.test.js` để kiểm tra logic chính. Việc nhập và ghép sao kê ngân hàng tự động hiện chưa có; đối soát ngân hàng được nhập trong chi tiết bill.

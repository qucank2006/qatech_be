
# QATech Backend - Tài liệu API

## Giới thiệu dự án
QATech Backend là hệ thống API phía máy chủ cho nền tảng thương mại điện tử QATech, xây dựng bằng Node.js, Express, MySQL và Sequelize. Dự án cung cấp các chức năng xác thực, quản lý sản phẩm, xử lý đơn hàng, tích hợp thanh toán VNPay và quản lý đánh giá sản phẩm.

Backend này hướng tới sự ổn định, bảo mật và dễ mở rộng, hỗ trợ nhiều vai trò người dùng (admin, nhân viên, khách hàng) cùng các tính năng nâng cao như upload file, gửi email, tối ưu truy vấn.

**Lý do chọn công nghệ:**
- Node.js & Express: Nhanh, dễ mở rộng, phổ biến cho API RESTful.
- MySQL & Sequelize: Quản lý dữ liệu quan hệ hiệu quả.
- JWT & bcrypt: Bảo mật xác thực và quản lý mật khẩu.
- Multer & Nodemailer: Hỗ trợ upload file và gửi email.

**Thách thức & Định hướng tương lai:**
- Xử lý thông số kỹ thuật và hình ảnh sản phẩm phức tạp.
- Tích hợp cổng thanh toán an toàn.
- Đảm bảo xử lý lỗi và bảo mật tốt.
- Dự kiến: Thêm thông báo realtime, phân tích nâng cao, đa dạng hóa phương thức thanh toán.

---

## Mục lục
1. [Giới thiệu dự án](#giới-thiệu-dự-án)
2. [Cài đặt & Khởi động](#cài-đặt--khởi-động)
3. [Hướng dẫn sử dụng](#hướng-dẫn-sử-dụng)
4. [Cấu trúc dự án](#cấu-trúc-dự-án)
5. [Tổng quan API](#tổng-quan-api)
6. [Tác giả & Đóng góp](#tác-giả--đóng-góp)
7. [Giấy phép](#giấy-phép)

---

## Cài đặt & Khởi động

### Yêu cầu
- Node.js >= 14
- MySQL

### Các bước thực hiện
1. Clone repository về máy
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Tạo file `.env` với thông tin cấu hình:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=your_password
   DB_NAME=qatech_db
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   VNPAY_TMN_CODE=your_vnpay_tmn_code
   VNPAY_HASH_SECRET=your_vnpay_hash_secret
   VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
   VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay-return
   VNPAY_IPN_URL=http://localhost:5000/api/payments/vnpay-ipn
   ```
4. Khởi động server:
   ```bash
   npm run dev   # Chạy chế độ phát triển
   npm start     # Chạy chế độ production
   ```

---

## Hướng dẫn sử dụng

### Xác thực
Sử dụng JWT token trong header `Authorization`:
```
Authorization: Bearer <token>
```

### Một số endpoint tiêu biểu
- Đăng ký: `POST /api/auth/register`
- Đăng nhập: `POST /api/auth/login`
- Lấy sản phẩm: `GET /api/products`
- Tạo đơn hàng: `POST /api/orders`
- Thanh toán: `POST /api/payments/create`

### Upload file
Upload hình ảnh sản phẩm:
```
POST /api/products
FormData: images[]
```

### Kiểm thử
Chạy test API:
```bash
npm test
```

---

## Cấu trúc dự án

```
qatech_backend/
├── src/
│   ├── config/         # Cấu hình DB
│   ├── controllers/    # Xử lý nghiệp vụ
│   ├── middlewares/    # Xác thực, upload
│   ├── models/         # Định nghĩa dữ liệu
│   ├── routes/         # Định tuyến API
│   ├── services/       # Tầng dịch vụ
│   └── utils/          # Hàm tiện ích
├── uploads/            # File upload
├── server.js           # Điểm khởi động
└── package.json
```

---

## Tổng quan API

Xem chi tiết trong mã nguồn. Các chức năng chính:
- Xác thực & Quản lý người dùng
- CRUD sản phẩm & thông số kỹ thuật
- Quản lý đơn hàng
- Đánh giá & phản hồi
- Tích hợp thanh toán VNPay
- Dashboard thống kê

---

## Tác giả & Đóng góp

Phát triển bởi đội ngũ QATech.

Cảm ơn các contributor và nguồn tham khảo:
- Node.js, Express, Sequelize, MySQL, JWT, bcryptjs, multer, nodemailer, axios
- ChatGPT, Claude, Gemini, Github Copilot, Cursor


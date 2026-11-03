# 01. Tammi Backend REST API

Tài liệu chi tiết toàn bộ các điểm cuối (endpoints) của máy chủ Backend chính thức của Tammi Viettel.

- **Base URL Mặc định**: `https://api.tammi.vn/api/v1`
- **Biến môi trường tùy chỉnh**: `TAMMI_API_BASE`
- **Giao thức**: HTTPS (TLS 1.2 / 1.3)
- **Định dạng dữ liệu**: JSON (`Content-Type: application/json; charset=utf-8`)

---

## 1. Tiêu đề HTTP Chuẩn (Standard Request Headers)

Để máy chủ Tammi chấp nhận yêu cầu và không bị chặn bởi WAF / Cloudflare, mọi yêu cầu REST API cần gửi kèm các HTTP headers giả lập phiên Web client:

| Tên Header | Giá trị Mẫu | Ý nghĩa |
|---|---|---|
| `Content-Type` | `application/json` | Định dạng dữ liệu gửi lên |
| `Accept` | `application/json, text/plain, */*` | Định dạng phản hồi mong muốn |
| `Origin` | `https://tammi.vn` | Origin của ứng dụng web Tammi |
| `Referer` | `https://tammi.vn/` | Trang chuyển hướng referer |
| `User-Agent` | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36` | Chuỗi User Agent của trình duyệt web |
| `Accept-Language` | `vi` | Ngôn ngữ ưu tiên (Tiếng Việt) |
| `X-Device-Name` | `Browser` | Tên thiết bị |
| `X-Device-ID` | `550e8400-e29b-41d4-a716-446655440000` | Định danh thiết bị (UUID v4) |
| `X-Os-Version` | `macOS 10.15.7` | Phiên bản hệ điều hành trích xuất từ User-Agent |
| `X-IP-Address` | `14.225.x.x` | Địa chỉ IP public của client (lấy từ api.ipify.org) |
| `Authorization` | `Bearer <access_token>` | Token xác thực (áp dụng cho các API yêu cầu đăng nhập) |

---

## 2. Chuẩn hoá Số điện thoại (Phone Normalization)

Quy tắc định dạng số điện thoại của hệ thống Tammi:
- Chỉ giữ lại các chữ số.
- Nếu bắt đầu bằng mã quốc gia `84` và có độ dài $\ge 11$, chuyển tiền tố `84` thành `0`. Ví dụ: `+84912345678` $\rightarrow$ `0912345678`.

---

## 3. Danh sách Các Điểm cuối (Endpoints)

### 3.1. Kiểm tra Người dùng Tồn tại

Kiểm tra xem một số điện thoại đã được đăng ký tài khoản trên Tammi hay chưa.

- **Phương thức**: `GET`
- **Đường dẫn**: `/user/check-user-exist`
- **Yêu cầu xác thực**: Không (`auth: false`)
- **Query Parameters**:
  - `username` *(string, bắt buộc)*: Số điện thoại người dùng đã chuẩn hoá (ví dụ `0912345678`).

#### Phản hồi mẫu (Thành công):
```json
{
  "success": true,
  "data": true,
  "message": "User exist"
}
```

---

### 3.2. Yêu cầu Gửi mã OTP Đăng nhập

Gửi mã xác thực OTP qua tin nhắn SMS đến số điện thoại. 

> [!WARNING]
> Trên môi trường Production của Tammi (`api.tammi.vn`), endpoint này được bảo vệ bởi Cloudflare Turnstile captcha. Cần truyền token Turnstile hợp lệ qua header `cf-token`.

- **Phương thức**: `POST`
- **Đường dẫn**: `/auth/request-otp`
- **Yêu cầu xác thực**: Không (`auth: false`)
- **Headers bổ sung**:
  - `cf-token` *(string)*: Cloudflare Turnstile verification token.
- **Request Body**:
```json
{
  "username": "0912345678",
  "scope": "login"
}
```

#### Phản hồi mẫu (Thành công):
```json
{
  "success": true,
  "data": {
    "length": 6,
    "expired": 120
  },
  "message": "OTP sent successfully"
}
```

---

### 3.3. Đăng nhập bằng OTP trên Web

Xác thực mã OTP nhận được từ SMS để lấy cặp Access Token & Refresh Token.

- **Phương thức**: `POST`
- **Đường dẫn**: `/auth/login-webapp-otp`
- **Yêu cầu xác thực**: Không (`auth: false`)
- **Headers bổ sung**:
  - `Os-Type`: `web`
- **Request Body**:
```json
{
  "username": "0912345678",
  "otpCode": "123456"
}
```

#### Phản hồi mẫu (Thành công):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "expires_in": 1296000,
    "refresh_expires_in": 7776000,
    "token_type": "Bearer"
  }
}
```
*(Ghi chú: `expires_in` thường là 15 ngày tương đương 1,296,000 giây; `refresh_expires_in` thường là 90 ngày tương đương 7,776,000 giây).*

---

### 3.4. Đăng nhập bằng Mật khẩu

Sử dụng khi tài khoản Tammi đã thiết lập mật khẩu trong ứng dụng di động Tammi.

- **Phương thức**: `POST`
- **Đường dẫn**: `/auth/login-password`
- **Yêu cầu xác thực**: Không (`auth: false`)
- **Request Body**:
```json
{
  "username": "0912345678",
  "password": "UserPasswordHere"
}
```

#### Phản hồi mẫu (Thành công):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "expires_in": 1296000,
    "refresh_expires_in": 7776000,
    "token_type": "Bearer"
  }
}
```

---

### 3.5. Làm mới Access Token (Token Refresh & Rotation)

Mỗi lần làm mới, máy chủ sẽ trả về một Access Token mới VÀ một Refresh Token mới (Refresh Token Rotation). Việc lưu lại Refresh Token mới là bắt buộc.

- **Phương thức**: `POST`
- **Đường dẫn**: `/auth/refresh-webapp-token`
- **Yêu cầu xác thực**: Không cần Authorization header (gửi token trong body)
- **Request Body**:
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

#### Phản hồi mẫu (Thành công):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...NEW...",
    "refresh_token": "eyJhbGciOi...NEW_ROTATED...",
    "expires_in": 1296000,
    "refresh_expires_in": 7776000
  }
}
```

---

### 3.6. Lấy Thông tin Tài khoản (User Profile)

Lấy thông tin cá nhân của người dùng hiện tại, bao gồm cả `zegoId` để xác thực vào ZEGOCLOUD ZIM chat engine.

- **Phương thức**: `GET`
- **Đường dẫn**: `/user/user-info`
- **Yêu cầu xác thực**: Có (`Authorization: Bearer <access_token>`)

#### Phản hồi mẫu:
```json
{
  "success": true,
  "data": {
    "id": 123456,
    "username": "0912345678",
    "phoneNumber": "0912345678",
    "nickname": "Nguyễn Văn A",
    "zegoId": "0912345678_vtt_xyz",
    "imageUrl": "https://cdn.vietteltammi.vn/avatar/user123.jpg",
    "status": 1
  }
}
```

---

### 3.7. Tạo Token ZEGO Chat (ZEGO ZIM Token)

Yêu cầu Tammi sinh token xác thực để ZIM Chat Engine kết nối vào cụm máy chủ realtime của ZEGOCLOUD. Token này có thời hạn 24 giờ (86,400 giây).

- **Phương thức**: `POST`
- **Đường dẫn**: `/meeting/zego/token`
- **Yêu cầu xác thực**: Có (`Authorization: Bearer <access_token>`)
- **Request Body**:
```json
{
  "userId": "0912345678_vtt_xyz"
}
```

#### Phản hồi mẫu:
```json
{
  "success": true,
  "data": {
    "data": "04AAAAAgBxxxxxx...base64_zego_token...",
    "expireTime": 1731234567
  }
}
```

---

### 3.8. Lấy Danh bạ Liên hệ (Contacts)

Lấy danh sách người liên hệ / bạn bè trên Tammi.

- **Phương thức**: `GET`
- **Đường dẫn**: `/user/contacts`
- **Yêu cầu xác thực**: Có (`Authorization: Bearer <access_token>`)

#### Phản hồi mẫu:
```json
{
  "success": true,
  "data": [
    {
      "id": 1101,
      "contactName": "Trần Thị B",
      "contactPhoneNumber": "0987654321",
      "zegoId": "0987654321_vtt_abc",
      "avatar": "https://cdn.vietteltammi.vn/avatar/user456.jpg"
    }
  ]
}
```

---

### 3.9. Đăng xuất Phiên làm việc (Logout)

Huỷ phiên làm việc và thu hồi Refresh Token trên máy chủ.

- **Phương thức**: `POST`
- **Đường dẫn**: `/auth/logout-webapp`
- **Yêu cầu xác thực**: Không bắt buộc Authorization header
- **Request Body**:
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

#### Phản hồi mẫu:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 4. Quy tắc Chuyển hướng Host Media (CDN Media Rewrite)

Khi nhận tin nhắn đa phương tiện từ Tammi qua giao thức ZIM hoặc REST API, các đường dẫn URL thường trả về dưới tên miền `*.tammi.vn`. Tuy nhiên, máy chủ tệp tin của Viettel yêu cầu tải từ tên miền `*.vietteltammi.vn`. Nếu không đổi tên miền, yêu cầu tải file sẽ bị lỗi (HTTP 403 / 404).

**Quy tắc Regex Rewrite:**
```javascript
function rewriteHost(url) {
  if (typeof url !== "string" || !url) return url;
  return url.replace(
    /^(https?:\/\/(?:[^/?#@]*@)?)((?:[^/?#:]+\.)?tammi\.vn)(?=[:/?#]|$)/i,
    (_m, pre, host) => `${pre}${host.slice(0, host.length - "tammi.vn".length)}vietteltammi.vn`
  );
}
```

**Ví dụ:**
- `https://cdn.tammi.vn/media/image.png` $\rightarrow$ `https://cdn.vietteltammi.vn/media/image.png`
- `https://access.tammi.vn/files/doc.pdf` $\rightarrow$ `https://access.vietteltammi.vn/files/doc.pdf`

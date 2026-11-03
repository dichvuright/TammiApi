# 03. Local Bridge HTTP & SSE API

Máy chủ **Tammi Bridge** (`bridge/server.js`) chạy tại máy người dùng như một proxy trung gian, chuyển đổi giữa giao thức nhị phân ZEGO ZIM sang REST API đơn giản và Server-Sent Events (SSE) để các Bot, AI Agent (Hermes Agent) hoặc ứng dụng bên ngoài dễ dàng tích hợp.

- **Địa chỉ mặc định**: `http://127.0.0.1:8788`
- **Biến môi trường tùy chỉnh**:
  - `TAMMI_BRIDGE_HOST` (Mặc định: `127.0.0.1`)
  - `TAMMI_BRIDGE_PORT` (Mặc định: `8788`)
  - `TAMMI_BRIDGE_TOKEN` (Khóa bảo vệ, nếu thiết lập sẽ yêu cầu header `x-bridge-token`)
- **Định dạng dữ liệu**: JSON

---

## 1. Cơ chế Bảo vệ (Authentication Header)

Nếu môi trường có cấu hình `TAMMI_BRIDGE_TOKEN`, mọi yêu cầu HTTP gửi đến Bridge bắt buộc phải có header:
```http
x-bridge-token: <TAMMI_BRIDGE_TOKEN>
```
Nếu thiếu hoặc sai mã token, Bridge sẽ trả về mã lỗi HTTP `401`:
```json
{
  "success": false,
  "error": "bad bridge token"
}
```

---

## 2. Server-Sent Events (SSE) Stream: `GET /events`

Cổng nhận luồng sự kiện thời gian thực (Real-time Event Stream) theo chuẩn W3C EventSource.

- **Endpoint**: `GET /events`
- **Headers phản hồi**:
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  ```
- **Hỗ trợ kết nối lại (Reconnection)**: Client có thể truyền header `last-event-id` để phát lại các sự kiện trong bộ đệm vòng (Ring buffer lưu 500 sự kiện gần nhất).
- **Heartbeat định kỳ**: Cứ mỗi 15 giây, máy chủ gửi bình luận `: hb\n\n` để giữ cho kết nối không bị timeout.

### 2.1. Sự kiện `event: message`
Được phát ra mỗi khi có tin nhắn mới (nhóm hoặc cá nhân).
```http
id: 101
event: message
data: {"messageId":"4829104812","localMessageId":"...","messageSeq":42,"conversationId":"0987654321_vtt_abc","conversationType":"peer","conversationName":"Trần Thị B","senderId":"0987654321_vtt_abc","senderName":"Trần Thị B","isSelf":false,"sentByBridge":false,"isOffline":false,"timestamp":1731234567890,"type":"text","text":"Xin chào bot!","media":[],"replyTo":null}
```

### 2.2. Sự kiện `event: status`
Được phát ra khi trạng thái kết nối hoặc sức khoẻ bridge thay đổi.
```http
id: 102
event: status
data: {"ok":true,"loggedIn":true,"sessionDead":false,"connectionState":"connected","lastError":null,"since":1731230000000,"sdkVersion":"3.2.0.vtt","user":{"zegoId":"0912345678_vtt_xyz","name":"Nguyễn Văn A"},"tokenExpiresAt":"2026-11-18T10:00:00.000Z","refreshTokenExpiresAt":"2027-02-01T10:00:00.000Z"}
```

### 2.3. Sự kiện `event: session_dead`
Được phát ra khi phiên đăng nhập bị hủy (ví dụ: bị đăng xuất, bị đá ra do đăng nhập web cùng tài khoản).
```http
id: 103
event: session_dead
data: {"code":"kicked_out","message":"Tài khoản Tammi vừa đăng nhập ở nơi khác..."}
```

---

## 3. Danh sách REST Endpoints

### 3.1. Kiểm tra Sức khoẻ Hệ thống: `GET /health`

- **Phương thức**: `GET`
- **Đường dẫn**: `/health`

#### Phản hồi mẫu:
```json
{
  "ok": true,
  "loggedIn": true,
  "sessionDead": false,
  "connectionState": "connected",
  "lastError": null,
  "since": 1731230000000,
  "sdkVersion": "3.2.0.vtt",
  "user": {
    "zegoId": "0912345678_vtt_xyz",
    "name": "Nguyễn Văn A"
  },
  "tokenExpiresAt": "2026-11-18T10:00:00.000Z",
  "refreshTokenExpiresAt": "2027-02-01T10:00:00.000Z",
  "bridge": "hermes-tammi",
  "hasCredentials": true
}
```

---

### 3.2. Lấy Danh sách Cuộc trò chuyện: `GET /conversations`

- **Phương thức**: `GET`
- **Đường dẫn**: `/conversations`
- **Query Parameters**:
  - `count` *(integer, tùy chọn, mặc định: 100)*: Số lượng hội thoại tối đa cần lấy.

#### Phản hồi mẫu:
```json
{
  "success": true,
  "conversations": [
    {
      "id": "group_12345",
      "type": "group",
      "name": "Nhóm Dự Án Hermes",
      "unread": 0,
      "lastMessageAt": 1731234500000,
      "isOA": false,
      "isDocument": false
    },
    {
      "id": "0987654321_vtt_abc",
      "type": "peer",
      "name": "Trần Thị B",
      "unread": 2,
      "lastMessageAt": 1731234567890,
      "isOA": false,
      "isDocument": false
    }
  ]
}
```

---

### 3.3. Lấy Danh bạ Phân loại: `GET /contacts`

Lấy toàn bộ danh bạ đã được lọc và phân loại theo mục đích sử dụng.

- **Phương thức**: `GET`
- **Đường dẫn**: `/contacts`

#### Phản hồi mẫu:
```json
{
  "success": true,
  "friends": [
    { "id": "0987654321_vtt_abc", "name": "Trần Thị B" }
  ],
  "groups": [
    { "id": "group_12345", "name": "Nhóm Dự Án Hermes" }
  ],
  "selfChats": [
    { "id": "group_99999", "name": "Nhóm Riêng Của Tôi (Bot Channel)" }
  ],
  "oa": [
    { "id": "@RBT#OA_123", "name": "Viettel Telecom" }
  ]
}
```
*(Ghi chú: `selfChats` là các nhóm chat chỉ có duy nhất 1 thành viên là chính tài khoản của bạn, cực kỳ lý tưởng để dùng làm kênh chat riêng tư với Bot).*

---

### 3.4. Gửi Tin Nhắn Văn Bản: `POST /send`

Tự động phân tách nếu nội dung tin nhắn vượt quá 4,800 bytes.

- **Phương thức**: `POST`
- **Đường dẫn**: `/send`
- **Request Body**:
```json
{
  "conversationId": "0987654321_vtt_abc",
  "conversationType": "peer",
  "text": "Chào bạn, tôi là AI bot trên nền tảng Tammi!",
  "replyTo": "4829104812"
}
```
*Ghi chú*:
- `conversationType`: `"peer"`, `"group"`, hoặc bỏ trống để Bridge tự dò tìm.
- `replyTo`: `messageId` của tin nhắn cần trả lời (tùy chọn).

#### Phản hồi mẫu:
```json
{
  "success": true,
  "messageIds": ["4829105001"],
  "messageId": "4829105001"
}
```

---

### 3.5. Gửi Tệp Tin / Đa Phương Tiện: `POST /send-file`

- **Phương thức**: `POST`
- **Đường dẫn**: `/send-file`
- **Request Body**:
```json
{
  "conversationId": "0987654321_vtt_abc",
  "conversationType": "peer",
  "path": "C:\\path\\to\\image.png",
  "kind": "image",
  "caption": "Ảnh kết quả phân tích",
  "fileName": "custom_name.png"
}
```
*Ghi chú*:
- `kind`: `"image"`, `"video"`, `"audio"`, `"file"`, hoặc `"auto"` (mặc định Bridge tự nhận diện theo đuôi file).
- `caption`: Tin nhắn chữ đính kèm theo ngay sau file.

#### Phản hồi mẫu:
```json
{
  "success": true,
  "messageId": "4829105020",
  "kind": "image",
  "captionMessageId": "4829105021"
}
```

---

### 3.6. Gửi Trạng thái Soạn thảo: `POST /typing`

- **Phương thức**: `POST`
- **Đường dẫn**: `/typing`
- **Request Body**:
```json
{
  "conversationId": "0987654321_vtt_abc",
  "conversationType": "peer",
  "stop": false
}
```
*Ghi chú*: Đặt `"stop": true` để tắt tín hiệu soạn thảo. Bridge có sẵn debounce (bỏ qua nếu gọi liên tiếp trong vòng dưới 9 giây).

#### Phản hồi mẫu:
```json
{
  "success": true,
  "ok": true
}
```

---

### 3.7. Đánh dấu Đã Đọc: `POST /read`

- **Phương thức**: `POST`
- **Đường dẫn**: `/read`
- **Request Body**:
```json
{
  "conversationId": "0987654321_vtt_abc",
  "conversationType": "peer"
}
```

#### Phản hồi mẫu:
```json
{
  "success": true,
  "ok": true
}
```

---

### 3.8. Đăng Nhập Lại / Tải Lại Phiên: `POST /relogin`

Tải lại dữ liệu phiên trong file `credentials.json` và kết nối lại ZIM Client mà không cần restart tiến trình Bridge.

- **Phương thức**: `POST`
- **Đường dẫn**: `/relogin`

#### Phản hồi mẫu:
```json
{
  "success": true,
  "ok": true,
  "loggedIn": true,
  "connectionState": "connected"
}
```

---

### 3.9. Tắt Máy Chủ Bridge: `POST /shutdown`

- **Phương thức**: `POST`
- **Đường dẫn**: `/shutdown`

#### Phản hồi mẫu:
```json
{
  "success": true
}
```

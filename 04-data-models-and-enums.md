# 04. Data Models & Bảng Tra Cứu Enums

Tổng hợp cấu trúc dữ liệu chuẩn hóa, đối tượng dữ liệu lưu trữ và các bảng mã định danh (Enums) của hệ sinh thái Tammi.

---

## 1. Cấu trúc Đối tượng Tin nhắn Chuẩn hoá (Normalized Message)

Đối tượng được Bridge chuẩn hoá và phát ra qua sự kiện SSE `event: message`:

```typescript
interface NormalizedMessage {
  // Định danh
  messageId: string;              // ID tin nhắn trên máy chủ ZIM
  localMessageId: string;         // ID tin nhắn cục bộ lúc gửi
  messageSeq: number;             // Số thứ tự tin nhắn trong hội thoại

  // Hội thoại
  conversationId: string;         // ID người gửi hoặc ID nhóm
  conversationType: "peer" | "group"; // Loại cuộc trò chuyện
  conversationName: string;       // Tên người nhận/nhóm

  // Người gửi
  senderId: string;               // zegoId người gửi
  senderName: string;             // Tên hiển thị người gửi
  isSelf: boolean;                // Tin nhắn do chính tài khoản này gửi?
  sentByBridge: boolean;          // Tin nhắn do Bridge gửi ra (để chống loop bot)?

  // Trạng thái & Thời gian
  isOffline: boolean;             // Tin nhắn nhận được lúc offline?
  timestamp: number;              // Thời gian Unix Timestamp (milliseconds)

  // Nội dung
  type: "text" | "image" | "file" | "audio" | "video" | "multiple" | "custom" | "combine" | "unknown";
  subType: number;                // Mã subtype nếu type là "custom"
  text: string;                   // Nội dung văn bản (đã trích xuất)
  media: MediaAttachment[];       // Danh sách tệp đính kèm

  // Tương tác & Trả lời
  mentions: string[];             // Danh sách zegoId được tag @tên
  isMentionAll: boolean;          // Có tag @All không?
  mentionedUsers: Record<string, string>; // Bản đồ ID -> Tên người được mention
  isForward: boolean;             // Tin nhắn được chuyển tiếp?
  replyTo: ReplyInfo | null;      // Thông tin tin nhắn được reply
}

interface MediaAttachment {
  kind: "image" | "file" | "audio" | "video";
  url: string;                    // Đường dẫn URL đã được rewrite sang *.vietteltammi.vn
  fileName: string;               // Tên file gốc
  size: number;                   // Kích thước (bytes)
  ext: string;                    // Đuôi mở rộng (jpg, png, pdf, mp3...)
  duration: number;               // Thời lượng nếu là audio/video (giây)
}

interface ReplyInfo {
  messageId: string;              // ID tin nhắn gốc
  senderId: string;               // zegoId người gửi tin nhắn gốc
  text: string;                   // Trích đoạn nội dung tin nhắn gốc (tối đa 500 ký tự)
}
```

---

## 2. Cấu trúc File Lưu trữ Phiên Đăng Nhập (`credentials.json`)

Vị trí mặc định: `~/.hermes-tammi/credentials.json` (quyền hạn file `0600`):

```json
{
  "device_id": "8f8a14b2-03f1-4ab0-b32c-b03a74ef4b79",
  "phone": "0912345678",
  "ip": "14.225.x.x",
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "expiry_time_seconds": 1732531200,
  "refresh_expiry_time_seconds": 1739011200,
  "updatedAt": "2026-11-03T15:20:00.000Z",
  "user": {
    "zegoId": "0912345678_vtt_xyz",
    "nickname": "Nguyễn Văn A",
    "phoneNumber": "0912345678",
    "imageUrl": "https://cdn.vietteltammi.vn/avatar/user123.jpg"
  }
}
```

---

## 3. Bảng Tra cứu Enums

### 3.1. Loại Cuộc trò chuyện (Conversation Types)
| Mã Số (`code`) | Chuỗi Tương Ứng | Ý Nghĩa |
|---|---|---|
| `0` | `peer`, `user`, `dm` | Trò chuyện cá nhân |
| `1` | `room` | Phòng họp trực tuyến (Meeting Room) |
| `2` | `group` | Nhóm trò chuyện |
| `3` | `channel` | Kênh thông tin / Kênh broadcast |

### 3.2. Loại Tin nhắn ZIM (`ZIMMessageType`)
| Mã Số | Tên Constant | Ý Nghĩa |
|---|---|---|
| `1` | `Text` | Văn bản thông thường |
| `2` | `Command` | Lệnh điều khiển nhị phân |
| `10` | `Multiple` | Đa nội dung (Text + Media) |
| `11` | `Image` | Hình ảnh |
| `12` | `File` | Tài liệu, tệp tin nhị phân |
| `13` | `Audio` | Tin nhắn thoại |
| `14` | `Video` | Video |
| `31` | `Revoke` | Thu hồi tin nhắn |
| `32` | `Tips` | Tin nhắn gợi ý / trạng thái hệ thống |
| `100` | `Combine` | Tin nhắn gộp chuyển tiếp |
| `200` | `Custom` | Tin nhắn mở rộng đặc thù của Tammi |

### 3.3. Phân loại Tin nhắn Mở rộng Tammi (`Custom SubTypes`)
| SubType Code | Nhãn Hiển Thị | Diễn Giải Chi Tiết |
|---|---|---|
| `5` | `Danh thiếp` | Thẻ chia sẻ thông tin danh bạ người dùng |
| `16`, `17` | `Bình chọn` | Khảo sát ý kiến trong nhóm chat |
| `19` | `Mời họp` | Lời mời tham gia phiên họp Viettel Meeting |
| `20` | `Cuộc gọi` | Lịch sử cuộc gọi đến / nhỡ |
| `22` | `Tin nhắn tự huỷ` | Tin nhắn bí mật tự động xóa sau khoảng thời gian |
| `33` | `Lời mời vào nhóm` | Tin nhắn mời gia nhập nhóm chat mới |
| `68` | `Chuyển khoản` | Thông báo gửi nhận tiền Viettel Money / ViettelPay |
| `86` | `Chuyển khoản (QR)` | Giao dịch thanh toán chuyển khoản qua mã QR |
| `99`, `111` | *(Bot Text / Markdown)* | Nội dung phản hồi dạng Markdown của Bot |
| `196`, `197` | `Vị trí` | Chia sẻ tọa độ GPS tĩnh |
| `198` | `Vị trí trực tiếp` | Chia sẻ lộ trình di chuyển trực tiếp |
| `199` | `Sticker` | Nhãn dán hoạt hình |
| `200` | `Thông báo` | Thông báo sự kiện phòng / nhóm |
| `104` - `109` | `OA` | Tin nhắn từ Official Account doanh nghiệp |

### 3.4. Sự kiện Trạng thái Kết nối ZIM (`CONN_EVENT`)
| Mã Số | Sự Kiện | Ý Nghĩa |
|---|---|---|
| `0` | `Success` | Đăng nhập và duy trì kết nối thành công |
| `1` | `ActiveLogin` | Đang trong quá trình chủ động đăng nhập |
| `2` | `LoginTimeout` | Hết thời gian chờ kết nối máy chủ |
| `3` | `LoginInterrupted` | Bị gián đoạn mạng đột ngột |
| `4` | `KickedOut` | Bị đá văng do đăng nhập trên thiết bị web khác |
| `5` | `TokenExpired` | ZEGO Token đã hết hạn |
| `6` | `Unregistered` | Tài khoản bị vô hiệu hóa hoặc không tồn tại |

### 3.5. Nhận diện Tài khoản Official Account (OA)
Các tài khoản tự động, CSKH hoặc kênh doanh nghiệp được phân biệt theo quy tắc:
```javascript
function isOfficialAccount(id) {
  return typeof id === "string" && (id.startsWith("@") || id === "Tammi");
}
```
*(Quy tắc: ID bắt đầu bằng ký tự `@` ví dụ `@RBT#OA_...` hoặc chính là bot trợ lý mặc định `Tammi`).*

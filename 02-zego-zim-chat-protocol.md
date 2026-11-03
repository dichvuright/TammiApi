# 02. Giao thức Chat ZEGO ZIM SDK (Tammi Realtime Protocol)

Tammi sử dụng nền tảng nhắn tin thời gian thực dựa trên **ZEGOCLOUD ZIM SDK**, được Viettel tuỳ biến riêng (phiên bản `3.2.0.vtt`). Giao thức này chạy qua WebSocket nhị phân có mã hoá bảo mật.

---

## 1. Thông số Cốt lõi của ZIM Chat Engine

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| **AppID** | `1090612485` | ZEGO App ID độc quyền cho hệ thống Tammi của Viettel |
| **SDK Version** | `3.2.0.vtt` | Tự động bóc tách từ mã nguồn bundle của `tammi.vn` |
| **Cổng giao tiếp** | WebSocket (WSS) | Kết nối đến hạ tầng đám mây ZEGOCLOUD |
| **Hạn mức độ dài tin** | 4,800 bytes UTF-8 | Hạn mức an toàn (Giới hạn tối đa của web app là 5,000 bytes) |
| **Thời hạn ZEGO Token** | 24 giờ | Phải gọi `renewToken` trước khi hết hạn |

---

## 2. Khởi tạo & Cấu hình Nâng cao

```javascript
// Khởi tạo ZIM Instance
const zim = ZIM.create({ appID: 1090612485 });

// Bật các tính năng tìm kiếm mờ (Fuzzy Search)
zim.setAdvancedConfig("zim_enable_message_fuzzy_search", "1");
zim.setAdvancedConfig("zim_enable_conv_name_fuzzy_search", "1");
```

---

## 3. Quản lý Kết nối & Vòng đời Đăng nhập

### 3.1. Đăng nhập (`login`)
```javascript
await zim.login(selfId, {
  userName: "",
  token: zegoToken,              // Token lấy từ REST API /meeting/zego/token
  customStatus: "online",
  isOfflineLogin: false,
  customStatusDuration: 0
});
```

### 3.2. Gia hạn Token (`renewToken`)
ZEGO ZIM Token có hạn 24 giờ. Khi SDK bắn sự kiện `tokenWillExpire`, client cần gọi REST API Tammi để xin token mới và cập nhật cho ZIM:
```javascript
zim.on("tokenWillExpire", async (z, data) => {
  const { token } = await tammiApi.zegoToken(selfId);
  await zim.renewToken(token);
});
```

### 3.3. Các Trạng thái Kết nối (`connectionStateChanged`)
- `0`: `disconnected` (Mất kết nối)
- `1`: `connecting` (Đang kết nối)
- `2`: `connected` (Đã kết nối thành công)
- `3`: `reconnecting` (Đang tự động kết nối lại)

**Bảng mã Sự kiện Kết nối (`CONN_EVENT`):**
| Mã | Tên sự kiện | Ý nghĩa |
|---|---|---|
| `0` | `Success` | Kết nối thành công |
| `1` | `ActiveLogin` | Đăng nhập chủ động |
| `2` | `LoginTimeout` | Quá thời gian đăng nhập |
| `3` | `LoginInterrupted` | Kết nối bị gián đoạn giữa chừng |
| `4` | `KickedOut` | Bị đá ra do tài khoản đăng nhập trên tab trình duyệt hoặc máy khác |
| `5` | `TokenExpired` | ZEGO Token đã hết hạn |
| `6` | `Unregistered` | Tài khoản chưa được đăng ký trong hệ thống ZIM |

---

## 4. Các Loại Hội Thoại (Conversation Types)

| Mã số (`code`) | Loại hội thoại | Diễn giải |
|---|---|---|
| `0` | `peer` | Chat 1 - 1 (Cá nhân với cá nhân) |
| `1` | `room` | Phòng họp trực tuyến (Meeting room) |
| `2` | `group` | Nhóm chat thông thường |
| `3` | `channel` | Kênh thông báo / Nhóm kênh |

---

## 5. Các Loại Tin Nhắn (Message Types & Subtypes)

### 5.1. Bảng mã Loại Tin Nhắn Chính (`MSG`)

| Mã (`type`) | Tên | Diễn giải |
|---|---|---|
| `1` | `Text` | Tin nhắn văn bản thuần túy |
| `2` | `Command` | Lệnh nội bộ (dùng cho Typing indicator, heartbeat...) |
| `10` | `Multiple` | Tin nhắn đa thành phần (vừa có chữ vừa có ảnh/file) |
| `11` | `Image` | Tin nhắn hình ảnh |
| `12` | `File` | Tệp tin đính kèm |
| `13` | `Audio` | Ghi âm giọng nói (Voice message) |
| `14` | `Video` | Video |
| `31` | `Revoke` | Thu hồi tin nhắn |
| `32` | `Tips` | Tin nhắn hệ thống / Thông báo phòng |
| `100` | `Combine` | Tin nhắn chuyển tiếp gộp (Forward combine) |
| `200` | `Custom` | Tin nhắn tuỳ biến đặc biệt (xem bảng Subtypes bên dưới) |

### 5.2. Bảng mã Phân loại Tin nhắn Tuỳ biến (`Custom SubTypes`)

Tammi mã hoá các tính năng đặc thù thông qua `type: 200` và `subType`:

| SubType | Tên tính năng | Nội dung dữ liệu trong `message` |
|---|---|---|
| `5` | Danh thiếp (Contact Card) | JSON chứa `username`, `phoneNumber`, avatar... |
| `16`, `17` | Bình chọn (Poll) | Dữ liệu cuộc khảo sát / bình chọn |
| `19` | Mời họp (Meeting Invite) | Thông tin phòng họp Viettel Meeting |
| `20` | Cuộc gọi (Call Notice) | Thông báo cuộc gọi thoại / video |
| `22` | Tin nhắn tự huỷ (Self-destruct) | Tin nhắn có thời gian đếm ngược tự xoá |
| `33` | Lời mời vào nhóm | Lời mời tham gia nhóm chat |
| `68` | Chuyển khoản ViettelPay | Thông báo chuyển tiền thành công |
| `86` | Chuyển khoản qua mã QR | Thông báo giao dịch quét mã QR |
| `99` | Tin nhắn Bot / Markdown | Nội dung định dạng Markdown cho Bot Tammi |
| `111` | Tin nhắn Bot trả lời tự động | Text trả về từ trợ lý thông minh |
| `196`, `197` | Chia sẻ Vị trí (Location) | Toạ độ GPS kinh độ / vĩ độ |
| `198` | Vị trí trực tiếp (Live Location) | Chia sẻ vị trí động theo thời gian thực |
| `199` | Nhãn dán (Sticker) | ID sticker và bộ nhãn dán |
| `200` | Thông báo hệ thống | Thông báo cập nhật từ nền tảng |
| `104` - `109` | Official Account (OA) | Tin nhắn tiếp thị, CSKH từ các kênh doanh nghiệp |

---

## 6. Gửi Tin Nhắn & Cấu trúc Push Notification

### 6.1. Quy chuẩn Phân tách Kích thước Tin nhắn (Byte Splitting)
Nếu tin nhắn văn bản vượt quá 4,800 bytes, hệ thống phải tự động cắt thành các phần nhỏ tại các vị trí ngắt dòng `\n` hoặc khoảng trắng ` ` để đảm bảo toàn vẹn:

```javascript
function splitByBytes(text, maxBytes = 4800) {
  const out = [];
  let rest = String(text || "");
  while (Buffer.byteLength(rest, "utf8") > maxBytes) {
    let lo = 0, hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (Buffer.byteLength(rest.slice(0, mid), "utf8") <= maxBytes) lo = mid;
      else hi = mid - 1;
    }
    let cut = lo;
    const window = rest.slice(0, lo);
    const nl = window.lastIndexOf("\n");
    const sp = window.lastIndexOf(" ");
    if (nl > lo * 0.5) cut = nl + 1;
    else if (sp > lo * 0.5) cut = sp + 1;
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest.trim()) out.push(rest);
  return out;
}
```

### 6.2. Cấu hình Push Notification di động (`PushConfig`)
Để ứng dụng Tammi trên điện thoại của người nhận hiển thị thông báo đẩy (APNs trên iOS và FCM trên Android), payload gửi đi bắt buộc phải chứa `pushConfig` với cấu trúc sau:

```javascript
const pushConfig = {
  title: isGroup ? conversationName : senderName,
  content: previewText,
  payload: JSON.stringify({
    id: convId,
    conversation_id: convId,
    lastMessagePreview: "",
    lastMessageAt: null,
    unreadCount: undefined,
    isPinned: false,
    isMuted: false,
    conversation_avatar: isGroup ? undefined : senderAvatar,
    type: isGroup ? "group" : "peer",
    conversation_type: code,
    mentionedMe: false,
    mentionedAll: false,
    conversation_sender_id: senderId,
    conversation_sender_name: senderName,
    conversation_sender_avatar: senderAvatar,
    name: conversationName,
    conversation_name: conversationName,
    originalName: conversationName,
    action: "message",
    relatedUsers: mentionedUsers,
    attachment: attachmentInfo // Tuỳ chọn nếu gửi file
  }),
  badgeIncrement: 1,
  enableBadge: true,
  resourcesID: "appviettel_sms", // Resource ID thông báo đẩy của Viettel Tammi
  threadID: "",
  voIPConfig: {
    iOSVoIPHasVideo: false,
    iOSVoIPHandleType: 1,
    iOSVoIPHandleValue: ""
  }
};
```

### 6.3. Gửi Tin Nhắn Trả Lời (`replyMessage`)
Khi reply một tin nhắn cụ thể, truyền đối tượng tin nhắn gốc vào API:
```javascript
await zim.replyMessage(newMessage, originalZimMessage, sendConfig, {});
```

### 6.4. Gửi File Đa Phương Tiện
Sử dụng hàm `zim.sendMessage`:
- Loại: `11` (Image), `12` (File), `13` (Audio), `14` (Video).
- Đưa dữ liệu dạng `File` object thông qua Polyfill Node.js.
- Chú ý: Ứng dụng Tammi trên di động không hỗ trợ phát inline âm thanh đuôi `.ogg` hoặc `.opus`, do đó các tệp âm thanh này phải được gửi dưới dạng `kind: "file"` hoặc convert sang `.m4a` / `.mp3`.

---

## 7. Trạng thái Đang Soạn Thảo (Typing Indicator)

Tammi gửi tín hiệu đang gõ phím thông qua tin nhắn điều khiển (`type: 2 - Command`):

```javascript
const payloadString = stop ? "stop_typing" : "typing";
const payload = new Uint8Array([...payloadString].map((c) => c.charCodeAt(0)));

await zim.sendMessage(
  { type: 2, message: payload },
  conversationId,
  conversationTypeCode,
  { priority: 3 }
);
```

---

## 8. Các API Truy Vấn Dữ Liệu trên ZIM

- `queryConversationList({ count, nextConversation })`: Lấy danh sách hội thoại gần nhất kèm phân trang cursor.
- `queryGroupList()`: Lấy danh sách các nhóm chat người dùng đang tham gia.
- `queryGroupInfo(groupId)`: Lấy thông tin chi tiết tên nhóm, avatar, cấu hình nhóm.
- `queryGroupMemberCount(groupId)`: Đếm số lượng thành viên trong nhóm.
- `clearConversationUnreadMessageCount(convId, code)`: Xóa số tin chưa đọc trên giao diện.
- `sendConversationMessageReceiptRead(convId, code)`: Gửi biên nhận đã đọc tin nhắn cho đối phương.

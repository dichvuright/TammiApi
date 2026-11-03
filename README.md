# TammiApi - Hệ thống Tài liệu & Thư viện Code Toàn bộ API Tammi (Viettel Messenger)

Kho lưu trữ này tổng hợp toàn bộ các API của nền tảng **Tammi** (ứng dụng nhắn tin của Viettel, `tammi.vn`), bao gồm tài liệu kỹ thuật chi tiết và bộ mã nguồn Client SDK hoàn chỉnh (Node.js & Python).

---

## 1. Kiến trúc Hệ thống API Tammi

Kiến trúc kết nối và tương tác với Tammi gồm 3 tầng API chính:

```mermaid
flowchart TD
    subgraph ClientLayer [Tầng Ứng dụng & Bot]
        ClientApp["Hermes Agent / Bot / Khách hàng"]
    end

    subgraph BridgeLayer [Tầng Local Bridge (Node.js)]
        LocalBridge["Tammi Bridge Server\n(http://127.0.0.1:8788)"]
        ZimSDK["ZEGO ZIM SDK\n(Phiên bản 3.2.0.vtt Viettel)"]
        CredStore["Credential Store\n(credentials.json)"]
    end

    subgraph TammiCloud [Tầng Máy chủ Tammi & Viettel Cloud]
        TammiAPI["Tammi Backend REST API\n(https://api.tammi.vn/api/v1)"]
        ZegoGateway["ZEGO ZIM WebSocket Gateway\n(AppID: 1090612485)"]
        MediaCDN["Viettel CDN Media\n(*.vietteltammi.vn)"]
    end

    ClientApp <-->|HTTP REST & SSE Events| LocalBridge
    LocalBridge <-->|REST: Auth / Info / Token / Contacts| TammiAPI
    LocalBridge <--> ZimSDK
    ZimSDK <-->|WebSocket nhị phân mã hoá: Chat / Realtime| ZegoGateway
    LocalBridge -.->|Tải / Gửi file đa phương tiện| MediaCDN
    LocalBridge <--> CredStore
```

---

## 2. Danh mục Tài liệu trong Thư mục này

1. [**01. Tammi Backend REST API**](./01-tammi-backend-rest-api.md)
   - Chi tiết toàn bộ REST API của máy chủ Tammi (`https://api.tammi.vn/api/v1`).
   - Xác thực: OTP, mật khẩu, phiên trình duyệt, cơ chế làm mới Token tự động (Token Rotation).
   - Quản lý tài khoản, lấy ZEGO Token, danh bạ liên hệ, và quy tắc Rewrite CDN Media.

2. [**02. Giao thức Chat ZEGO ZIM SDK**](./02-zego-zim-chat-protocol.md)
   - Giao thức tin nhắn thời gian thực qua ZEGO ZIM SDK (`3.2.0.vtt`) với AppID `1090612485`.
   - Vòng đời kết nối WebSocket, gia hạn Token 24h.
   - Các loại tin nhắn: Text, Media (Ảnh, Video, Audio, File), Thẻ liên lạc, Chuyển khoản, Vị trí, Bình chọn, OA...
   - Cấu trúc Push Notification di động (`appviettel_sms`), chỉ báo đang soạn tin (Typing).

3. [**03. Local Bridge HTTP & SSE API**](./03-local-bridge-http-sse-api.md)
   - API của máy chủ trung gian Local Bridge (`http://127.0.0.1:8788`).
   - Cung cấp HTTP REST endpoint cho bot gửi tin nhắn, đính kèm file, lấy danh sách hội thoại, danh bạ.
   - Cung cấp Server-Sent Events (SSE) `/events` để nhận tin nhắn và trạng thái thời gian thực.

4. [**04. Data Models & Bảng tra cứu Enums**](./04-data-models-and-enums.md)
   - Định nghĩa chi tiết cấu trúc dữ liệu tin nhắn chuẩn hoá (Normalized Message).
   - Bảng mã loại hội thoại (Conversation Types), loại tin nhắn (Message Types), và các phân loại Custom Subtypes.
   - Cấu trúc lưu trữ phiên đăng nhập `credentials.json`.

5. [**05. Cơ chế Trích xuất SDK & Hướng dẫn Xác thực**](./05-sdk-extraction-and-auth-guide.md)
   - Kỹ thuật tự động bóc tách SDK từ bundle JavaScript trên web `tammi.vn`.
   - 3 phương thức đăng nhập chi tiết (Web Session Console Snippet, Mật khẩu, OTP).
   - Cơ chế bảo vệ và khóa đồng thời (Mutex File Lock) giữa các tiến trình.

6. [**Bộ Mã Nguồn Code SDK Độc Lập (Node.js & Python)**](./code/README.md)
   - Mã nguồn thư viện hoàn chỉnh sẵn sàng gọi trực tiếp: [`tammi_api.js`](./code/tammi_api.js) và [`tammi_api.py`](./code/tammi_api.py).
   - Đầy đủ client gọi Tammi Backend REST API, hỗ trợ gửi tin nhắn qua Bridge, nhận sự kiện SSE thời gian thực, bảng mã Enums và các ví dụ chạy thực tế.

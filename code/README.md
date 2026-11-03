# Tammi Client SDK Code (Node.js & Python)

Thư mục này chứa mã nguồn hoàn chỉnh (source code) được đóng gói sẵn để gọi và tích hợp toàn bộ các API của **Tammi (Viettel Messenger)**. Hỗ trợ cả **Node.js (JavaScript)** và **Python**.

---

## 1. Cấu Trúc Thư Mục Code

```
tammi-api/code/
├── constants.js          # Các hằng số, Enum, Message Type, Custom Subtypes (Node.js)
├── constants.py          # Các hằng số, Enum, Message Type, Custom Subtypes (Python)
├── tammi_api.js          # TammiApiClient & TammiBridgeClient (Node.js)
├── tammi_api.py          # TammiApiClient & TammiBridgeClient (Python - 0 dependencies)
├── examples/
│   ├── demo_node.js      # Ví dụ mẫu gọi API Tammi bằng Node.js
│   ├── demo_python.py    # Ví dụ mẫu gọi API Tammi bằng Python
│   ├── unit_test.js      # Bộ kiểm thử đơn vị cho Node.js SDK
│   └── unit_test.py      # Bộ kiểm thử đơn vị cho Python SDK
└── README.md             # Hướng dẫn chi tiết sử dụng code
```

---

## 2. Hướng Dẫn Nhanh cho Node.js / JavaScript

### 2.1. Cài đặt & Sử dụng REST API

```javascript
const { TammiApiClient } = require("./tammi_api");

const api = new TammiApiClient();

async function run() {
  // 1. Kiểm tra tài khoản tồn tại
  const exists = await api.checkUserExists("0912345678");
  console.log("Số điện thoại có trên Tammi:", exists);

  // 2. Nhập phiên đăng nhập từ localStorage trình duyệt (Console DevTools)
  const session = {
    token: "eyJhbGciOi...",
    refresh_token: "eyJhbGciOi...",
    device_id: "your-device-uuid"
  };
  const user = await api.importSession(session);
  console.log("Xin chào:", user.nickname);

  // 3. Lấy danh bạ bạn bè
  const contacts = await api.getContacts();
  console.log("Danh bạ:", contacts);

  // 4. Lấy ZEGO Token để kết nối chat realtime ZIM
  const zego = await api.getZegoToken(user.zegoId);
  console.log("ZEGO Token:", zego.token);
}

run().catch(console.error);
```

### 2.2. Gửi tin nhắn qua Local Bridge (`TammiBridgeClient`)

```javascript
const { TammiBridgeClient } = require("./tammi_api");

const bridge = new TammiBridgeClient({ bridgeUrl: "http://127.0.0.1:8788" });

async function chat() {
  // Kiểm tra sức khoẻ bridge
  const health = await bridge.health();
  console.log("Trạng thái bridge:", health.connectionState);

  // Gửi tin nhắn chữ
  await bridge.sendText("conversation_id_o_day", "Xin chào từ Node.js!");

  // Gửi ảnh hoặc tệp tin
  await bridge.sendFile("conversation_id_o_day", "./image.png", {
    kind: "image",
    caption: "Ảnh đính kèm"
  });

  // Lắng nghe sự kiện SSE thời gian thực
  const stop = bridge.listenEvents({
    onMessage: (msg) => console.log("Tin nhắn đến:", msg.text),
    onStatus: (st) => console.log("Trạng thái kết nối:", st.connectionState),
  });
}
```

---

## 3. Hướng Dẫn Nhanh cho Python

*(Sử dụng hoàn toàn thư viện tiêu chuẩn `urllib`, không cần `pip install` bất cứ gói nào)*

### 3.1. Sử dụng REST API

```python
from tammi_api import TammiApiClient

api = TammiApiClient()

# 1. Kiểm tra tài khoản
exists = api.check_user_exists("0912345678")
print(f"Số điện thoại tồn tại: {exists}")

# 2. Đăng nhập bằng số điện thoại + mật khẩu
# result = api.login_password("0912345678", "MatKhauCuaBan")

# 3. Hoặc nạp phiên từ trình duyệt
session = {
    "token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "device_id": "your-device-uuid"
}
user = api.import_session(session)
print(f"Đăng nhập thành công: {user.get('nickname')}")

# 4. Lấy danh bạ
contacts = api.get_contacts()
print(f"Danh bạ liên hệ: {contacts}")
```

### 3.2. Sử dụng Local Bridge (`TammiBridgeClient`)

```python
from tammi_api import TammiBridgeClient

bridge = TammiBridgeClient(bridge_url="http://127.0.0.1:8788")

# Kiểm tra trạng thái bridge
health = bridge.health()
print(f"Bridge Status: {health.get('connectionState')}")

# Lấy danh sách cuộc trò chuyện
convs = bridge.get_conversations(count=10)

# Gửi tin nhắn văn bản
bridge.send_text("conversation_id_o_day", "Tin nhắn từ Python SDK")

# Gửi tệp đính kèm
bridge.send_file("conversation_id_o_day", "tailieu.pdf", kind="file", caption="File đính kèm")
```

---

## 4. Chạy Kiểm Thử Đơn Vị & Demo

Trong thư mục gốc của dự án:

```powershell
# Chạy demo Node.js
node tammi-api/code/examples/demo_node.js

# Chạy unit test Node.js
node tammi-api/code/examples/unit_test.js

# Chạy demo Python
python tammi-api/code/examples/demo_python.py

# Chạy unit test Python
python tammi-api/code/examples/unit_test.py
```

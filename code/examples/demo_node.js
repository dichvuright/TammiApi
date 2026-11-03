"use strict";

/**
 * Ví dụ mẫu cách sử dụng Tammi Client SDK trên Node.js
 */

const { TammiApiClient, TammiBridgeClient, normalizePhone } = require("../tammi_api");

async function main() {
  console.log("=== VÍ DỤ 1: SỬ DỤNG TAMMI BACKEND REST API ===");
  const api = new TammiApiClient();

  // 1. Kiểm tra một số điện thoại có tài khoản Tammi hay không
  const phone = "0987654321";
  console.log(`Đang kiểm tra số điện thoại: ${phone}...`);
  try {
    const exists = await api.checkUserExists(phone);
    console.log(`-> Kết quả kiểm tra tài khoản: ${exists ? "ĐÃ TỒN TẠI" : "CHƯA TỒN TẠI"}`);
  } catch (err) {
    console.error("Lỗi khi kiểm tra tài khoản:", err.message);
  }

  // 2. Cách đăng nhập bằng phiên copy từ trình duyệt (Web Console)
  /*
  const sessionFromBrowser = {
    token: "eyJhbGciOi...",
    refresh_token: "eyJhbGciOi...",
    device_id: "your-device-uuid"
  };
  const userInfo = await api.importSession(sessionFromBrowser);
  console.log("Đã đăng nhập thành công:", userInfo.nickname, userInfo.phoneNumber);

  // Lấy danh bạ
  const contacts = await api.getContacts();
  console.log("Danh bạ liên hệ:", contacts);

  // Lấy ZEGO token để kết nối ZIM
  const zego = await api.getZegoToken(userInfo.zegoId);
  console.log("ZEGO Token:", zego.token.slice(0, 20) + "...");
  */

  console.log("\n=== VÍ DỤ 2: SỬ DỤNG LOCAL BRIDGE CLIENT ===");
  const bridge = new TammiBridgeClient({ bridgeUrl: "http://127.0.0.1:8788" });

  try {
    const health = await bridge.health();
    console.log("Trạng thái Bridge:", health);

    if (health.loggedIn) {
      // Lấy danh sách hội thoại
      const convs = await bridge.getConversations(5);
      console.log(`Đã lấy ${convs.length} cuộc trò chuyện gần nhất.`);

      // Gửi tin nhắn thử nghiệm
      // await bridge.sendText(convs[0].id, "Xin chào từ Tammi Node SDK!");

      // Lắng nghe sự kiện SSE thời gian thực
      /*
      const stopListener = bridge.listenEvents({
        onMessage: (msg) => {
          console.log(`[Tin nhắn mới từ ${msg.senderName}]: ${msg.text}`);
        },
        onStatus: (st) => console.log("[Bridge Status]:", st.connectionState),
        onSessionDead: (dead) => console.error("[Session Dead]:", dead.message),
      });
      // Gọi stopListener() khi muốn ngắt kết nối.
      */
    } else {
      console.log("Bridge chưa đăng nhập. Vui lòng chạy `hermes-tammi-plugin login` trước.");
    }
  } catch (err) {
    console.log("Bridge cục bộ hiện chưa được bật (hoặc cổng 8788 chưa mở):", err.message);
  }
}

main().catch(console.error);

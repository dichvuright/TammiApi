"use strict";

const assert = require("assert");
const {
  normalizePhone,
  rewriteHost,
  splitByBytes,
  isOfficialAccount,
  osVersion,
  TammiApiClient,
  TammiBridgeClient,
} = require("../tammi_api");
const { MSG, CONV, CUSTOM_LABEL, ZEGO_APP_ID } = require("../constants");

console.log("=== BẮT ĐẦU KIỂM THỬ ĐƠN VỊ CHO TAMMI SDK CODE ===");

// 1. Kiểm tra chuẩn hoá số điện thoại
assert.strictEqual(normalizePhone("+84912345678"), "0912345678");
assert.strictEqual(normalizePhone("84912345678"), "0912345678");
assert.strictEqual(normalizePhone("0912.345.678"), "0912345678");
assert.strictEqual(normalizePhone("0912 345 678"), "0912345678");
console.log("✓ normalizePhone: OK");

// 2. Kiểm tra rewriteHost
assert.strictEqual(
  rewriteHost("https://cdn.tammi.vn/images/avatar.png"),
  "https://cdn.vietteltammi.vn/images/avatar.png"
);
assert.strictEqual(
  rewriteHost("https://access.tammi.vn/upload/doc.pdf"),
  "https://access.vietteltammi.vn/upload/doc.pdf"
);
assert.strictEqual(
  rewriteHost("https://otherdomain.com/tammi.vn"),
  "https://otherdomain.com/tammi.vn"
);
console.log("✓ rewriteHost: OK");

// 3. Kiểm tra splitByBytes
const longText = "Chào bạn, đây là đoạn văn bản tiếng Việt có dấu để kiểm tra tính năng cắt byte. ".repeat(150);
const chunks = splitByBytes(longText, 4800);
assert.ok(chunks.length > 1);
for (const chunk of chunks) {
  assert.ok(Buffer.byteLength(chunk, "utf8") <= 4800);
}
assert.strictEqual(
  chunks.join(" ").replace(/\s+/g, " ").trim(),
  longText.replace(/\s+/g, " ").trim()
);
console.log(`✓ splitByBytes: OK (Chia thành ${chunks.length} chunks)`);

// 4. Kiểm tra nhận diện Official Account
assert.strictEqual(isOfficialAccount("@RBT#OA_12345"), true);
assert.strictEqual(isOfficialAccount("Tammi"), true);
assert.strictEqual(isOfficialAccount("0912345678_vtt_xyz"), false);
console.log("✓ isOfficialAccount: OK");

// 5. Kiểm tra Hằng số
assert.strictEqual(ZEGO_APP_ID, 1090612485);
assert.strictEqual(CONV.peer, 0);
assert.strictEqual(CONV.group, 2);
assert.strictEqual(MSG.Text, 1);
assert.strictEqual(MSG.Custom, 200);
assert.strictEqual(CUSTOM_LABEL[5], "Danh thiếp");
assert.strictEqual(CUSTOM_LABEL[68], "Chuyển khoản");
console.log("✓ Constants & Enums: OK");

// 6. Kiểm tra cấu trúc Headers của TammiApiClient
const client = new TammiApiClient({
  deviceId: "test-device-uuid",
  accessToken: "mock_token_123",
});
const headers = client.buildHeaders();
assert.strictEqual(headers["X-Device-ID"], "test-device-uuid");
assert.strictEqual(headers["Authorization"], "Bearer mock_token_123");
assert.strictEqual(headers["Origin"], "https://tammi.vn");
console.log("✓ TammiApiClient headers: OK");

console.log("=== TẤT CẢ KIỂM THỬ ĐƠN VỊ ĐÃ VƯỢT QUA THÀNH CÔNG ===");

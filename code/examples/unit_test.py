"""
Kiểm thử đơn vị cho Tammi Python Client SDK
"""

import sys
from pathlib import Path

# Đảm bảo in UTF-8 trên Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Thêm đường dẫn thư mục code vào sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from constants import (
    CUSTOM_LABEL,
    ZEGO_APP_ID,
    ConversationType,
    MessageType,
)
from tammi_api import (
    TammiApiClient,
    is_official_account,
    normalize_phone,
    rewrite_host,
    split_by_bytes,
)

print("=== BẮT ĐẦU KIỂM THỬ ĐƠN VỊ CHO TAMMI PYTHON SDK ===")

# 1. normalize_phone
assert normalize_phone("+84912345678") == "0912345678"
assert normalize_phone("84912345678") == "0912345678"
assert normalize_phone("0912.345.678") == "0912345678"
print("✓ normalize_phone: OK")

# 2. rewrite_host
assert (
    rewrite_host("https://cdn.tammi.vn/images/avatar.png")
    == "https://cdn.vietteltammi.vn/images/avatar.png"
)
assert (
    rewrite_host("https://otherdomain.com/tammi.vn")
    == "https://otherdomain.com/tammi.vn"
)
print("✓ rewrite_host: OK")

# 3. split_by_bytes
sample_text = "Xin chào các bạn, đây là tiếng Việt có dấu. " * 150
chunks = split_by_bytes(sample_text, 4800)
assert len(chunks) > 1
for c in chunks:
    assert len(c.encode("utf-8")) <= 4800
assert " ".join(chunks).strip() == " ".join(sample_text.split())
print(f"✓ split_by_bytes: OK (Chia thành {len(chunks)} chunks)")

# 4. is_official_account
assert is_official_account("@RBT#OA_123") is True
assert is_official_account("Tammi") is True
assert is_official_account("0912345678_vtt_xyz") is False
print("✓ is_official_account: OK")

# 5. Constants & Enums
assert ZEGO_APP_ID == 1090612485
assert ConversationType.PEER == 0
assert ConversationType.GROUP == 2
assert MessageType.TEXT == 1
assert MessageType.CUSTOM == 200
assert CUSTOM_LABEL[5] == "Danh thiếp"
print("✓ Constants & Enums: OK")

# 6. TammiApiClient headers
client = TammiApiClient(device_id="py-test-device", access_token="py_token_123")
headers = client.build_headers()
assert headers["X-Device-ID"] == "py-test-device"
assert headers["Authorization"] == "Bearer py_token_123"
assert headers["Origin"] == "https://tammi.vn"
print("✓ TammiApiClient headers: OK")

print("=== TẤT CẢ KIỂM THỬ PYTHON ĐÃ VƯỢT QUA THÀNH CÔNG ===")

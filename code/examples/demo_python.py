"""
Ví dụ mẫu cách sử dụng Tammi Client SDK trên Python
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

from tammi_api import TammiApiClient, TammiBridgeClient


def main():
    print("=== VÍ DỤ 1: SỬ DỤNG TAMMI BACKEND REST API (PYTHON) ===")
    api = TammiApiClient()

    # 1. Kiểm tra tài khoản
    phone = "0987654321"
    print(f"Đang kiểm tra số điện thoại: {phone}...")
    try:
        exists = api.check_user_exists(phone)
        print(f"-> Kết quả: {'ĐÃ TỒN TẠI' if exists else 'CHƯA TỒN TẠI'}")
    except Exception as e:
        print(f"Lỗi kiểm tra tài khoản: {e}")

    # 2. Đăng nhập hoặc nạp phiên (Ví dụ)
    # session_data = {
    #     "token": "eyJ...",
    #     "refresh_token": "eyJ...",
    #     "device_id": "my-device-id"
    # }
    # user_info = api.import_session(session_data)
    # print("Đăng nhập thành công:", user_info.get("nickname"))

    print("\n=== VÍ DỤ 2: SỬ DỤNG LOCAL BRIDGE CLIENT (PYTHON) ===")
    bridge = TammiBridgeClient(bridge_url="http://127.0.0.1:8788")

    try:
        health = bridge.health()
        print("Trạng thái Bridge:", health)

        if health.get("loggedIn"):
            convs = bridge.get_conversations(count=5)
            print(f"Lấy được {len(convs)} cuộc trò chuyện.")
            # bridge.send_text(convs[0]["id"], "Chào bạn từ Tammi Python SDK!")
        else:
            print("Bridge đang chạy nhưng chưa đăng nhập tài khoản Tammi.")
    except Exception as e:
        print(f"Bridge chưa được bật trên máy (cổng 8788): {e}")


if __name__ == "__main__":
    main()

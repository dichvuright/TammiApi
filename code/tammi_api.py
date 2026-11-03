"""
Thư viện Client Python tích hợp toàn diện hệ thống API của Tammi (Viettel Messenger).
Sử dụng thư viện tiêu chuẩn của Python (không yêu cầu cài đặt thêm pip package).
"""

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any, Callable, Dict, List, Optional

try:
    from constants import (
        DEFAULT_UA,
        ORIGIN,
        TAMMI_API_BASE,
        TEXT_MAX_BYTES,
        ConversationType,
        MessageType,
    )
except ImportError:
    from .constants import (
        DEFAULT_UA,
        ORIGIN,
        TAMMI_API_BASE,
        TEXT_MAX_BYTES,
        ConversationType,
        MessageType,
    )


class AuthError(Exception):
    """Lỗi xác thực (Token hết hạn, sai mật khẩu, phiên bị huỷ)."""
    pass


class TransientError(Exception):
    """Lỗi tạm thời (Network error, HTTP 429 hoặc 5xx)."""
    pass


# ==========================================
# CÁC HÀM TIỆN ÍCH (UTILITY FUNCTIONS)
# ==========================================

def normalize_phone(phone: str) -> str:
    """Chuẩn hoá số điện thoại sang định dạng Tammi (ví dụ: +84912345678 -> 0912345678)."""
    s = re.sub(r"\D", "", str(phone or ""))
    if s.startswith("84") and len(s) >= 11:
        s = "0" + s[2:]
    return s


def rewrite_host(url: str) -> str:
    """
    Quy tắc rewrite URL Media: Chuyển tên miền *.tammi.vn sang *.vietteltammi.vn
    để CDN của Viettel cho phép tải dữ liệu.
    """
    if not isinstance(url, str) or not url:
        return url
    pattern = re.compile(
        r"^(https?://(?:[^/?#@]*@)?)((?:[^/?#:]+\.)?tammi\.vn)(?=[:/?#]|$)",
        re.IGNORECASE,
    )
    def replacer(match):
        pre = match.group(1)
        host = match.group(2)
        base = host[:-len("tammi.vn")]
        return f"{pre}{base}vietteltammi.vn"

    return pattern.sub(replacer, url)


def split_by_bytes(text: str, max_bytes: int = TEXT_MAX_BYTES) -> List[str]:
    """Phân tách văn bản thành các phần nhỏ hơn giới hạn UTF-8 bytes mà không làm vỡ từ."""
    out = []
    rest = str(text or "")
    while len(rest.encode("utf-8")) > max_bytes:
        lo = 0
        hi = len(rest)
        while lo < hi:
            mid = (lo + hi + 1) // 2
            if len(rest[:mid].encode("utf-8")) <= max_bytes:
                lo = mid
            else:
                hi = mid - 1
        cut = lo
        window = rest[:lo]
        nl = window.rfind("\n")
        sp = window.rfind(" ")
        if nl > lo * 0.5:
            cut = nl + 1
        elif sp > lo * 0.5:
            cut = sp + 1

        out.append(rest[:cut].rstrip())
        rest = rest[cut:].lstrip()

    if rest.strip():
        out.append(rest)
    return out


def is_official_account(conv_id: str) -> bool:
    """Nhận diện tài khoản doanh nghiệp Official Account (@RBT#OA_... hoặc trợ lý Tammi)."""
    return isinstance(conv_id, str) and (conv_id.startswith("@") or conv_id == "Tammi")


# ==========================================
# CLIENT GỌI TAMMI BACKEND REST API
# ==========================================

class TammiApiClient:
    def __init__(
        self,
        api_base: str = TAMMI_API_BASE,
        user_agent: str = DEFAULT_UA,
        device_id: Optional[str] = None,
        access_token: str = "",
        refresh_token: str = "",
    ):
        self.api_base = api_base.rstrip("/")
        self.user_agent = user_agent
        self.device_id = device_id or str(uuid.uuid4())
        self.ip = "0.0.0.0"
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expires_at = 0
        self.refresh_expires_at = 0

    def ensure_ip(self) -> str:
        """Lấy địa chỉ IP public."""
        if self.ip and self.ip != "0.0.0.0":
            return self.ip
        try:
            req = urllib.request.Request("https://api.ipify.org?format=json")
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode("utf-8"))
                if data and "ip" in data:
                    self.ip = data["ip"]
        except Exception:
            pass
        return self.ip

    def build_headers(self, auth: bool = True, extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "Origin": ORIGIN,
            "Referer": ORIGIN + "/",
            "User-Agent": self.user_agent,
            "Accept-Language": "vi",
            "X-Device-Name": "Browser",
            "X-Device-ID": self.device_id,
            "X-Os-Version": "macOS 10.15.7",
            "X-IP-Address": self.ip,
        }
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        if extra_headers:
            headers.update(extra_headers)
        return headers

    def raw(
        self,
        method: str,
        endpoint: str,
        body: Optional[Dict[str, Any]] = None,
        auth: bool = True,
        extra_headers: Optional[Dict[str, str]] = None,
        query: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        url = self.api_base + endpoint
        if query:
            url += "?" + urllib.parse.urlencode(query)

        data_bytes = None
        if body is not None:
            data_bytes = json.dumps(body).encode("utf-8")

        headers = self.build_headers(auth=auth, extra_headers=extra_headers)
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_text = resp.read().decode("utf-8")
                try:
                    resp_json = json.loads(resp_text)
                except Exception:
                    resp_json = {"raw": resp_text}
                return {"status": resp.status, "json": resp_json}
        except urllib.error.HTTPError as e:
            err_text = e.read().decode("utf-8")
            try:
                err_json = json.loads(err_text)
            except Exception:
                err_json = {"raw": err_text}
            return {"status": e.code, "json": err_json}
        except urllib.error.URLError as e:
            raise TransientError(f"{method} {endpoint}: Lỗi mạng ({e.reason})")

    def call(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        r = self.raw(method, endpoint, **kwargs)
        if r["status"] == 401 and self.refresh_token:
            try:
                self.refresh_webapp_token()
                r = self.raw(method, endpoint, **kwargs)
            except Exception as e:
                raise AuthError(f"Phiên Tammi đã hết hạn: {e}")

        if r["status"] == 401:
            raise AuthError("Phiên làm việc Tammi đã hết hạn (401 Unauthorized)")
        if r["status"] >= 500 or r["status"] == 429:
            raise TransientError(f"{method} {endpoint}: Server trả về HTTP {r['status']}")

        json_data = r.get("json", {})
        if r["status"] >= 400 or (isinstance(json_data, dict) and json_data.get("success") is False):
            msg = json_data.get("message") or json_data.get("error") or f"HTTP {r['status']}"
            raise Exception(f"{method} {endpoint}: {msg}")

        return json_data

    # --- ENDPOINT METHODS ---

    def check_user_exists(self, phone: str) -> bool:
        """1. Kiểm tra tài khoản đã tồn tại."""
        res = self.raw("GET", "/user/check-user-exist", auth=False, query={"username": normalize_phone(phone)})
        return bool(res.get("json", {}).get("data"))

    def request_otp(self, phone: str, cf_token: str = "") -> Dict[str, Any]:
        """2. Yêu cầu gửi mã OTP SMS."""
        self.ensure_ip()
        res = self.raw(
            "POST",
            "/auth/request-otp",
            auth=False,
            body={"username": normalize_phone(phone), "scope": "login"},
            extra_headers={"cf-token": cf_token},
        )
        j = res.get("json", {})
        if not j.get("success"):
            raise AuthError(j.get("message") or f"HTTP {res['status']}")
        return j.get("data", {})

    def login_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        """3. Đăng nhập bằng mã OTP."""
        res = self.raw(
            "POST",
            "/auth/login-webapp-otp",
            auth=False,
            body={"username": normalize_phone(phone), "otpCode": str(otp).strip()},
            extra_headers={"Os-Type": "web"},
        )
        j = res.get("json", {})
        if not j.get("success"):
            raise AuthError(j.get("message") or f"HTTP {res['status']}")
        self._save_tokens(j.get("data", {}))
        return j.get("data", {})

    def login_password(self, phone: str, password: str) -> Dict[str, Any]:
        """4. Đăng nhập bằng số điện thoại + mật khẩu."""
        self.ensure_ip()
        res = self.raw(
            "POST",
            "/auth/login-password",
            auth=False,
            body={"username": normalize_phone(phone), "password": password},
        )
        j = res.get("json", {})
        if not j.get("success"):
            raise AuthError(j.get("message") or f"HTTP {res['status']}")
        self._save_tokens(j.get("data", {}))
        return j.get("data", {})

    def refresh_webapp_token(self) -> Dict[str, Any]:
        """5. Làm mới Access Token từ Refresh Token."""
        if not self.refresh_token:
            raise AuthError("Không có refresh_token")
        res = self.raw(
            "POST",
            "/auth/refresh-webapp-token",
            auth=False,
            body={"refresh_token": self.refresh_token},
        )
        j = res.get("json", {})
        data = j.get("data")
        if res["status"] == 200 and j.get("success") and data and data.get("access_token"):
            self._save_tokens(data)
            return data
        raise AuthError(f"Gia hạn token thất bại: {j.get('message')}")

    def import_session(self, session: Dict[str, Any]) -> Dict[str, Any]:
        """6. Nhập token lấy từ localStorage trình duyệt."""
        refresh = session.get("refresh_token")
        if not refresh:
            raise AuthError("Cần cung cấp refresh_token")
        if session.get("device_id"):
            self.device_id = session["device_id"]
        self.access_token = session.get("token") or ""
        self.refresh_token = refresh
        self.refresh_webapp_token()
        return self.get_user_info()

    def get_user_info(self) -> Dict[str, Any]:
        """7. Lấy thông tin tài khoản người dùng."""
        res = self.call("GET", "/user/user-info")
        return res.get("data", {})

    def get_zego_token(self, user_id: str) -> Dict[str, Any]:
        """8. Lấy Token ZEGO Chat Engine 24h."""
        res = self.call("POST", "/meeting/zego/token", body={"userId": user_id})
        data = res.get("data", {})
        if not data.get("data"):
            raise Exception("Tammi không trả về ZEGO token")
        return {
            "token": data["data"],
            "expire_time": int(data.get("expireTime") or 0),
        }

    def get_contacts(self) -> List[Dict[str, Any]]:
        """9. Lấy danh bạ liên hệ."""
        res = self.call("GET", "/user/contacts")
        contacts = []
        for c in res.get("data", []):
            if c.get("zegoId"):
                contacts.append({
                    "id": c["zegoId"],
                    "name": c.get("contactName") or c.get("contactPhoneNumber"),
                    "phone": c.get("contactPhoneNumber"),
                })
        return contacts

    def logout(self) -> None:
        """10. Đăng xuất thu hồi phiên."""
        if self.refresh_token:
            try:
                self.raw("POST", "/auth/logout-webapp", auth=False, body={"refreshToken": self.refresh_token})
            except Exception:
                pass
        self.access_token = ""
        self.refresh_token = ""

    def _save_tokens(self, data: Dict[str, Any]) -> None:
        now = int(time.time())
        self.access_token = data.get("access_token", "")
        if data.get("refresh_token"):
            self.refresh_token = data["refresh_token"]
        expires_in = data.get("expires_in")
        self.token_expires_at = now + int(expires_in) if expires_in else now + 3600
        refresh_expires_in = data.get("refresh_expires_in")
        self.refresh_expires_at = now + int(refresh_expires_in) if refresh_expires_in else now + 90 * 86400


# ==========================================
# CLIENT GIAO TIẾP VỚI LOCAL BRIDGE SERVER
# ==========================================

class TammiBridgeClient:
    def __init__(self, bridge_url: str = "http://127.0.0.1:8788", token: str = ""):
        self.bridge_url = bridge_url.rstrip("/")
        self.token = token

    def _req(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        url = f"{self.bridge_url}{path}"
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["x-bridge-token"] = self.token
        data_bytes = json.dumps(body).encode("utf-8") if body else None
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if not data.get("success", True) and data.get("success") is False:
                raise Exception(data.get("error", "Lỗi Bridge không xác định"))
            return data

    def health(self) -> Dict[str, Any]:
        """Kiểm tra sức khoẻ bridge."""
        return self._req("GET", "/health")

    def get_conversations(self, count: int = 100) -> List[Dict[str, Any]]:
        """Lấy danh sách hội thoại."""
        res = self._req("GET", f"/conversations?count={count}")
        return res.get("conversations", [])

    def get_contacts(self) -> Dict[str, Any]:
        """Lấy danh bạ phân nhóm."""
        return self._req("GET", "/contacts")

    def send_text(
        self,
        conversation_id: str,
        text: str,
        conversation_type: str = "peer",
        reply_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Gửi tin nhắn văn bản."""
        return self._req("POST", "/send", {
            "conversationId": conversation_id,
            "conversationType": conversation_type,
            "text": text,
            "replyTo": reply_to,
        })

    def send_file(
        self,
        conversation_id: str,
        file_path: str,
        conversation_type: str = "peer",
        kind: str = "auto",
        caption: str = "",
    ) -> Dict[str, Any]:
        """Gửi tệp tin / đa phương tiện."""
        return self._req("POST", "/send-file", {
            "conversationId": conversation_id,
            "conversationType": conversation_type,
            "path": os.path.abspath(file_path),
            "kind": kind,
            "caption": caption,
        })

    def set_typing(self, conversation_id: str, conversation_type: str = "peer", stop: bool = False) -> Dict[str, Any]:
        """Gửi trạng thái đang soạn tin nhắn."""
        return self._req("POST", "/typing", {
            "conversationId": conversation_id,
            "conversationType": conversation_type,
            "stop": stop,
        })

    def mark_read(self, conversation_id: str, conversation_type: str = "peer") -> Dict[str, Any]:
        """Đánh dấu đã đọc cuộc trò chuyện."""
        return self._req("POST", "/read", {
            "conversationId": conversation_id,
            "conversationType": conversation_type,
        })

    def relogin(self) -> Dict[str, Any]:
        """Yêu cầu bridge nạp lại phiên."""
        return self._req("POST", "/relogin")

    def shutdown(self) -> Dict[str, Any]:
        """Tắt máy chủ bridge."""
        return self._req("POST", "/shutdown")

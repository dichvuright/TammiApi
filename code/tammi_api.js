"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  TAMMI_API_BASE,
  ORIGIN,
  DEFAULT_UA,
  TEXT_MAX_BYTES,
  CONV,
  MIME,
} = require("./constants");

/**
 * Lỗi xác thực tài khoản (Token hết hạn, sai mật khẩu, phiên bị huỷ)
 */
class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Lỗi tạm thời (Network timeout, rate limit 429, 5xx server error)
 */
class TransientError extends Error {
  constructor(message) {
    super(message);
    this.name = "TransientError";
  }
}

// ==========================================
// CÁC HÀM TIỆN ÍCH (UTILITY FUNCTIONS)
// ==========================================

/**
 * Chuẩn hoá số điện thoại sang định dạng Tammi (ví dụ: +84912345678 -> 0912345678)
 */
function normalizePhone(phone) {
  let s = String(phone || "").replace(/[^\d]/g, "");
  if (s.startsWith("84") && s.length >= 11) {
    s = "0" + s.slice(2);
  }
  return s;
}

/**
 * Trích xuất phiên bản hệ điều hành từ chuỗi User-Agent
 */
function osVersion(ua = DEFAULT_UA) {
  const m = ua.match(/Mac OS X ([0-9_]+)/);
  if (m) return `macOS ${m[1].replace(/_/g, ".")}`;
  if (/Windows NT 10.0/.test(ua)) return "Windows 10/11";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}

/**
 * Quy tắc rewrite URL Media: Chuyển tên miền *.tammi.vn sang *.vietteltammi.vn
 * (Nếu không chuyển, CDN Viettel sẽ chặn tải file).
 */
function rewriteHost(url) {
  if (typeof url !== "string" || !url) return url;
  return url.replace(
    /^(https?:\/\/(?:[^/?#@]*@)?)((?:[^/?#:]+\.)?tammi\.vn)(?=[:/?#]|$)/i,
    (_m, pre, host) => `${pre}${host.slice(0, host.length - "tammi.vn".length)}vietteltammi.vn`
  );
}

/**
 * Chia nhỏ văn bản UTF-8 theo giới hạn bytes an toàn (mặc định 4800 bytes)
 */
function splitByBytes(text, maxBytes = TEXT_MAX_BYTES) {
  const out = [];
  let rest = String(text || "");
  while (Buffer.byteLength(rest, "utf8") > maxBytes) {
    let lo = 0;
    let hi = rest.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (Buffer.byteLength(rest.slice(0, mid), "utf8") <= maxBytes) {
        lo = mid;
      } else {
        hi = mid - 1;
      }
    }
    let cut = lo;
    const windowText = rest.slice(0, lo);
    const nl = windowText.lastIndexOf("\n");
    const sp = windowText.lastIndexOf(" ");
    if (nl > lo * 0.5) cut = nl + 1;
    else if (sp > lo * 0.5) cut = sp + 1;

    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest.trim()) out.push(rest);
  return out;
}

/**
 * Nhận diện tài khoản Official Account (@RBT#OA_... hoặc bot Tammi)
 */
function isOfficialAccount(id) {
  return typeof id === "string" && (id.startsWith("@") || id === "Tammi");
}

// ==========================================
// CLIENT GỌI TAMMI BACKEND REST API
// ==========================================

class TammiApiClient {
  /**
   * @param {Object} options
   * @param {string} [options.apiBase] - Base URL API (Mặc định: https://api.tammi.vn/api/v1)
   * @param {string} [options.userAgent] - User agent giả lập trình duyệt
   * @param {string} [options.deviceId] - Device ID UUID (tự sinh nếu không truyền)
   * @param {string} [options.accessToken] - Access token hiện tại
   * @param {string} [options.refreshToken] - Refresh token hiện tại
   */
  constructor(options = {}) {
    this.apiBase = options.apiBase || TAMMI_API_BASE;
    this.userAgent = options.userAgent || DEFAULT_UA;
    this.deviceId = options.deviceId || crypto.randomUUID();
    this.ip = options.ip || "0.0.0.0";
    this.accessToken = options.accessToken || "";
    this.refreshToken = options.refreshToken || "";
    this.tokenExpiresAt = options.tokenExpiresAt || 0;
    this.refreshTokenExpiresAt = options.refreshTokenExpiresAt || 0;
  }

  /**
   * Lấy địa chỉ IP public từ dịch vụ ipify
   */
  async ensureIp() {
    if (this.ip && this.ip !== "0.0.0.0") return this.ip;
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      if (data && data.ip) this.ip = data.ip;
    } catch {}
    return this.ip;
  }

  /**
   * Tạo tiêu đề HTTP Headers giả lập trình duyệt
   */
  buildHeaders(auth = true, extraHeaders = {}) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      Origin: ORIGIN,
      Referer: ORIGIN + "/",
      "User-Agent": this.userAgent,
      "Accept-Language": "vi",
      "X-Device-Name": "Browser",
      "X-Device-ID": this.deviceId,
      "X-Os-Version": osVersion(this.userAgent),
      "X-IP-Address": this.ip || "0.0.0.0",
      ...extraHeaders,
    };
    if (auth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  /**
   * Thực hiện yêu cầu HTTP thô đến máy chủ Tammi
   */
  async raw(method, endpoint, { body, auth = true, extraHeaders = {}, query } = {}) {
    let url = this.apiBase + endpoint;
    if (query) {
      url += "?" + new URLSearchParams(query).toString();
    }

    let res;
    try {
      res = await fetch(url, {
        method,
        headers: this.buildHeaders(auth, extraHeaders),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      throw new TransientError(
        `${method} ${endpoint}: Lỗi kết nối mạng (${(e.cause && e.cause.code) || e.message})`
      );
    }

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    return { status: res.status, json };
  }

  /**
   * Gọi API có xử lý tự động mã lỗi & làm mới Token khi gặp 401
   */
  async call(method, endpoint, opts = {}) {
    let r = await this.raw(method, endpoint, opts);

    // Nếu gặp lỗi 401 Unauthorized và có sẵn refresh token, thử refresh
    if (r.status === 401 && this.refreshToken) {
      try {
        await this.refreshWebappToken();
        r = await this.raw(method, endpoint, opts);
      } catch (e) {
        throw new AuthError(`Phiên đăng nhập Tammi đã hết hạn: ${e.message}`);
      }
    }

    if (r.status === 401) {
      throw new AuthError("Phiên làm việc Tammi đã hết hạn (401 Unauthorized)");
    }
    if (r.status >= 500 || r.status === 429) {
      throw new TransientError(`${method} ${endpoint}: Máy chủ Tammi phản hồi HTTP ${r.status}`);
    }
    if (r.status >= 400 || (r.json && r.json.success === false)) {
      const msg =
        (r.json && (r.json.message || r.json.error_description || r.json.error)) ||
        `HTTP ${r.status}`;
      const err = new Error(`${method} ${endpoint}: ${msg}`);
      err.status = r.status;
      err.body = r.json;
      throw err;
    }

    return r.json;
  }

  // --- CÁC ENDPOINT REST API ---

  /**
   * 1. Kiểm tra số điện thoại / username đã đăng ký tài khoản chưa
   */
  async checkUserExists(phone) {
    const norm = normalizePhone(phone);
    const r = await this.raw("GET", "/user/check-user-exist", {
      auth: false,
      query: { username: norm },
    });
    return Boolean(r.json && r.json.data);
  }

  /**
   * 2. Yêu cầu gửi mã xác thực OTP qua SMS
   * @param {string} phone - Số điện thoại
   * @param {string} [cfToken] - Cloudflare Turnstile token
   */
  async requestOtp(phone, cfToken = "") {
    await this.ensureIp();
    const r = await this.raw("POST", "/auth/request-otp", {
      auth: false,
      body: { username: normalizePhone(phone), scope: "login" },
      extraHeaders: { "cf-token": cfToken || "" },
    });
    if (!r.json || !r.json.success) {
      throw new AuthError((r.json && r.json.message) || `HTTP ${r.status}`);
    }
    return r.json.data; // { length: 6, expired: 120 }
  }

  /**
   * 3. Đăng nhập bằng mã OTP
   */
  async loginOtp(phone, otp) {
    const r = await this.raw("POST", "/auth/login-webapp-otp", {
      auth: false,
      body: { username: normalizePhone(phone), otpCode: String(otp).trim() },
      extraHeaders: { "Os-Type": "web" },
    });
    if (!r.json || !r.json.success) {
      throw new AuthError((r.json && r.json.message) || `HTTP ${r.status}`);
    }
    this._saveTokens(r.json.data);
    return r.json.data;
  }

  /**
   * 4. Đăng nhập bằng Số điện thoại + Mật khẩu
   */
  async loginPassword(phone, password) {
    await this.ensureIp();
    const r = await this.raw("POST", "/auth/login-password", {
      auth: false,
      body: { username: normalizePhone(phone), password },
    });
    if (!r.json || !r.json.success) {
      throw new AuthError((r.json && r.json.message) || `HTTP ${r.status}`);
    }
    this._saveTokens(r.json.data);
    return r.json.data;
  }

  /**
   * 5. Làm mới Access Token và xoay vòng Refresh Token (Token Rotation)
   */
  async refreshWebappToken() {
    if (!this.refreshToken) {
      throw new AuthError("Không tìm thấy refresh_token để gia hạn");
    }
    const r = await this.raw("POST", "/auth/refresh-webapp-token", {
      auth: false,
      body: { refresh_token: this.refreshToken },
    });
    const data = r.json && r.json.data;
    if (r.status === 200 && r.json && r.json.success && data && data.access_token) {
      this._saveTokens(data);
      return data;
    }
    throw new AuthError(`Gia hạn token thất bại: ${(r.json && r.json.message) || r.status}`);
  }

  /**
   * 6. Nhập phiên đăng nhập từ localStorage của trình duyệt
   */
  async importSession({ token, refresh_token, device_id }) {
    if (!refresh_token) throw new AuthError("Cần cung cấp refresh_token");
    if (device_id) this.deviceId = device_id;
    this.accessToken = token || "";
    this.refreshToken = refresh_token;
    await this.refreshWebappToken();
    return await this.getUserInfo();
  }

  /**
   * 7. Lấy thông tin tài khoản người dùng hiện tại
   */
  async getUserInfo() {
    const res = await this.call("GET", "/user/user-info");
    return res.data || {};
  }

  /**
   * 8. Lấy Token ZEGO ZIM Chat Engine (thời hạn 24 giờ)
   */
  async getZegoToken(userId) {
    const res = await this.call("POST", "/meeting/zego/token", {
      body: { userId },
    });
    const data = res.data || {};
    if (!data.data) {
      throw new Error("Tammi không trả về ZEGO token hợp lệ");
    }
    return {
      token: data.data,
      expireTime: Number(data.expireTime || 0),
    };
  }

  /**
   * 9. Lấy danh bạ bạn bè / liên hệ
   */
  async getContacts() {
    const res = await this.call("GET", "/user/contacts");
    return (res.data || [])
      .filter((c) => c.zegoId)
      .map((c) => ({
        id: c.zegoId,
        name: c.contactName || c.contactPhoneNumber,
        phone: c.contactPhoneNumber,
      }));
  }

  /**
   * 10. Đăng xuất và thu hồi Refresh Token
   */
  async logout() {
    if (this.refreshToken) {
      try {
        await this.raw("POST", "/auth/logout-webapp", {
          auth: false,
          body: { refreshToken: this.refreshToken },
        });
      } catch {}
    }
    this.accessToken = "";
    this.refreshToken = "";
  }

  _saveTokens(data) {
    const now = Math.floor(Date.now() / 1000);
    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    this.tokenExpiresAt = data.expires_in ? now + Number(data.expires_in) : now + 3600;
    this.refreshTokenExpiresAt = data.refresh_expires_in
      ? now + Number(data.refresh_expires_in)
      : now + 90 * 86400;
  }
}

// ==========================================
// CLIENT GIAO TIẾP VỚI LOCAL BRIDGE SERVER
// ==========================================

class TammiBridgeClient {
  /**
   * @param {Object} options
   * @param {string} [options.bridgeUrl] - URL của bridge (Mặc định: http://127.0.0.1:8788)
   * @param {string} [options.token] - Mã x-bridge-token nếu có
   */
  constructor({ bridgeUrl = "http://127.0.0.1:8788", token = "" } = {}) {
    this.bridgeUrl = bridgeUrl.replace(/\/+$/, "");
    this.token = token;
  }

  _headers() {
    const h = { "Content-Type": "application/json" };
    if (this.token) h["x-bridge-token"] = this.token;
    return h;
  }

  async _req(method, path, body = undefined) {
    const res = await fetch(`${this.bridgeUrl}${path}`, {
      method,
      headers: this._headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data && data.success === false)) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  /**
   * Kiểm tra trạng thái sức khoẻ của Bridge
   */
  async health() {
    return this._req("GET", "/health");
  }

  /**
   * Lấy danh sách cuộc trò chuyện gần nhất
   */
  async getConversations(count = 100) {
    const data = await this._req("GET", `/conversations?count=${count}`);
    return data.conversations || [];
  }

  /**
   * Lấy danh bạ phân loại (friends, groups, selfChats, oa)
   */
  async getContacts() {
    return this._req("GET", "/contacts");
  }

  /**
   * Gửi tin nhắn văn bản
   */
  async sendText(conversationId, text, { conversationType = "peer", replyTo } = {}) {
    return this._req("POST", "/send", {
      conversationId,
      conversationType,
      text,
      replyTo,
    });
  }

  /**
   * Gửi tệp tin / đa phương tiện (ảnh, video, audio, tài liệu)
   */
  async sendFile(conversationId, filePath, { conversationType = "peer", kind = "auto", caption = "", fileName } = {}) {
    return this._req("POST", "/send-file", {
      conversationId,
      conversationType,
      path: path.resolve(filePath),
      kind,
      caption,
      fileName,
    });
  }

  /**
   * Bật hoặc tắt trạng thái đang soạn tin nhắn (typing)
   */
  async setTyping(conversationId, { conversationType = "peer", stop = false } = {}) {
    return this._req("POST", "/typing", {
      conversationId,
      conversationType,
      stop,
    });
  }

  /**
   * Đánh dấu đã đọc toàn bộ tin nhắn trong hội thoại
   */
  async markRead(conversationId, { conversationType = "peer" } = {}) {
    return this._req("POST", "/read", {
      conversationId,
      conversationType,
    });
  }

  /**
   * Yêu cầu Bridge nạp lại token và kết nối lại
   */
  async relogin() {
    return this._req("POST", "/relogin");
  }

  /**
   * Tắt máy chủ Bridge
   */
  async shutdown() {
    return this._req("POST", "/shutdown");
  }

  /**
   * Lắng nghe luồng sự kiện Server-Sent Events (SSE) thời gian thực
   */
  listenEvents({ onMessage, onStatus, onSessionDead, onError }) {
    const url = `${this.bridgeUrl}/events`;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, {
          headers: this._headers(),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`SSE kết nối thất bại: HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n\n");
          buffer = lines.pop(); // giữ lại phần chưa hoàn chỉnh

          for (const block of lines) {
            if (!block.trim()) continue;
            let event = "message";
            let data = "";

            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) {
                event = line.replace("event:", "").trim();
              } else if (line.startsWith("data:")) {
                data = line.replace("data:", "").trim();
              }
            }

            try {
              const parsed = data ? JSON.parse(data) : {};
              if (event === "message" && onMessage) onMessage(parsed);
              else if (event === "status" && onStatus) onStatus(parsed);
              else if (event === "session_dead" && onSessionDead) onSessionDead(parsed);
            } catch {}
          }
        }
      } catch (err) {
        if (!controller.signal.aborted && onError) onError(err);
      }
    })();

    return () => controller.abort(); // Trả về hàm hủy kết nối
  }
}

module.exports = {
  TammiApiClient,
  TammiBridgeClient,
  AuthError,
  TransientError,
  normalizePhone,
  rewriteHost,
  splitByBytes,
  isOfficialAccount,
  osVersion,
};

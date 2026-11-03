"use strict";

/**
 * Các hằng số chuẩn trong giao thức và hệ thống API của Tammi (Viettel Messenger).
 */

const TAMMI_API_BASE = process.env.TAMMI_API_BASE || "https://api.tammi.vn/api/v1";
const ORIGIN = "https://tammi.vn";
const DEFAULT_UA =
  process.env.TAMMI_USER_AGENT ||
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const ZEGO_APP_ID = 1090612485;

// Loại hội thoại ZIM
const CONV = {
  peer: 0,
  room: 1,
  group: 2,
  channel: 3,
};

const CONV_NAME = {
  0: "peer",
  1: "room",
  2: "group",
  3: "channel",
};

// Loại tin nhắn ZIM
const MSG = {
  Text: 1,
  Command: 2,
  Multiple: 10,
  Image: 11,
  File: 12,
  Audio: 13,
  Video: 14,
  Revoke: 31,
  Tips: 32,
  Combine: 100,
  Custom: 200,
};

// Mã sự kiện kết nối ZIM
const CONN_EVENT = {
  Success: 0,
  ActiveLogin: 1,
  LoginTimeout: 2,
  LoginInterrupted: 3,
  KickedOut: 4,
  TokenExpired: 5,
  Unregistered: 6,
};

// Nhãn giải nghĩa của các loại tin nhắn mở rộng (Custom SubType)
const CUSTOM_LABEL = {
  5: "Danh thiếp",
  16: "Bình chọn",
  17: "Bình chọn",
  19: "Mời họp",
  20: "Cuộc gọi",
  22: "Tin nhắn tự huỷ",
  33: "Lời mời vào nhóm",
  68: "Chuyển khoản",
  86: "Chuyển khoản (QR)",
  99: "Tin nhắn Bot Markdown",
  111: "Tin nhắn Bot Text",
  196: "Vị trí",
  197: "Vị trí",
  198: "Vị trí trực tiếp",
  199: "Sticker",
  200: "Thông báo",
  104: "OA",
  105: "OA",
  106: "OA",
  107: "OA",
  109: "OA",
};

const TEXT_MAX_BYTES = Number(process.env.TAMMI_TEXT_MAX_BYTES || 4800);

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp"]);
const VIDEO_EXT = new Set(["mp4", "mov", "m4v", "webm", "avi", "mkv"]);
const AUDIO_EXT = new Set(["mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "amr", "flac"]);

const MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  opus: "audio/ogg",
  pdf: "application/pdf",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  csv: "text/csv",
  json: "application/json",
};

module.exports = {
  TAMMI_API_BASE,
  ORIGIN,
  DEFAULT_UA,
  ZEGO_APP_ID,
  CONV,
  CONV_NAME,
  MSG,
  CONN_EVENT,
  CUSTOM_LABEL,
  TEXT_MAX_BYTES,
  IMAGE_EXT,
  VIDEO_EXT,
  AUDIO_EXT,
  MIME,
};

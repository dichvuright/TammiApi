"""
Các hằng số chuẩn trong giao thức và hệ thống API của Tammi (Viettel Messenger).
"""

from enum import IntEnum
import os

TAMMI_API_BASE = os.getenv("TAMMI_API_BASE", "https://api.tammi.vn/api/v1")
ORIGIN = "https://tammi.vn"
DEFAULT_UA = os.getenv(
    "TAMMI_USER_AGENT",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
)

ZEGO_APP_ID = 1090612485
TEXT_MAX_BYTES = int(os.getenv("TAMMI_TEXT_MAX_BYTES", "4800"))


class ConversationType(IntEnum):
    PEER = 0
    ROOM = 1
    GROUP = 2
    CHANNEL = 3


class MessageType(IntEnum):
    TEXT = 1
    COMMAND = 2
    MULTIPLE = 10
    IMAGE = 11
    FILE = 12
    AUDIO = 13
    VIDEO = 14
    REVOKE = 31
    TIPS = 32
    COMBINE = 100
    CUSTOM = 200


class ConnectionEvent(IntEnum):
    SUCCESS = 0
    ACTIVE_LOGIN = 1
    LOGIN_TIMEOUT = 2
    LOGIN_INTERRUPTED = 3
    KICKED_OUT = 4
    TOKEN_EXPIRED = 5
    UNREGISTERED = 6


CUSTOM_LABEL = {
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
}

IMAGE_EXT = {"jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp"}
VIDEO_EXT = {"mp4", "mov", "m4v", "webm", "avi", "mkv"}
AUDIO_EXT = {"mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "amr", "flac"}

MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "heic": "image/heic",
    "mp4": "video/mp4",
    "mov": "video/quicktime",
    "webm": "video/webm",
    "mp3": "audio/mpeg",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
    "wav": "audio/wav",
    "ogg": "audio/ogg",
    "opus": "audio/ogg",
    "pdf": "application/pdf",
    "txt": "text/plain",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "zip": "application/zip",
    "csv": "text/csv",
    "json": "application/json",
}

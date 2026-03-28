"""Telegram service for uploading proof videos to Telegram channel."""

import logging
import os
import requests
from typing import Optional

logger = logging.getLogger(__name__)

# Constants
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def upload_video_to_telegram(
    file_bytes: bytes,
    filename: str,
    caption: str,
) -> Optional[str]:
    """
    Upload video to Telegram channel and return the proof link.

    Args:
        file_bytes: Video file content as bytes
        filename: Original filename for display
        caption: Caption to attach to the video

    Returns:
        Telegram t.me/c/ URL link, or None if upload fails

    Raises:
        ValueError: If file is too large or env vars not set
    """
    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds 50MB limit ({len(file_bytes) / (1024*1024):.2f}MB)")

    # Get Telegram credentials from environment
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    channel_id = os.getenv("TELEGRAM_CHANNEL_ID")

    if not bot_token or not channel_id:
        logger.error("❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID environment variables")
        raise ValueError("Telegram credentials not configured")

    # Construct Telegram API URL
    telegram_api_url = f"https://api.telegram.org/bot{bot_token}/sendVideo"

    # Prepare multipart form data
    files = {
        'video': (filename, file_bytes, 'video/mp4'),  # filename, content, mime_type
    }
    data = {
        'chat_id': channel_id,
        'caption': caption,
    }

    try:
        logger.info(f"📤 Uploading video '{filename}' to Telegram for order {caption.strip()}")

        # Upload to Telegram API (timeout: 300 seconds for large videos)
        response = requests.post(
            telegram_api_url,
            files=files,
            data=data,
            timeout=300,
        )

        # Check response
        response.raise_for_status()
        response_json = response.json()

        if not response_json.get("ok"):
            error_msg = response_json.get("description", "Unknown error")
            logger.error(f"❌ Telegram API error: {error_msg}")
            raise ValueError(f"Telegram API error: {error_msg}")

        # Extract message_id from response
        message_id = response_json.get("result", {}).get("message_id")
        if not message_id:
            logger.error("❌ No message_id in Telegram response")
            raise ValueError("Could not extract message_id from Telegram response")

        # Extract channel ID without "-100" prefix to create valid t.me link
        # Example: -1003744041838 → 3744041838
        channel_id_for_link = channel_id.lstrip("-")
        if channel_id_for_link.startswith("100"):
            channel_id_for_link = channel_id_for_link[3:]  # Strip "100"

        # Construct t.me link
        proof_link = f"https://t.me/c/{channel_id_for_link}/{message_id}"

        logger.info(f"✅ Video uploaded successfully: {proof_link}")
        return proof_link

    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Request error uploading to Telegram: {str(e)}")
        raise ValueError(f"Failed to upload video to Telegram: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error uploading video: {str(e)}")
        raise ValueError(f"Unexpected error uploading video: {str(e)}")

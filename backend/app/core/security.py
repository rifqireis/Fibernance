"""Security utilities for Fibernance application."""

import logging
from fastapi import Depends, HTTPException, Header
from typing import Optional

logger = logging.getLogger(__name__)

# Security constants
ADMIN_PASSWORD = "030908"  # Master password for sensitive operations


async def verify_admin_password(
    x_admin_password: Optional[str] = Header(None),
) -> str:
    """
    Verify admin password from X-Admin-Password header.

    This dependency checks the X-Admin-Password header against the master password.
    Used to protect sensitive endpoints like account deletion, order cancellation, etc.

    Security note:
    - In production, consider using JWT tokens or OAuth2 with password hashing
    - This simple header check is suitable for internal admin APIs
    - Always use HTTPS in production to prevent header interception

    Args:
        x_admin_password: Admin password from request header

    Returns:
        str: The admin password if valid

    Raises:
        HTTPException: 401 Unauthorized if password is missing or incorrect
    """

    if not x_admin_password:
        logger.warn("❌ Admin operation attempted without password")
        raise HTTPException(
            status_code=401,
            detail="X-Admin-Password header is required",
        )

    if x_admin_password != ADMIN_PASSWORD:
        logger.warn(f"❌ Admin operation attempted with incorrect password")
        raise HTTPException(
            status_code=401,
            detail="Invalid admin password",
        )

    logger.info("✅ Admin operation authorized")
    return x_admin_password

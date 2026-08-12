"""Transactional email via the Emergent-managed Resend integration."""
import logging
import os

import httpx

logger = logging.getLogger(__name__)

# Managed proxy — intentionally a constant so it survives deployment.
EMAIL_BASE_URL = "https://integrations.emergentagent.com"


def public_app_url(origin: str | None = None) -> str:
    """Base URL used to build links inside emails."""
    return (origin or os.environ.get("PUBLIC_APP_URL") or "").rstrip("/")


async def send_email(to: str, subject: str, html: str) -> bool:
    """Never raises — a failed send must not break the calling auth flow."""
    key = os.environ.get("EMERGENT_EMAIL_KEY")
    from_name = os.environ.get("EMAIL_FROM_NAME")
    if not key or not from_name:
        logger.warning("Email not configured; skipping send to %s", to)
        return False
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": key},
                json={"to": [to], "subject": subject, "html": html, "from_name": from_name},
            )
        resp.raise_for_status()
        return True
    except Exception as exc:  # noqa: BLE001 - deliberately swallowed
        logger.error("Email send to %s failed: %s", to, exc)
        return False


def _shell(title: str, body: str, cta: str = "", cta_url: str = "") -> str:
    button = (
        f'<tr><td style="padding:8px 0 24px 0"><a href="{cta_url}" '
        'style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;'
        'padding:14px 28px;border-radius:12px;font-weight:600;font-size:15px">'
        f"{cta}</a></td></tr>"
        if cta and cta_url
        else ""
    )
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f1f5f9">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:36px;font-family:Arial,Helvetica,sans-serif">
<tr><td style="font-size:18px;font-weight:700;color:#0f172a;padding-bottom:4px">CG STUDENT PORTAL</td></tr>
<tr><td style="font-size:12px;color:#64748b;padding-bottom:26px">Study &bull; Earn &bull; Grow</td></tr>
<tr><td style="font-size:20px;font-weight:700;color:#0f172a;padding-bottom:14px">{title}</td></tr>
<tr><td style="font-size:15px;line-height:1.65;color:#334155;padding-bottom:22px">{body}</td></tr>
{button}
<tr><td style="font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:20px">
You received this email because an account action was requested on CG STUDENT PORTAL.
If this was not you, you can safely ignore it.</td></tr>
</table></td></tr></table></body></html>"""


async def send_verification_email(to: str, name: str, link: str) -> bool:
    return await send_email(
        to,
        "Verify your CG STUDENT PORTAL account",
        _shell(
            "Confirm your email",
            f"Hi {name}, welcome to CG STUDENT PORTAL. Confirm your email address to "
            "activate your account. This link expires in 24 hours.",
            "Verify my email",
            link,
        ),
    )


async def send_otp_email(to: str, name: str, code: str) -> bool:
    return await send_email(
        to,
        "Your CG STUDENT PORTAL verification code",
        _shell(
            "Your verification code",
            f"Hi {name}, use this code to continue. It expires in 10 minutes."
            f'<div style="font-size:30px;font-weight:700;letter-spacing:8px;color:#0f172a;'
            f'margin-top:18px">{code}</div>',
        ),
    )


async def send_password_reset_email(to: str, name: str, link: str) -> bool:
    return await send_email(
        to,
        "Reset your CG STUDENT PORTAL password",
        _shell(
            "Reset your password",
            f"Hi {name}, we received a request to reset your password. "
            "This link expires in 60 minutes. If you did not request it, ignore this email.",
            "Choose a new password",
            link,
        ),
    )


async def send_security_alert_email(to: str, name: str, event: str, detail: str = "") -> bool:
    return await send_email(
        to,
        f"Security alert: {event}",
        _shell(
            event,
            f"Hi {name}, we are letting you know about a change on your account: "
            f"<strong>{event}</strong>. {detail}<br><br>"
            "If you did not do this, reset your password immediately.",
        ),
    )

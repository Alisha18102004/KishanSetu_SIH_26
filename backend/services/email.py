import os
import smtplib
from email.message import EmailMessage


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Optional SMTP email channel. If SMTP credentials are absent, keep demo running."""
    if not to_email:
        return False
    host = os.getenv('SMTP_HOST')
    port = int(os.getenv('SMTP_PORT', '587'))
    username = os.getenv('SMTP_USERNAME')
    password = os.getenv('SMTP_PASSWORD')
    sender = os.getenv('SMTP_FROM', username or '')
    if not all([host, username, password, sender]):
        print(f'[EMAIL DEMO] {to_email} | {subject} | {body}')
        return False
    try:
        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = sender
        msg['To'] = to_email
        msg.set_content(body)
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(username, password)
            server.send_message(msg)
        return True
    except Exception as exc:
        print(f'[EMAIL ERROR] {exc}')
        return False

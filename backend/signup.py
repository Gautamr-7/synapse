import resend
import os
import secrets
from datetime import datetime

resend.api_key = os.getenv("RESEND_API_KEY")

def send_api_key_email(email: str, name: str, api_key: str):
    try:
        resend.Emails.send({
            "from": "Synapse AI <onboarding@resend.dev>",
            "to": email,
            "subject": "Your Synapse AI API Key",
            "html": f"""
<!DOCTYPE html>
<html>
<body style="background:#050508;color:#fff;font-family:monospace;padding:40px;max-width:600px;margin:0 auto">
  <div style="margin-bottom:32px">
    <div style="width:32px;height:32px;background:linear-gradient(135deg,#e85d04,#dc2f02);border-radius:8px;margin-bottom:16px"></div>
    <h1 style="font-size:24px;margin:0;color:#fff">SYNAPSE AI</h1>
    <p style="color:rgba(255,255,255,0.4);margin:4px 0 0;font-size:13px">Memory OS for AI Agents</p>
  </div>
  <p style="color:rgba(255,255,255,0.7);font-size:15px">Hey {name},</p>
  <p style="color:rgba(255,255,255,0.7);font-size:15px">Welcome to Synapse AI. Here's your API key:</p>
  <div style="background:rgba(232,93,4,0.1);border:1px solid rgba(232,93,4,0.3);border-radius:12px;padding:20px;margin:24px 0">
    <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.1em">Your API Key</p>
    <code style="color:#fb923c;font-size:14px;word-break:break-all">{api_key}</code>
  </div>
  <p style="color:rgba(255,255,255,0.5);font-size:13px">Get started in 3 lines:</p>
  <div style="background:#0a0a0f;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin:16px 0">
    <code style="color:#4ade80;font-size:13px;line-height:1.8">
      pip install synapseai-sdk<br><br>
      from synapse import Synapse<br>
      syn = Synapse(api_key="{api_key}")<br>
      session = syn.create_session("your task here")
    </code>
  </div>
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06)">
    <a href="https://synapse-aii.netlify.app/dashboard" style="background:linear-gradient(135deg,#e85d04,#dc2f02);color:#fff;text-decoration:none;padding:12px 24px;border-radius:40px;font-size:13px">Open Dashboard →</a>
  </div>
  <p style="color:rgba(255,255,255,0.2);font-size:12px;margin-top:32px">
    API Docs: synapse-backend-b5k1.onrender.com/docs<br>
    Dashboard: synapse-aii.netlify.app/dashboard
  </p>
</body>
</html>
"""
        })
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

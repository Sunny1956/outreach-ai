// Handles real email sending using whatever SMTP credentials the logged-in
// user connected on the "Connect accounts" screen (e.g. a Gmail address with
// an app password). This is genuinely functional - it is not a mock.

const nodemailer = require('nodemailer');

function buildTransport(account) {
  // account = { smtpHost, smtpPort, smtpUser, smtpPass }
  return nodemailer.createTransport({
    host: account.smtpHost || 'smtp.gmail.com',
    port: Number(account.smtpPort) || 587,
    secure: Number(account.smtpPort) === 465,
    auth: {
      user: account.smtpUser,
      pass: account.smtpPass
    }
  });
}

async function verifyAccount(account) {
  const transport = buildTransport(account);
  await transport.verify();
  return true;
}

async function sendMail(account, { to, subject, text }) {
  const transport = buildTransport(account);
  return transport.sendMail({
    from: account.smtpUser,
    to,
    subject,
    text
  });
}

// ---- OTP EMAIL ----
// Uses system SMTP credentials from .env (SYSTEM_SMTP_*) to send OTP emails.
// Falls back to console.log if not configured (for demo/testing).

function buildSystemTransport() {
  const host = process.env.SYSTEM_SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SYSTEM_SMTP_PORT) || 587;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function otpHtmlTemplate(name, otpCode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Verify your Oureach.ai account</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #DDE2EC;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#FFFBF2 0%,#FEF3D8 100%);padding:36px 40px 28px;text-align:center;border-bottom:1px solid #DDE2EC;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;background:#E09000;border-radius:50%;display:inline-block;"></span>
          <span style="color:#E09000;font-size:22px;font-weight:700;letter-spacing:-0.5px;">oureach<span style="color:#5A657A;font-weight:400;">.ai</span></span>
        </div>
        <div style="color:#5A657A;font-size:13px;margin-top:8px;letter-spacing:0.5px;">ACCOUNT VERIFICATION</div>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:40px 40px 32px;">
        <h2 style="color:#1A2035;font-size:22px;font-weight:600;margin:0 0 12px;">Verify your email address</h2>
        <p style="color:#5A657A;font-size:15px;line-height:1.6;margin:0 0 32px;">Hi ${name ? name : 'there'},<br>Use the 6-digit verification code below to complete your Oureach.ai account setup. This code expires in <strong style="color:#E09000;">10 minutes</strong>.</p>

        <!-- OTP Code Block -->
        <div style="background:#F5F7FA;border:1px solid #DDE2EC;border-radius:12px;padding:28px 20px;text-align:center;margin-bottom:32px;">
          <div style="letter-spacing:18px;font-size:42px;font-weight:700;color:#E09000;font-family:'Courier New',monospace;text-indent:18px;">${otpCode}</div>
          <div style="color:#8C97AC;font-size:12px;margin-top:12px;letter-spacing:0.5px;">VERIFICATION CODE</div>
        </div>

        <div style="background:#FFFBF2;border-left:3px solid #E09000;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
          <p style="color:#5A657A;font-size:13px;margin:0;">🔒 <strong style="color:#1A2035;">Security notice:</strong> Never share this code with anyone. Oureach.ai will never ask for it. If you didn't create an account, ignore this email.</p>
        </div>

        <p style="color:#8C97AC;font-size:13px;margin:0;">This email was sent to verify your Oureach.ai account registration. The code expires in 10 minutes.</p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#F5F7FA;padding:20px 40px;border-top:1px solid #DDE2EC;text-align:center;">
        <p style="color:#8C97AC;font-size:12px;margin:0;">Oureach.ai &mdash; Multi-channel outreach platform &bull; Built as a college project</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function loginOtpHtmlTemplate(name, otpCode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Oureach.ai login code</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #DDE2EC;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#FFFBF2 0%,#FEF3D8 100%);padding:36px 40px 28px;text-align:center;border-bottom:1px solid #DDE2EC;">
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <span style="width:10px;height:10px;background:#E09000;border-radius:50%;display:inline-block;"></span>
          <span style="color:#E09000;font-size:22px;font-weight:700;letter-spacing:-0.5px;">oureach<span style="color:#5A657A;font-weight:400;">.ai</span></span>
        </div>
        <div style="color:#5A657A;font-size:13px;margin-top:8px;letter-spacing:0.5px;">LOGIN CONFIRMATION</div>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:40px 40px 32px;">
        <h2 style="color:#1A2035;font-size:22px;font-weight:600;margin:0 0 12px;">Confirm your login</h2>
        <p style="color:#5A657A;font-size:15px;line-height:1.6;margin:0 0 32px;">Hi ${name ? name : 'there'},<br>Someone (hopefully you!) just tried to sign in to your Oureach.ai account. Enter the code below to confirm. It expires in <strong style="color:#E09000;">10 minutes</strong>.</p>

        <!-- OTP Code Block -->
        <div style="background:#F5F7FA;border:1px solid #DDE2EC;border-radius:12px;padding:28px 20px;text-align:center;margin-bottom:32px;">
          <div style="letter-spacing:18px;font-size:42px;font-weight:700;color:#E09000;font-family:'Courier New',monospace;text-indent:18px;">${otpCode}</div>
          <div style="color:#8C97AC;font-size:12px;margin-top:12px;letter-spacing:0.5px;">LOGIN CODE</div>
        </div>

        <div style="background:#FFF5F5;border-left:3px solid #E0414A;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
          <p style="color:#5A657A;font-size:13px;margin:0;">⚠️ <strong style="color:#1A2035;">Wasn't you?</strong> If you did not attempt to log in, your password may be compromised. Change it immediately and ignore this email.</p>
        </div>

        <p style="color:#8C97AC;font-size:13px;margin:0;">This code was triggered by a login attempt on your Oureach.ai account. It expires in 10 minutes.</p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#F5F7FA;padding:20px 40px;border-top:1px solid #DDE2EC;text-align:center;">
        <p style="color:#8C97AC;font-size:12px;margin:0;">Oureach.ai &mdash; Multi-channel outreach platform &bull; Built as a college project</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function sendOtpEmail(toEmail, otpCode, name) {
  const transport = buildSystemTransport();

  if (!transport) {
    // No system SMTP configured — log to console for demo/testing
    console.log('\n========================================');
    console.log('  [DEMO MODE] OTP EMAIL — Not sent via SMTP');
    console.log(`  To:   ${toEmail}`);
    console.log(`  Name: ${name || 'User'}`);
    console.log(`  OTP:  ${otpCode}`);
    console.log('  (Configure SYSTEM_SMTP_USER/PASS in .env to send real emails)');
    console.log('========================================\n');
    return { demo: true };
  }

  return transport.sendMail({
    from: `"Oureach.ai" <${process.env.SYSTEM_SMTP_USER}>`,
    to: toEmail,
    subject: `${otpCode} is your Oureach.ai verification code`,
    html: otpHtmlTemplate(name, otpCode),
    text: `Your Oureach.ai verification code is: ${otpCode}\nIt expires in 10 minutes. Do not share it with anyone.`
  });
}

async function sendLoginOtpEmail(toEmail, otpCode, name) {
  const transport = buildSystemTransport();

  if (!transport) {
    console.log('\n========================================');
    console.log('  [DEMO MODE] LOGIN OTP — Not sent via SMTP');
    console.log(`  To:   ${toEmail}`);
    console.log(`  Name: ${name || 'User'}`);
    console.log(`  OTP:  ${otpCode}`);
    console.log('  (Configure SYSTEM_SMTP_USER/PASS in .env to send real emails)');
    console.log('========================================\n');
    return { demo: true };
  }

  return transport.sendMail({
    from: `"Oureach.ai" <${process.env.SYSTEM_SMTP_USER}>`,
    to: toEmail,
    subject: `${otpCode} — Your Oureach.ai login confirmation code`,
    html: loginOtpHtmlTemplate(name, otpCode),
    text: `Your Oureach.ai login confirmation code is: ${otpCode}\nIt expires in 10 minutes. Do not share it with anyone.`
  });
}

module.exports = { verifyAccount, sendMail, sendOtpEmail, sendLoginOtpEmail };

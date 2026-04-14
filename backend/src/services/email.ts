import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    const auth =
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined;

    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: parseInt(process.env.SMTP_PORT || "1025"),
      secure: process.env.SMTP_SECURE === "true",
      auth,
    });
  }
  return _transporter;
}

// Inline SVG logo for email (simplified version of openbadge_platform_icon.svg)
const LOGO_SVG = `<svg width="56" height="56" viewBox="0 0 680 680" xmlns="http://www.w3.org/2000/svg">
<circle cx="340" cy="340" r="300" fill="none" stroke="#D4A843" stroke-width="6"/>
<path d="M340 100 L510 175 L510 355 Q510 505 340 585 Q170 505 170 355 L170 175 Z" fill="#1B3A5C"/>
<path d="M340 130 L485 195 L485 350 Q485 485 340 555 Q195 485 195 350 L195 195 Z" fill="#224872"/>
<polyline points="270,340 320,395 415,280" fill="none" stroke="#D4A843" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/**
 * Wraps email body content in an Outlook-compatible table layout.
 * Uses table-based layout, solid colors (no gradients), and inline styles.
 */
function wrapEmail(body: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>
table, td { font-family: Arial, sans-serif; }
a { color: #0077b5; }
</style>
<![endif]-->
<style>
body, table, td { font-family: Arial, 'Segoe UI', Helvetica, sans-serif; }
img { border: 0; display: block; }
a { color: #0077b5; }
@media only screen and (max-width: 620px) {
  .email-container { width: 100% !important; }
  .email-padding { padding: 24px 16px !important; }
}
</style>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
<tr><td align="center" style="padding:32px 16px;">

<!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border:1px solid #e0e0e0;">
${body}
</table>
<!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>`;
}

/**
 * Renders a CTA button that works in Outlook.
 * Uses VML for Outlook and standard HTML for everything else.
 */
function emailButton(text: string, href: string, bgColor: string, textColor: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
<tr><td align="center" style="background-color:${bgColor}; padding:14px 32px; mso-padding-alt:14px 32px;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:220px;" fillcolor="${bgColor}" stroke="f">
<w:anchorlock/>
<center style="color:${textColor};font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${href}" style="display:inline-block; background-color:${bgColor}; color:${textColor}; padding:14px 32px; text-decoration:none; font-weight:bold; font-size:14px; border-radius:6px; font-family:Arial,sans-serif;">${text}</a>
<!--<![endif]-->
</td></tr>
</table>`;
}

interface BadgeEmailParams {
  to: string;
  recipientName?: string;
  badgeName: string;
  issuerName: string;
  assertionId: string;
  description: string;
  issuedOn: Date;
  expires?: Date | null;
}

export async function sendBadgeEmail(params: BadgeEmailParams) {
  const email = encodeURIComponent(params.to);
  const viewUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/badges/${params.assertionId}?identity_email=${email}`;
  const linkedInUrl = buildLinkedInUrl(params);
  const from = process.env.SMTP_FROM || `"OpenBadge Platform" <badges@openbadge.local>`;

  const issuedDate = params.issuedOn.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const body = `
<!-- Header -->
<tr>
<td align="center" style="background-color:#003566; padding:32px 24px;" class="email-padding">
  ${LOGO_SVG}
  <h1 style="color:#ffc300; margin:12px 0 0; font-size:20px; font-weight:bold; font-family:Arial,sans-serif;">
    Congratulations${params.recipientName ? `, ${params.recipientName}` : ""}!
  </h1>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:32px 32px 24px;" class="email-padding">
  <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 6px;">
    You have been awarded the badge:
  </p>
  <h2 style="color:#003566; font-size:22px; margin:0 0 4px; font-family:Arial,sans-serif;">
    ${params.badgeName}
  </h2>
  <p style="color:#666666; font-size:14px; margin:0 0 20px;">
    Issued by <strong>${params.issuerName}</strong> on ${issuedDate}
  </p>
  <p style="color:#555555; font-size:14px; line-height:1.7; margin:0 0 28px;">
    ${params.description}
  </p>

  <!-- View Badge Button -->
  ${emailButton("View Your Badge", viewUrl, "#ffc300", "#001d3d")}

  <div style="height:12px;"></div>

  <!-- LinkedIn Button -->
  ${emailButton("Add to LinkedIn", linkedInUrl, "#0077b5", "#ffffff")}
</td>
</tr>

<!-- Divider -->
<tr>
<td style="padding:0 32px;" class="email-padding">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="border-top:1px solid #e8e8e8;"></td></tr>
  </table>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:20px 32px 28px;" class="email-padding">
  <p style="color:#999999; font-size:12px; line-height:1.6; margin:0;">
    This credential is cryptographically signed with Ed25519 and complies with the Open Badges 2.0 and 3.0 standards.
  </p>
</td>
</tr>`;

  const info = await getTransporter().sendMail({
    from,
    to: params.to,
    subject: `You've earned a badge: ${params.badgeName}`,
    html: wrapEmail(body),
  });

  return info;
}

export async function sendInviteEmail(params: {
  to: string;
  recipientName?: string;
  badgeName: string;
  issuerName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  const from = process.env.SMTP_FROM || `"OpenBadge Platform" <badges@openbadge.local>`;

  const expiresDate = params.expiresAt.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const body = `
<!-- Header -->
<tr>
<td align="center" style="background-color:#003566; padding:32px 24px;" class="email-padding">
  ${LOGO_SVG}
  <h1 style="color:#ffc300; margin:12px 0 0; font-size:20px; font-weight:bold; font-family:Arial,sans-serif;">
    You've Been Invited!
  </h1>
</td>
</tr>

<!-- Body -->
<tr>
<td style="padding:32px 32px 24px;" class="email-padding">
  <p style="color:#333333; font-size:16px; line-height:1.6; margin:0 0 16px;">
    Hi${params.recipientName ? ` ${params.recipientName}` : ""},
  </p>
  <p style="color:#555555; font-size:14px; line-height:1.7; margin:0 0 8px;">
    <strong style="color:#333333;">${params.issuerName}</strong> has invited you to claim the badge:
  </p>
  <h2 style="color:#003566; font-size:22px; margin:0 0 16px; font-family:Arial,sans-serif;">
    ${params.badgeName}
  </h2>
  <p style="color:#555555; font-size:14px; line-height:1.7; margin:0 0 28px;">
    Click the button below to review and claim your credential. You'll be able to confirm or update your email and name before the badge is issued.
  </p>

  <!-- Claim Button -->
  ${emailButton("Claim Your Badge", params.inviteUrl, "#ffc300", "#001d3d")}
</td>
</tr>

<!-- Divider -->
<tr>
<td style="padding:0 32px;" class="email-padding">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="border-top:1px solid #e8e8e8;"></td></tr>
  </table>
</td>
</tr>

<!-- Footer -->
<tr>
<td style="padding:20px 32px 28px;" class="email-padding">
  <p style="color:#999999; font-size:12px; line-height:1.6; margin:0;">
    This invite expires on ${expiresDate}. Once claimed, your credential will be cryptographically signed and verifiable.
  </p>
</td>
</tr>`;

  await getTransporter().sendMail({
    from,
    to: params.to,
    subject: `You've been invited to claim: ${params.badgeName}`,
    html: wrapEmail(body),
  });
}

function buildLinkedInUrl(params: BadgeEmailParams): string {
  const email = encodeURIComponent(params.to);
  const viewUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/badges/${params.assertionId}?identity_email=${email}`;
  const issued = params.issuedOn;
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: params.badgeName,
    organizationName: params.issuerName,
    certUrl: viewUrl,
    certId: params.badgeName,
    issueYear: String(issued.getFullYear()),
    issueMonth: String(issued.getMonth() + 1),
  });
  if (params.expires) {
    p.set("expirationYear", String(params.expires.getFullYear()));
    p.set("expirationMonth", String(params.expires.getMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}

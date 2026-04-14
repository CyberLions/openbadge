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

    console.log(
      `[email] SMTP configured: host=${process.env.SMTP_HOST || "localhost"} port=${process.env.SMTP_PORT || "1025"} secure=${process.env.SMTP_SECURE === "true"} auth=${auth ? "yes" : "no"}`
    );
  }
  return _transporter;
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
  const viewUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/badges/${params.assertionId}`;
  const linkedInUrl = buildLinkedInUrl(params);
  const from = process.env.SMTP_FROM || `"OpenBadge Platform" <badges@openbadge.local>`;

  console.log(`[email] Sending badge notification to=${params.to} badge="${params.badgeName}" issuer="${params.issuerName}" from=${from}`);

  try {
    const info = await getTransporter().sendMail({
      from,
      to: params.to,
      subject: `You've earned a badge: ${params.badgeName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #000a18; border-radius: 12px; overflow: hidden; border: 1px solid #003566;">
          <div style="background: linear-gradient(135deg, #001d3d, #003566); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffc300; margin: 0; font-size: 22px; letter-spacing: 1px;">
              Congratulations${params.recipientName ? `, ${params.recipientName}` : ""}!
            </h1>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #e8edf4; font-size: 16px; line-height: 1.6; margin: 0 0 8px;">
              You have been awarded the <strong style="color: #ffc300;">${params.badgeName}</strong> badge
              by <strong style="color: #5aa9e6;">${params.issuerName}</strong>.
            </p>
            <p style="color: #7b8fa8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">${params.description}</p>
            <div style="margin: 0 0 16px;">
              <a href="${viewUrl}"
                 style="background: linear-gradient(135deg, #ffc300, #e6b000); color: #000814; padding: 14px 28px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">
                View Your Badge
              </a>
            </div>
            <div style="margin: 0 0 28px;">
              <a href="${linkedInUrl}"
                 style="background: linear-gradient(135deg, #0077b5, #005f8d); color: white; padding: 14px 28px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 14px; letter-spacing: 0.3px;">
                Add to LinkedIn Profile
              </a>
            </div>
            <div style="border-top: 1px solid #003566; padding-top: 20px;">
              <p style="color: #7b8fa8; font-size: 12px; margin: 0;">
                This badge was issued using the Open Badges standard (v2.0 + v3.0) and is cryptographically signed.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log(`[email] Sent successfully to=${params.to} messageId=${info.messageId} response="${info.response}"`);
    return info;
  } catch (err) {
    console.error(`[email] FAILED to=${params.to} badge="${params.badgeName}"`, err);
    throw err;
  }
}

function buildLinkedInUrl(params: BadgeEmailParams): string {
  const viewUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/badges/${params.assertionId}`;
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

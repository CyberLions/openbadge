import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "1025"),
  secure: process.env.SMTP_SECURE === "true",
});

interface BadgeEmailParams {
  to: string;
  recipientName?: string;
  badgeName: string;
  issuerName: string;
  assertionId: string;
  description: string;
}

export async function sendBadgeEmail(params: BadgeEmailParams) {
  const viewUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/badges/${params.assertionId}`;
  const linkedInUrl = buildLinkedInUrl(params);

  await transporter.sendMail({
    from: `"OpenBadge Platform" <badges@openbadge.local>`,
    to: params.to,
    subject: `You've earned a badge: ${params.badgeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1a56db;">Congratulations${params.recipientName ? `, ${params.recipientName}` : ""}!</h1>
        <p>You have been awarded the <strong>${params.badgeName}</strong> badge by <strong>${params.issuerName}</strong>.</p>
        <p>${params.description}</p>
        <div style="margin: 24px 0;">
          <a href="${viewUrl}"
             style="background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Your Badge
          </a>
        </div>
        <div style="margin: 24px 0;">
          <a href="${linkedInUrl}"
             style="background: #0077b5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Add to LinkedIn Profile
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This badge was issued using the Open Badges 2.0 standard and is cryptographically signed.
        </p>
      </div>
    `,
  });
}

function buildLinkedInUrl(params: BadgeEmailParams): string {
  const viewUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/badges/${params.assertionId}`;
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: params.badgeName,
    certUrl: viewUrl,
    certId: params.assertionId,
  });
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}

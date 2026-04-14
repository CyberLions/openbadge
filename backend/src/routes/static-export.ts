import { Router } from "express";
import { prisma } from "../utils/prisma";
import {
  buildIssuerProfile,
  buildBadgeClassJsonLd,
  buildAssertionJsonLd,
} from "../services/openbadges";

export const staticExportRouter = Router();

/**
 * Export all data for an issuer as a JSON bundle suitable for
 * static-site verification (e.g. on GitHub Pages).
 *
 * Returns a JSON object containing all the files that should be
 * written to disk, plus markdown instructions.
 */
staticExportRouter.get("/:issuerId", async (req, res) => {
  const issuer = await prisma.issuer.findUnique({
    where: { id: req.params.issuerId },
    include: {
      signingKeys: { where: { active: true }, take: 1 },
      badgeClasses: {
        include: {
          assertions: {
            include: { badgeClass: { include: { issuer: true } } },
          },
        },
      },
    },
  });

  if (!issuer) return res.status(404).json({ error: "Issuer not found" });

  const keyId = issuer.signingKeys[0]?.id;
  const publicKeyPem = issuer.signingKeys[0]?.publicKeyPem;

  // Build all the JSON-LD files
  const files: Record<string, string> = {};

  // Issuer profile
  files["issuer.json"] = JSON.stringify(buildIssuerProfile(issuer, keyId), null, 2);

  // Public key
  if (keyId && publicKeyPem) {
    files["public-key.json"] = JSON.stringify({
      "@context": "https://w3id.org/openbadges/v2",
      type: "CryptographicKey",
      id: `./public-key.json`,
      owner: `./issuer.json`,
      publicKeyPem,
    }, null, 2);
  }

  // Badge classes
  for (const bc of issuer.badgeClasses) {
    const bcData = buildBadgeClassJsonLd({ ...bc, issuer });
    // Rewrite URLs to be relative
    bcData.issuer = "./issuer.json";
    files[`badge-classes/${bc.id}.json`] = JSON.stringify(bcData, null, 2);

    // Assertions for this badge class
    for (const assertion of bc.assertions) {
      const aData = buildAssertionJsonLd(assertion);
      aData.badge = `./badge-classes/${bc.id}.json`;
      files[`assertions/${assertion.id}.json`] = JSON.stringify(aData, null, 2);
    }
  }

  // Revocation list
  const revoked = await prisma.assertion.findMany({
    where: { badgeClass: { issuerId: issuer.id }, revoked: true },
    select: { id: true, revokedReason: true },
  });
  files["revocations.json"] = JSON.stringify({
    "@context": "https://w3id.org/openbadges/v2",
    type: "RevocationList",
    id: "./revocations.json",
    revokedAssertions: revoked.map(a => ({
      id: `./assertions/${a.id}.json`,
      revocationReason: a.revokedReason || "Revoked by issuer",
    })),
  }, null, 2);

  // Static verifier HTML
  files["index.html"] = buildStaticVerifierHtml(issuer.name, publicKeyPem || "");

  // Instructions
  files["README.md"] = buildReadme(issuer.name);

  res.json({
    issuerName: issuer.name,
    issuerId: issuer.id,
    fileCount: Object.keys(files).length,
    files,
  });
});

function buildStaticVerifierHtml(issuerName: string, publicKeyPem: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${issuerName} — Badge Verification</title>
<style>
  :root { --bg: #060d18; --surface: #0a1628; --border: #1a3050; --gold: #ffc300; --text: #e8edf4; --muted: #7b8fa8; --success: #22c55e; --danger: #e74c3c; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .container { max-width: 560px; width: 100%; padding: 48px 24px; text-align: center; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  .sub { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
  .drop { border: 2px dashed var(--border); border-radius: 12px; padding: 40px; cursor: pointer; transition: border-color .2s; margin-bottom: 16px; }
  .drop:hover, .drop.hover { border-color: var(--gold); }
  .drop p { color: var(--muted); }
  input[type=text] { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 14px; margin-bottom: 12px; }
  input:focus { outline: none; border-color: #5aa9e6; }
  button { padding: 10px 24px; background: var(--gold); color: #000; border: none; border-radius: 50px; font-weight: 700; cursor: pointer; font-size: 13px; }
  button:hover { filter: brightness(1.1); }
  .result { margin-top: 20px; padding: 16px; border-radius: 10px; text-align: left; }
  .result.ok { background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.25); }
  .result.fail { background: rgba(231,76,60,.1); border: 1px solid rgba(231,76,60,.25); }
  .result h3 { font-size: 14px; margin-bottom: 8px; }
  .result.ok h3 { color: var(--success); }
  .result.fail h3 { color: var(--danger); }
  .result pre { font-size: 11px; color: var(--muted); overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
  .or { color: var(--muted); font-size: 12px; margin: 16px 0; }
</style>
</head>
<body>
<div class="container">
  <h1>${issuerName}</h1>
  <p class="sub">Offline Badge Verification</p>

  <div class="drop" id="dropzone" onclick="document.getElementById('fileinput').click()">
    <input type="file" id="fileinput" accept="image/png" style="display:none" />
    <p>Drop a baked badge PNG here or click to browse</p>
  </div>

  <div class="or">— or verify by assertion ID —</div>

  <input type="text" id="assertionId" placeholder="Paste assertion UUID" />
  <button onclick="verifyById()">Verify</button>

  <div id="result"></div>
</div>
<script>
const PUBLIC_KEY_PEM = ${JSON.stringify(publicKeyPem)};

const dropzone = document.getElementById('dropzone');
const fileinput = document.getElementById('fileinput');

['dragover','dragenter'].forEach(e => dropzone.addEventListener(e, ev => { ev.preventDefault(); dropzone.classList.add('hover'); }));
['dragleave','drop'].forEach(e => dropzone.addEventListener(e, () => dropzone.classList.remove('hover')));
dropzone.addEventListener('drop', ev => { ev.preventDefault(); if (ev.dataTransfer.files[0]) handleFile(ev.dataTransfer.files[0]); });
fileinput.addEventListener('change', () => { if (fileinput.files[0]) handleFile(fileinput.files[0]); });

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const buf = new Uint8Array(reader.result);
    const data = extractBakedData(buf);
    if (!data) { showResult(false, 'No Open Badge data found in this image.'); return; }
    if (data.includes('.') && data.split('.').length === 3) {
      verifyJws(data);
    } else {
      showResult(false, 'This badge uses hosted verification: ' + data);
    }
  };
  reader.readAsArrayBuffer(file);
}

function extractBakedData(buf) {
  let offset = 8;
  while (offset < buf.length) {
    if (offset + 8 > buf.length) break;
    const dv = new DataView(buf.buffer, buf.byteOffset);
    const length = dv.getUint32(offset);
    const type = String.fromCharCode(...buf.slice(offset+4, offset+8));
    if (type === 'iTXt') {
      const chunk = buf.slice(offset+8, offset+8+length);
      let nullIdx = chunk.indexOf(0);
      if (nullIdx < 0) { offset += 12+length; continue; }
      const keyword = new TextDecoder('latin1').decode(chunk.slice(0, nullIdx));
      if (keyword === 'openbadges') {
        let pos = nullIdx + 3;
        const langEnd = chunk.indexOf(0, pos); if (langEnd < 0) { offset += 12+length; continue; }
        pos = langEnd + 1;
        const transEnd = chunk.indexOf(0, pos); if (transEnd < 0) { offset += 12+length; continue; }
        pos = transEnd + 1;
        return new TextDecoder('utf-8').decode(chunk.slice(pos));
      }
    }
    offset += 12 + length;
  }
  return null;
}

async function verifyJws(jws) {
  try {
    const [headerB64, payloadB64] = jws.split('.');
    const payload = JSON.parse(atob(payloadB64.replace(/-/g,'+').replace(/_/g,'/')));

    if (!PUBLIC_KEY_PEM) {
      showResult(false, 'No public key available for verification.', payload);
      return;
    }

    const pemBody = PUBLIC_KEY_PEM.replace(/-----[^-]+-----/g, '').replace(/\\s/g, '');
    const keyData = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey('spki', keyData, { name: 'Ed25519' }, false, ['verify']);

    const encoder = new TextEncoder();
    const signingInput = encoder.encode(jws.split('.').slice(0,2).join('.'));
    const sigB64 = jws.split('.')[2];
    const signature = Uint8Array.from(atob(sigB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify('Ed25519', key, signature, signingInput);
    showResult(valid, valid ? 'Signature verified successfully.' : 'Signature verification failed.', payload);
  } catch(e) {
    showResult(false, 'Verification error: ' + e.message);
  }
}

function verifyById() {
  const id = document.getElementById('assertionId').value.trim();
  if (!id) return;
  fetch('assertions/' + id + '.json')
    .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
    .then(data => {
      if (data.revoked) { showResult(false, 'This badge has been revoked.', data); return; }
      if (data.expires && new Date(data.expires) < new Date()) { showResult(false, 'This badge has expired.', data); return; }
      showResult(true, 'Assertion found and not revoked.', data);
    })
    .catch(() => showResult(false, 'Assertion not found in this export.'));
}

function showResult(ok, msg, data) {
  const el = document.getElementById('result');
  el.innerHTML = '<div class="result ' + (ok?'ok':'fail') + '"><h3>' + (ok?'Valid':'Invalid') + '</h3><p>' + msg + '</p>' + (data ? '<pre>' + JSON.stringify(data, null, 2) + '</pre>' : '') + '</div>';
}
</script>
</body>
</html>`;
}

function buildReadme(issuerName: string): string {
  return `# ${issuerName} — Static Badge Verification

This folder contains everything needed to verify badges issued by **${issuerName}** without
requiring the OpenBadge platform to be running.

## Contents

| File/Folder | Description |
|---|---|
| \`issuer.json\` | OB 2.0 Issuer Profile (JSON-LD) |
| \`public-key.json\` | Ed25519 public key for signature verification |
| \`badge-classes/\` | Badge class definitions |
| \`assertions/\` | Individual assertion JSON-LD files |
| \`revocations.json\` | List of revoked assertions |
| \`index.html\` | Self-contained verification page |
| \`README.md\` | This file |

## Hosting on GitHub Pages

1. Create a new GitHub repository (e.g. \`${issuerName.toLowerCase().replace(/\s+/g, "-")}-badges\`)
2. Upload all files from this export to the repository root
3. Go to **Settings > Pages** and enable GitHub Pages from the \`main\` branch
4. Your verification page will be live at \`https://<username>.github.io/<repo>/\`

## How Verification Works

The \`index.html\` page can verify badges two ways:

1. **Image Upload**: Users can upload a baked badge PNG. The page extracts the embedded
   JWS (JSON Web Signature) from the PNG iTXt chunk and verifies it against the issuer's
   Ed25519 public key — entirely client-side using the Web Crypto API. No server needed.

2. **Assertion ID Lookup**: Users can paste an assertion UUID. The page fetches the
   corresponding \`assertions/<id>.json\` file and checks for revocation/expiration.

## Updating

When new badges are issued or badges are revoked, re-export from the OpenBadge platform
and replace the files in this repository. The \`index.html\` verifier page is self-contained
and does not need to be updated.

## Security

- The public key in \`public-key.json\` is used for verification only
- Private keys are never exported
- Ed25519 signatures are verified entirely client-side
- No external API calls are made during verification
`;
}

#!/usr/bin/env node
/**
 * Mint locally-signed JWTs for each admin role.
 *
 * Usage:
 *   JWT_SECRET=<same-as-music-service> node scripts/mint-dev-tokens.js
 *
 * The music-service middleware reads `claims.role` (or the first entry in
 * `claims.roles`) so we set both. Tokens are HS256-signed with the shared
 * JWT_SECRET — the music-service will accept them on any /admin route.
 *
 * Paste the token for the role you want to test into the browser console:
 *
 *   localStorage.setItem('wasaa_music_admin_token', '<token>');
 *   localStorage.setItem('wasaa_music_admin_user', JSON.stringify({
 *     id:'dev-super_admin', email:'super_admin@wasaa.dev',
 *     firstName:'Dev', lastName:'Super Admin', roles:['super_admin'],
 *   }));
 *   document.cookie = 'wasaa_music_admin_role=super_admin; path=/; max-age=604800';
 *   location.href = '/';
 */

const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('ERROR: JWT_SECRET env var is required (must match music-service prod).');
  process.exit(1);
}

const ROLES = [
  'super_admin',
  'music_admin',
  'admin',
  'finance_admin',
  'content_moderator',
  'support_agent',
  'artist_manager',
  'label_manager',
  'compliance_officer',
  'analytics_admin',
];

const LABELS = {
  super_admin:        'Super Admin',
  music_admin:        'Music Admin',
  admin:              'Admin',
  finance_admin:      'Finance Admin',
  content_moderator:  'Content Moderator',
  support_agent:      'Support Agent',
  artist_manager:     'Artist Manager',
  label_manager:      'Label Manager',
  compliance_officer: 'Compliance Officer',
  analytics_admin:    'Analytics Admin',
};

const b64url = (s) =>
  Buffer.from(typeof s === 'string' ? s : JSON.stringify(s))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const sign = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = b64url(header);
  const p = b64url(payload);
  const sig = crypto
    .createHmac('sha256', SECRET)
    .update(`${h}.${p}`)
    .digest('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
};

const now = Math.floor(Date.now() / 1000);
const rows = ROLES.map((role) => {
  const payload = {
    sub: `dev-${role}`,
    email: `${role}@wasaa.dev`,
    role,                     // primary claim music-service reads
    roles: [role],            // fallback claim
    identity_type: 'admin',
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  };
  return { role, label: LABELS[role], token: sign(payload) };
});

console.log('\n=== Wasaa Music Admin — dev tokens (7-day expiry) ===\n');
rows.forEach(({ role, label, token }) => {
  console.log(`## ${label}  (role: ${role})`);
  console.log(`Email:    ${role}@wasaa.dev`);
  console.log(`Password: <use dev-console snippet — no password check bypassed>`);
  console.log(`Token:    ${token}`);
  console.log('');
});

console.log('\n=== Paste into browser DevTools console to log in ===');
console.log('Pick the role you want and run:\n');
rows.forEach(({ role, label, token }) => {
  console.log(`// ---- ${label} ----`);
  console.log(
    `localStorage.setItem('wasaa_music_admin_token', '${token}');\n` +
      `localStorage.setItem('wasaa_music_admin_user', JSON.stringify({id:'dev-${role}',email:'${role}@wasaa.dev',firstName:'Dev',lastName:'${LABELS[role]}',roles:['${role}']}));\n` +
      `document.cookie = 'wasaa_music_admin_role=${role}; path=/; max-age=604800';\n` +
      `location.href = '/';\n`
  );
});

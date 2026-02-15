import CryptoJS from "crypto-js";

/**
 * AES-256-CBC encryption for Shopify access tokens.
 * Key: SHOPIFY_ENCRYPTION_KEY — must be a 64-char hex string (32 bytes).
 * Generate with: openssl rand -hex 32
 *
 * Format: "v1:{iv_hex}:{ciphertext_hex}"
 * The "v1:" prefix enables future key rotation.
 */

function getKey(): CryptoJS.lib.WordArray {
  const keyHex = process.env.SHOPIFY_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "SHOPIFY_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return CryptoJS.enc.Hex.parse(keyHex);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const ctHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  return `v1:${ivHex}:${ctHex}`;
}

export function decryptToken(encrypted: string): string {
  if (!encrypted.startsWith("v1:")) {
    throw new Error("Unknown encryption version");
  }
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }
  const [, ivHex, ctHex] = parts as [string, string, string];
  const key = getKey();
  const iv = CryptoJS.enc.Hex.parse(ivHex);
  const ciphertext = CryptoJS.enc.Hex.parse(ctHex);

  const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'apexcrm-encrypt-key-32chars-2026';
const IV_KEY = process.env.TOKEN_ENCRYPTION_IV || 'apexcrm-iv-16chr';

// Ensure key and IV are correct lengths for AES-256-CBC
const KEY = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
const IV = Buffer.from(IV_KEY.padEnd(16).slice(0, 16));

/**
 * Encrypts a plain text string using AES-256-CBC.
 * Used to securely store Facebook access tokens in the database.
 */
export function encrypt(text: string): string {
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypts a hex-encoded AES-256-CBC encrypted string.
 */
export function decrypt(encryptedText: string): string {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

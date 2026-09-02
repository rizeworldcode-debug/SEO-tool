const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard IV length for GCM (96 bits)

function getEncryptionKey() {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'FATAL SECURITY ERROR: ENCRYPTION_KEY environment variable is required and missing!\n' +
      'Please generate a secure 32-byte key using "node scripts/generateKeys.js" and set it in server/.env'
    );
  }
  
  const keyBuffer = Buffer.from(keyHex, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error(
      `FATAL SECURITY ERROR: ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars). Received ${keyBuffer.length} bytes.`
    );
  }
  
  return keyBuffer;
}

function assertEncryptionConfigured() {
  getEncryptionKey();
}

/**
 * Encrypt a text string using AES-256-GCM
 * @param {string} text 
 * @returns {{ iv: string, encryptedData: string, authTag: string }}
 */
function encryptText(text) {
  if (text === null || text === undefined) return null;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag
  };
}

/**
 * Decrypt an encrypted text object
 * @param {{ iv: string, encryptedData: string, authTag: string }} encryptedObj 
 * @returns {string}
 */
function decryptText(encryptedObj) {
  if (!encryptedObj || !encryptedObj.encryptedData || !encryptedObj.iv || !encryptedObj.authTag) {
    return null;
  }
  
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const authTag = Buffer.from(encryptedObj.authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Helper to encrypt off-page login object { email, password }
 */
function encryptCredentials(creds) {
  if (!creds || (!creds.email && !creds.password)) {
    return null;
  }
  const jsonStr = JSON.stringify({
    email: creds.email || '',
    password: creds.password || ''
  });
  return encryptText(jsonStr);
}

/**
 * Helper to decrypt off-page login object
 */
function decryptCredentials(encryptedObj) {
  if (!encryptedObj) return null;
  try {
    const jsonStr = decryptText(encryptedObj);
    if (!jsonStr) return null;
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[Encryption] Failed to decrypt credentials:', err.message);
    return null;
  }
}

module.exports = {
  assertEncryptionConfigured,
  encryptText,
  decryptText,
  encryptCredentials,
  decryptCredentials
};

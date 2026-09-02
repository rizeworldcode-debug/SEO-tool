const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateKeyHex(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

const envPath = path.join(__dirname, '../.env');

const encryptionKey = generateKeyHex(32); // 64 hex chars = 32 bytes
const jwtSecret = generateKeyHex(32);

const envContent = `# SEO Backlink Tracker Environment Config
PORT=5005
MONGO_URI=mongodb://localhost:27017/seo_tool_db
ENCRYPTION_KEY=${encryptionKey}
JWT_SECRET=${jwtSecret}
`;

console.log('====================================================');
console.log('SEO Backlink Tracker - Key Generator');
console.log('====================================================');
console.log(`Generated ENCRYPTION_KEY (32 bytes hex): ${encryptionKey}`);
console.log(`Generated JWT_SECRET (32 bytes hex):      ${jwtSecret}`);
console.log('----------------------------------------------------');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log(`Successfully created .env file at: ${envPath}`);
} else {
  console.log(`Notice: .env file already exists at ${envPath}.`);
  console.log(`To update, add or set:`);
  console.log(`ENCRYPTION_KEY=${encryptionKey}`);
  console.log(`JWT_SECRET=${jwtSecret}`);
}
console.log('====================================================');

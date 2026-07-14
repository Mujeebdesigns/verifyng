import fs from 'node:fs';
import path from 'node:path';

const __dirname = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);

const SERVER_TYPES_DIR = path.join(__dirname, 'server', 'src', 'types');
const CLIENT_TYPES_DIR = path.join(__dirname, 'client', 'src', 'types');

const FILES_TO_SYNC = [
  'auth.ts',
  'common.ts',
  'contact.ts',
  'review.ts',
  'vendor.ts',
];

console.log('⏳ Synchronizing types from server to client...');

try {
  // Ensure destination directory exists
  if (!fs.existsSync(CLIENT_TYPES_DIR)) {
    fs.mkdirSync(CLIENT_TYPES_DIR, { recursive: true });
  }

  for (const filename of FILES_TO_SYNC) {
    const srcPath = path.join(SERVER_TYPES_DIR, filename);
    const destPath = path.join(CLIENT_TYPES_DIR, filename);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Synced: ${filename}`);
    } else {
      console.warn(`⚠️ Warning: Source type file not found: ${filename}`);
    }
  }

  console.log('🎉 Type synchronization completed successfully!');
} catch (error) {
  console.error('❌ Type synchronization failed:', error);
  process.exit(1);
}

import { sendVerificationEmail } from '../src/utils/email.js';

async function run() {
  const testEmail = process.env.SMTP_USER;
  if (!testEmail) {
    console.error('❌ SMTP_USER is not defined in the environment.');
    process.exit(1);
  }
  console.log(`⏳ Sending test email to ${testEmail}...`);
  try {
    await sendVerificationEmail(testEmail, 'test-token-123456');
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

run();

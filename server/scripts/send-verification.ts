import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendVerificationEmail } from '../src/utils/email.js';

const prisma = new PrismaClient();

async function run() {
  const email = process.argv[2] || process.env.SMTP_USER;
  if (!email) {
    console.error('❌ Please specify an email address as an argument or in SMTP_USER.');
    process.exit(1);
  }

  console.log(`⏳ Finding user with email: ${email}...`);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    process.exit(1);
  }

  if (user.isVerified) {
    console.log(`ℹ️ User ${email} is already verified.`);
    process.exit(0);
  }

  console.log(`⏳ Generating verification token for user ID: ${user.id}...`);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing verification token for this user
  await prisma.verificationToken.deleteMany({
    where: { userId: user.id, type: 'EMAIL_VERIFICATION' },
  });

  // Save new verification token (hashed)
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token: hashedVerificationToken,
      type: 'EMAIL_VERIFICATION',
      expiresAt,
    },
  });

  console.log(`⏳ Sending verification email to ${email}...`);
  await sendVerificationEmail(email, verificationToken);
  console.log(`✅ Verification email sent successfully to ${email}!`);
  
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('❌ Error running script:', err);
  process.exit(1);
});

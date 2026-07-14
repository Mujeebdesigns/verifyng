import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('❌ Error: Please specify the email address of the user to promote.');
    console.log('Usage: npx tsx prisma/promote.ts <email>');
    process.exit(1);
  }

  try {
    const user = await prisma.user.update({
      where: { email: email.trim() },
      data: { role: 'ADMIN' },
    });
    console.log(`✅ Success: Promoted "${user.displayName}" (${user.email}) to ADMIN.`);
  } catch (error) {
    console.error(`❌ Error: User with email "${email}" not found.`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

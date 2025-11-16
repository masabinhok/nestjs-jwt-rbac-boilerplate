import { PrismaClient, UserRole } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Use 12 rounds for bcrypt as per security standards
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const userPassword = await bcrypt.hash('User@123', 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // Create regular user
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      fullName: 'Regular User',
      role: UserRole.USER,
      isActive: true,
    },
  });

  console.log('✅ Seeding completed');
  console.log('\n📋 Test Credentials:');
  console.log('===================');
  console.log('Admin User:');
  console.log('  Email:', admin.email);
  console.log('  Password: Admin@123');
  console.log('  Role:', admin.role);
  console.log('\nRegular User:');
  console.log('  Email:', user.email);
  console.log('  Password: User@123');
  console.log('  Role:', user.role);
  console.log('\n⚠️  Note: Passwords meet strong validation requirements:');
  console.log('   - Minimum 8 characters');
  console.log('   - At least one uppercase letter');
  console.log('   - At least one lowercase letter');
  console.log('   - At least one number');
  console.log('   - At least one special character');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

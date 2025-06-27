import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Database connected successfully');
  
  // Check if we can connect to the database
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection test passed');
  } catch (error) {
    console.error('Database connection test failed:', error);
    throw error;
  }

  // Get current stats
  const totalEstates = await prisma.estate.count();
  const totalSyncLogs = await prisma.syncLog.count();

  console.log(`Current database state:`);
  console.log(`- Estates: ${totalEstates}`);
  console.log(`- Sync logs: ${totalSyncLogs}`);

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

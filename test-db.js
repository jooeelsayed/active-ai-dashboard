const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const settings = await prisma.settings.findFirst();
    console.log("Settings query:", settings);
    
    // Check if rolePermissions column exists or causes an error
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: { rolePermissions: settings.rolePermissions || '{}' }
      });
      console.log("Update OK");
    } else {
      await prisma.settings.create({
        data: { rolePermissions: '{}' }
      });
      console.log("Create OK");
    }
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();

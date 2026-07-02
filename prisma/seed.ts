import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@activeai.com' },
    update: {},
    create: {
      name: 'المدير العام',
      email: 'admin@activeai.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Create a manager
  const managerPassword = await bcrypt.hash('Manager@123', 12)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@activeai.com' },
    update: {},
    create: {
      name: 'مدير المبيعات',
      email: 'manager@activeai.com',
      passwordHash: managerPassword,
      role: 'MANAGER',
      isActive: true,
    },
  })
  console.log('✅ Manager user created:', manager.email)

  // Create default settings
  const settings = await prisma.settings.findFirst()
  if (!settings) {
    await prisma.settings.create({
      data: {
        companyName: 'Active Ai',
        logoPath: '/logo.png',
        currency: 'EGP',
        reminderDays: 7,
        whatsappTemplate: `أهلاً يا {customerName} 👋

اشتراك {productName} الخاص بحضرتك هينتهي يوم {endDate}.

تحب نجددلك الاشتراك؟ 🔄

Active Ai — خدمات الذكاء الاصطناعي ✨`,
      },
    })
    console.log('✅ Default settings created')
  }

  // Sample products
  const products = [
    {
      name: 'ChatGPT Plus',
      provider: 'OpenAI',
      category: 'CHATBOT' as const,
      planName: 'Plus',
      durationDays: 30,
      sellingPrice: 350,
      costPrice: 260,
      accountType: 'SHARED' as const,
      isActive: true,
      description: 'ChatGPT Plus - GPT-4o, DALL-E, etc.',
    },
    {
      name: 'Midjourney',
      provider: 'Midjourney',
      category: 'DESIGN' as const,
      planName: 'Basic',
      durationDays: 30,
      sellingPrice: 300,
      costPrice: 210,
      accountType: 'INDIVIDUAL' as const,
      isActive: true,
      description: 'Midjourney AI Image Generation',
    },
    {
      name: 'Claude Pro',
      provider: 'Anthropic',
      category: 'CHATBOT' as const,
      planName: 'Pro',
      durationDays: 30,
      sellingPrice: 320,
      costPrice: 240,
      accountType: 'INDIVIDUAL' as const,
      isActive: true,
      description: 'Claude Pro - Sonnet 3.5',
    },
    {
      name: 'Canva Pro',
      provider: 'Canva',
      category: 'DESIGN' as const,
      planName: 'Pro',
      durationDays: 30,
      sellingPrice: 150,
      costPrice: 90,
      accountType: 'INVITATION' as const,
      isActive: true,
      description: 'Canva Pro - دعوة',
    },
    {
      name: 'Adobe Firefly',
      provider: 'Adobe',
      category: 'DESIGN' as const,
      planName: 'Premium',
      durationDays: 30,
      sellingPrice: 250,
      costPrice: 190,
      accountType: 'INDIVIDUAL' as const,
      isActive: true,
    },
  ]

  for (const product of products) {
    const existing = await prisma.product.findFirst({ where: { name: product.name } })
    if (!existing) {
      await prisma.product.create({
        data: product,
      })
    }
  }
  console.log(`✅ ${products.length} products seeded`)

  // Sample customers
  const sampleCustomers = [
    { name: 'أحمد محمود علي', phone: '01012345678', whatsapp: '01012345678', source: 'FACEBOOK' as const, status: 'ACTIVE' as const },
    { name: 'فاطمة إبراهيم', phone: '01098765432', whatsapp: '01098765432', source: 'WHATSAPP' as const, status: 'NEW' as const },
    { name: 'محمد عبد الله', phone: '01123456789', source: 'REFERRAL' as const, status: 'ACTIVE' as const },
  ]

  for (const customer of sampleCustomers) {
    const existing = await prisma.customer.findFirst({ where: { phone: customer.phone } })
    if (!existing) {
      await prisma.customer.create({
        data: {
          ...customer,
          createdById: admin.id,
          assignedToId: admin.id,
        },
      })
    }
  }
  console.log('✅ Sample customers seeded')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n🔐 Login credentials:')
  console.log('  Admin: admin@activeai.com / Admin@123456')
  console.log('  Manager: manager@activeai.com / Manager@123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

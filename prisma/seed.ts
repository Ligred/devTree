import { PrismaClient } from '@prisma/client';

import { hashPassword } from '../lib/auth/password';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Default admin account (created when ADMIN_PASSWORD is set)
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@localhost').trim().toLowerCase();
  if (adminPassword && adminEmail) {
    const hashed = await hashPassword(adminPassword);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: { password: hashed, name: process.env.ADMIN_NAME ?? 'Admin' },
      create: {
        email: adminEmail,
        password: hashed,
        name: process.env.ADMIN_NAME ?? 'Admin',
      },
    });
    console.log('Admin account:', admin.email);
  } else if (!adminPassword) {
    console.log('Skipping admin account (ADMIN_PASSWORD not set).');
  }

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@devtree.local' },
    update: {},
    create: {
      email: 'demo@devtree.local',
      name: 'Demo User',
    },
  });

  console.log('Created user:', user.email);

  // Create sample pages
  const reactPage = await prisma.page.upsert({
    where: { id: 'seed-react-hooks' },
    update: {},
    create: {
      id: 'seed-react-hooks',
      title: 'React Hooks',
      ownerId: user.id,
      blocks: {
        create: [
          {
            type: 'text',
            order: 0,
            content:
              '<h2>What are React Hooks?</h2><p>React Hooks allow you to use <strong>state</strong> and other React features in functional components.</p>',
          },
          {
            type: 'code',
            order: 1,
            content: {
              code: 'const [count, setCount] = useState(0);',
              language: 'javascript',
            },
          },
          {
            type: 'table',
            order: 2,
            content: {
              headers: ['Hook', 'Purpose'],
              rows: [
                ['useState', 'Manage local state'],
                ['useEffect', 'Side effects'],
                ['useContext', 'Consume context'],
              ],
            },
          },
        ],
      },
    },
  });

  const tsPage = await prisma.page.upsert({
    where: { id: 'seed-typescript' },
    update: {},
    create: {
      id: 'seed-typescript',
      title: 'TypeScript Tips',
      ownerId: user.id,
      blocks: {
        create: [
          {
            type: 'text',
            order: 0,
            content:
              '<h2>TypeScript Best Practices</h2><p>TypeScript adds <strong>static typing</strong> to JavaScript, catching errors at compile-time.</p>',
          },
          {
            type: 'agenda',
            order: 1,
            content: {
              title: 'Must-know patterns',
              items: [
                { id: 'ts1', text: 'Enable strict mode', checked: true },
                { id: 'ts2', text: 'Use utility types: Partial, Pick, Omit', checked: false },
                { id: 'ts3', text: 'Prefer const assertions', checked: false },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Created pages:', reactPage.title, tsPage.title);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

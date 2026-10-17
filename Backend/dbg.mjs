import { prisma } from './src/db/prisma.js';

const user = await prisma.user.findFirst({
  where: { email: 'u_sarah@swams.com', active: true },
});
console.log('user:', user?.id, !!user);
if (user) {
  const { verifyPassword } = await import('./src/common/password.js');
  console.log('hash ok:', await verifyPassword(user.passwordHash, 'password'));
}

import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  // Route based on role
  if (user.role === 'SUPER_ADMIN') {
    redirect('/agency');
  }
  redirect('/dashboard');
}

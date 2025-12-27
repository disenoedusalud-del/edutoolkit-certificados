
import { getCurrentUser } from '@/lib/auth';
import { AdminDashboard } from '@/components/AdminDashboard';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect('/login');
    }

    return <AdminDashboard user={user} />;
}

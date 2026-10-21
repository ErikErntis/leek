import { redirect } from 'next/navigation';
import { requireAdmin } from '../lib/data';
export default async function Admin(){await requireAdmin();redirect('/ulevaatus');}

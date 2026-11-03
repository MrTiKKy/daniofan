import { redirect } from 'next/navigation';

/** Alias vechi → Setări / Magazine. */
export default function Page() {
  redirect('/admin/setari');
}

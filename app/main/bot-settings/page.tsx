import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { parseSessionValue, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { BotSettingsEditor } from '@/app/admin/bot-settings/[paletteId]/page';

export const dynamic = 'force-dynamic';

export default async function MyBotSettingsPage() {
  const store = await cookies();
  const session = parseSessionValue(store.get(SESSION_COOKIE_NAME)?.value);
  const paletteId = (session?.paletteId || '').toUpperCase();

  // middleware で弾かれるはずだがフォールバック
  if (!paletteId || !/^[A-Z][0-9]{4}$/.test(paletteId)) {
    redirect('/login?role=customer&next=/main/bot-settings');
  }

  return <BotSettingsEditor paletteId={paletteId} backHref="/main" />;
}

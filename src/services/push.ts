import { supabase } from '@/lib/supabase';

// Web Push (DEVELOPMENT.md §11).

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function savePushSubscription(sub: PushSubscriptionJSON): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const profileId = userData.user?.id;
  if (!profileId) throw new Error('Not authenticated');
  const endpoint = sub.endpoint;
  const p256dh = sub.keys?.p256dh;
  const auth = sub.keys?.auth;
  if (!endpoint || !p256dh || !auth) throw new Error('Invalid subscription');

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      profile_id: profileId,
      endpoint,
      p256dh,
      auth,
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw error;
}

/** Ask permission, subscribe with VAPID, persist to DB. */
export async function enablePushNotifications(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!vapid) throw new Error('Missing VITE_VAPID_PUBLIC_KEY');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'denied';

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    });
  }
  await savePushSubscription(sub.toJSON());
  return 'granted';
}

export async function disablePushNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await removePushSubscription(sub.endpoint);
  await sub.unsubscribe();
}

/** Send one notification to the current user (desktop Chrome is enough to verify). */
export async function sendTestPushToSelf(): Promise<{ sent: number }> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('Not authenticated');
  return notifyProfiles({
    profileIds: [id],
    title: '班級連 · 測試通知',
    body: '若你看到這則，推播已設定成功（電腦瀏覽器即可測，不必接手機）。',
    url: '/',
  });
}

/** Invoke Edge Function send_push (service or user JWT). */
export async function notifyProfiles(input: {
  profileIds: string[];
  title: string;
  body: string;
  url: string;
}): Promise<{ sent: number }> {
  if (input.profileIds.length === 0) return { sent: 0 };
  const { data, error } = await supabase.functions.invoke<{ sent?: number; error?: string }>(
    'send_push',
    { body: input },
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return { sent: data?.sent ?? 0 };
}

/** All guardian profile ids in a class (for class-wide pushes). */
export async function listClassGuardianIds(classId: string): Promise<string[]> {
  const { data: students, error: stErr } = await supabase
    .from('students')
    .select('id')
    .eq('class_id', classId);
  if (stErr) throw stErr;
  const ids = (students ?? []).map((s) => s.id as string);
  if (ids.length === 0) return [];
  const { data: gs, error } = await supabase
    .from('guardianships')
    .select('parent_id')
    .in('student_id', ids);
  if (error) throw error;
  return [...new Set((gs ?? []).map((g) => g.parent_id as string))];
}

export async function getClassTeacherId(classId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .maybeSingle();
  if (error) throw error;
  return (data?.teacher_id as string | undefined) ?? null;
}

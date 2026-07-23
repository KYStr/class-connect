// One-off local demo seed (UTF-8 safe). Run: node scripts/seedDemo.mjs
// Creates a stable teacher account + class + roster so the app has data to show.
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const admin = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = 'laoshi@demo.local';
const PASSWORD = 'demo1234';

// 1) Ensure teacher user exists.
let teacherId;
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const existing = list.users.find((u) => u.email === EMAIL);
if (existing) {
  teacherId = existing.id;
  console.log('teacher exists:', teacherId);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'teacher', display_name: '王老師' },
  });
  if (error) throw error;
  teacherId = data.user.id;
  console.log('teacher created:', teacherId);
}

// 2) Reset this teacher's classes (cascade removes students) for a clean demo.
await admin.from('classes').delete().eq('teacher_id', teacherId);

// 3) Create class.
const { data: cls, error: cErr } = await admin
  .from('classes')
  .insert({ teacher_id: teacherId, name: '一年甲班', office_hours: '週二、四 15:00–16:00' })
  .select('id')
  .single();
if (cErr) throw cErr;
console.log('class created:', cls.id);

// 4) Roster.
const roster = [
  { seat: '01', name: '小恩' },
  { seat: '02', name: '小柔' },
  { seat: '05', name: '阿哲' },
  { seat: '07', name: '小宇' },
  { seat: '11', name: '子晴' },
];
const { error: sErr } = await admin
  .from('students')
  .insert(roster.map((r) => ({ class_id: cls.id, seat: r.seat, name: r.name })));
if (sErr) throw sErr;

console.log(`done. login: ${EMAIL} / ${PASSWORD}  (students: ${roster.length})`);

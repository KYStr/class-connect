import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneShell, StatusBar, Button, useToast } from '@/ui';
import { signInWithPassword, signUp } from '@/services/auth';
import { hasSupabaseEnv, supabase } from '@/lib/supabase';
import type { Role } from '@/types/domain';

// Login for teachers and returning parents (SPEC 3.1.A).
// New parents should still start from /join/:code; this screen is for sign-in (both roles)
// and teacher sign-up.
export function LoginScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const resolveRoleAndGo = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      navigate('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .maybeSingle();
    const role = (profile?.role as Role | undefined) ?? 'teacher';
    navigate(role === 'parent' ? '/p' : '/t');
  };

  const submit = async () => {
    setErr('');
    if (!email || !password) {
      setErr('請輸入 Email 與密碼');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp({
          email,
          password,
          role: 'teacher',
          displayName: displayName || '老師',
        });
        toast('註冊成功，已登入');
        navigate('/t');
      } else {
        await signInWithPassword(email, password);
        toast('登入成功');
        await resolveRoleAndGo();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '登入失敗，請再試一次');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stage">
      <PhoneShell
        chrome={<StatusBar />}
        children={
          <div className="login">
            <div className="logo-badge">🎒</div>
            <div>
              <h3>{mode === 'signup' ? '建立老師帳號' : '歡迎回來'}</h3>
              <div className="sub">
                {mode === 'signup'
                  ? '註冊後即可建立班級'
                  : '老師與家長皆可由此登入'}
              </div>
            </div>

            {mode === 'signup' && (
              <div className="field">
                <label>顯示名稱</label>
                <input
                  className="in"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：王老師"
                />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input
                className="in"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="field">
              <label>密碼</label>
              <input
                className="in"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 碼"
              />
            </div>

            {err && (
              <div className="info" style={{ background: 'var(--pink-soft)', color: '#c33f4c' }}>
                {err}
              </div>
            )}

            <Button tone="amber" onClick={submit} disabled={busy}>
              {busy ? '處理中…' : mode === 'signup' ? '註冊並進入後台' : '登入'}
            </Button>
            <button
              className="ghost-btn"
              onClick={() => {
                setErr('');
                setMode(mode === 'signup' ? 'signin' : 'signup');
              }}
            >
              {mode === 'signup' ? '已有帳號？改為登入' : '第一次使用？建立老師帳號'}
            </button>

            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              新家長請用老師提供的邀請連結加入；加入後可用同一組帳密在此登入。
            </div>
            {!hasSupabaseEnv && (
              <div style={{ fontSize: 11, color: 'var(--pink)', lineHeight: 1.5 }}>
                尚未設定 Supabase 連線（.env）
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}

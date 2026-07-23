import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PhoneShell, StatusBar, Button, useToast } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { signInWithPassword, signUp } from '@/services/auth';
import { redeemInvite } from '@/services/invites';

// Parent invite binding (DEVELOPMENT.md §7.2, route /join/:code).
// Supports: new signup + bind, existing parent sign-in + bind, or already-signed-in parent bind.
export function JoinScreen() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { session, role, signOut } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [relation, setRelation] = useState('家長');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!displayName.trim()) {
      setErr('請輸入您的稱呼');
      return;
    }
    if (!session && (!email || !password)) {
      setErr('請輸入 Email 與密碼');
      return;
    }
    setBusy(true);
    try {
      if (!session) {
        if (authMode === 'signin') {
          await signInWithPassword(email, password);
        } else {
          await signUp({
            email,
            password,
            role: 'parent',
            displayName: displayName.trim(),
          });
        }
      }
      await redeemInvite({ code, displayName: displayName.trim(), relation });
      await qc.invalidateQueries();
      toast('綁定成功，歡迎加入');
      navigate('/p');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '綁定失敗，請確認邀請碼');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stage">
      <PhoneShell chrome={<StatusBar />}>
        <div className="login">
          <div className="logo-badge">🎒</div>
          <div>
            <h3>加入班級</h3>
            <div className="sub">邀請碼 · {code || '（缺少邀請碼）'}</div>
          </div>

          {session && role === 'teacher' ? (
            <>
              <div className="info" style={{ background: 'var(--pink-soft)', color: '#c33f4c' }}>
                您目前以老師身分登入，無法用老師帳號綁定孩子。請先登出，再用家長身分開啟邀請連結。
              </div>
              <Button tone="amber" onClick={() => void signOut()}>
                登出老師帳號
              </Button>
            </>
          ) : (
            <>
              <div className="field">
                <label>您的稱呼</label>
                <input
                  className="in"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：小宇媽媽"
                />
              </div>
              <div className="field">
                <label>與孩子關係</label>
                <select
                  className="in"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                >
                  <option>家長</option>
                  <option>父親</option>
                  <option>母親</option>
                  <option>祖父母</option>
                  <option>監護人</option>
                </select>
              </div>

              {!session && (
                <>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      width: '100%',
                      marginTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      className="read-btn"
                      style={{
                        flex: 1,
                        background: authMode === 'signup' ? 'var(--primary-soft)' : '#fff',
                      }}
                      onClick={() => {
                        setErr('');
                        setAuthMode('signup');
                      }}
                    >
                      註冊新帳號
                    </button>
                    <button
                      type="button"
                      className="read-btn"
                      style={{
                        flex: 1,
                        background: authMode === 'signin' ? 'var(--primary-soft)' : '#fff',
                      }}
                      onClick={() => {
                        setErr('');
                        setAuthMode('signin');
                      }}
                    >
                      已有帳號登入
                    </button>
                  </div>

                  <div className="field">
                    <label>Email</label>
                    <input
                      className="in"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="parent@example.com"
                    />
                  </div>
                  <div className="field">
                    <label>{authMode === 'signin' ? '密碼' : '設定密碼'}</label>
                    <input
                      className="in"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="至少 6 碼"
                    />
                  </div>
                </>
              )}

              {session && role === 'parent' && (
                <div className="info p">您已登入，確認後即可綁定此孩子。</div>
              )}

              {err && (
                <div className="info" style={{ background: 'var(--pink-soft)', color: '#c33f4c' }}>
                  {err}
                </div>
              )}

              <Button onClick={submit} disabled={busy}>
                {busy
                  ? '綁定中…'
                  : session
                    ? '確認綁定並進入清單'
                    : authMode === 'signin'
                      ? '登入並綁定'
                      : '註冊並綁定'}
              </Button>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                綁定後只會看到自己孩子的資料 🔐
              </div>
              <button className="ghost-btn" onClick={() => navigate('/login')}>
                已綁定過？改去登入頁
              </button>
            </>
          )}
        </div>
      </PhoneShell>
    </div>
  );
}

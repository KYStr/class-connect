import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { PhoneShell, StatusBar, Button, useToast } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { signUp } from '@/services/auth';
import { redeemInvite } from '@/services/invites';

// Parent invite binding (DEVELOPMENT.md §7.2, route /join/:code). Sign up (or use current
// session) then redeem the invite via the atomic Edge Function.
export function JoinScreen() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { session, role, signOut } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [relation, setRelation] = useState('家長');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!displayName) {
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
        await signUp({ email, password, role: 'parent', displayName });
      }
      await redeemInvite({ code, displayName, relation });
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
      <PhoneShell
        chrome={<StatusBar />}
        children={
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
              <select className="in" value={relation} onChange={(e) => setRelation(e.target.value)}>
                <option>家長</option>
                <option>父親</option>
                <option>母親</option>
                <option>祖父母</option>
                <option>監護人</option>
              </select>
            </div>

            {!session && (
              <>
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
                  <label>設定密碼</label>
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

            {err && (
              <div className="info" style={{ background: 'var(--pink-soft)', color: '#c33f4c' }}>
                {err}
              </div>
            )}

            <Button onClick={submit} disabled={busy}>
              {busy ? '綁定中…' : '綁定並進入我孩子的清單'}
            </Button>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              綁定後只會看到自己孩子的資料 🔐
            </div>
              </>
            )}
          </div>
        }
      />
    </div>
  );
}

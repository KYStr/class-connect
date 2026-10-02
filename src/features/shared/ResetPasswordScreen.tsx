import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PhoneShell, StatusBar, Button, useToast } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { updatePassword } from '@/services/auth';

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, session, recovering, clearRecovery, role } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (loading) {
    return (
      <div className="stage">
        <PhoneShell chrome={<StatusBar />} children={<div className="login" />} />
      </div>
    );
  }

  if (!recovering && !session) {
    return <Navigate to="/login" replace />;
  }

  const submit = async () => {
    setErr('');
    if (password.length < 6) {
      setErr('密碼至少 6 碼');
      return;
    }
    if (password !== confirm) {
      setErr('兩次密碼不一致');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      clearRecovery();
      toast('密碼已更新');
      navigate(role === 'parent' ? '/p' : role === 'teacher' ? '/t' : '/login', { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '更新失敗，請重開信件裡的連結');
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
              <h3>設定新密碼</h3>
              <div className="sub">請輸入一組新密碼，完成後即可繼續使用</div>
            </div>
            <div className="field">
              <label>新密碼</label>
              <input
                className="in"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 碼"
              />
            </div>
            <div className="field">
              <label>再輸入一次</label>
              <input
                className="in"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再輸入一次"
              />
            </div>
            {err && (
              <div className="info" style={{ background: 'var(--pink-soft)', color: '#c33f4c' }}>
                {err}
              </div>
            )}
            {!recovering && (
              <div className="info">若這不是從重設信件進來，請回到登入頁再按一次「忘記密碼」。</div>
            )}
            <Button tone="amber" onClick={() => void submit()} disabled={busy || !session}>
              {busy ? '更新中…' : '更新密碼'}
            </Button>
          </div>
        }
      />
    </div>
  );
}

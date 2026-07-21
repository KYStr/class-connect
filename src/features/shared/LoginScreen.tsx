import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneShell, StatusBar, Button } from '@/ui';
import { useAuth } from '@/app/AuthProvider';
import { hasSupabaseEnv } from '@/lib/supabase';

// Login (SPEC 3.1.A). P0: real auth is wired in P1; for now this previews either role
// so the shells are reviewable without a backend.
export function LoginScreen() {
  const { previewAs } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState('');

  const enterAs = (role: 'parent' | 'teacher') => {
    previewAs(role);
    navigate(role === 'teacher' ? '/t' : '/p');
  };

  return (
    <div className="stage">
      <PhoneShell
        chrome={<StatusBar />}
        children={
          <div className="login">
            <div className="logo-badge">🎒</div>
            <div>
              <h3>歡迎回來</h3>
              <div className="sub">用孩子的座號或姓名登入</div>
            </div>
            <div className="field">
              <label>座號 / 姓名</label>
              <input
                className="in"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="例如：07 · 小宇"
              />
            </div>
            <div className="field">
              <label>登入密碼</label>
              <input className="in" type="password" placeholder="請輸入密碼" />
            </div>
            <Button onClick={() => enterAs('parent')}>進入我孩子的專屬清單</Button>
            <button
              className="ghost-btn"
              style={{ borderColor: 'var(--accent)', color: '#c26a1f' }}
              onClick={() => enterAs('teacher')}
            >
              我是老師 · 進入後台
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              一個帳號只會看到自己孩子的資料 🔐
            </div>
            {!hasSupabaseEnv && (
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                （P0 預覽模式：尚未連接 Supabase，先選身份預覽介面）
              </div>
            )}
          </div>
        }
      />
    </div>
  );
}

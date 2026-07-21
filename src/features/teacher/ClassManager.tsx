import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, EmptyState, GhostButton, useToast } from '@/ui';
import { queryKeys } from '@/lib/queryKeys';
import { useMyClasses, useRoster } from '@/hooks/useClasses';
import { createClass } from '@/services/classes';
import { addStudents, parseRosterCsv } from '@/services/students';
import { createInvite, listInvites } from '@/services/invites';

// Teacher setup (SPEC 7.1 / DEVELOPMENT.md §7.1): create class → add students → invite parents.
export function ClassManager() {
  const { data: classes, isLoading } = useMyClasses();
  const cls = classes?.[0];

  if (isLoading) return <EmptyState>載入中…</EmptyState>;
  if (!cls) return <CreateClassForm />;
  return <RosterManager classId={cls.id} className={cls.name} />;
}

function CreateClassForm() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const mut = useMutation({
    mutationFn: () => createClass({ name: name.trim() || '一年甲班' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.classes.mine() });
      toast('班級已建立');
    },
  });
  return (
    <Card label="🏫 建立你的班級">
      <input
        className="in"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="班級名稱，例如：一年甲班"
      />
      <Button tone="amber" style={{ marginTop: 10 }} onClick={() => mut.mutate()} disabled={mut.isPending}>
        {mut.isPending ? '建立中…' : '建立班級'}
      </Button>
    </Card>
  );
}

function RosterManager({ classId, className }: { classId: string; className: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: roster } = useRoster(classId);
  const { data: invites } = useQuery({
    queryKey: ['invites', classId],
    queryFn: () => listInvites(classId),
  });
  const [csv, setCsv] = useState('');
  const [codes, setCodes] = useState<Record<string, string>>({});

  const addMut = useMutation({
    mutationFn: () => addStudents(classId, parseRosterCsv(csv)),
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      setCsv('');
      toast(`已加入 ${added.length} 位學生`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : '加入失敗'),
  });

  const inviteMut = useMutation({
    mutationFn: (studentId: string) => createInvite({ classId, studentId }),
    onSuccess: (inv) => {
      setCodes((m) => ({ ...m, [inv.studentId as string]: inv.code }));
      qc.invalidateQueries({ queryKey: ['invites', classId] });
    },
    onError: (e) => toast(e instanceof Error ? e.message : '產生邀請碼失敗'),
  });

  const usedByStudent = new Map<string, boolean>();
  (invites ?? []).forEach((i) => {
    if (i.studentId) usedByStudent.set(i.studentId, Boolean(i.usedAt) || usedByStudent.get(i.studentId) === true);
  });

  const linkFor = (code: string) => `${window.location.origin}/join/${code}`;

  return (
    <>
      <Card label={`👩‍🏫 ${className} · 名單（${roster?.length ?? 0}）`}>
        {roster && roster.length > 0 ? (
          roster.map((s) => {
            const code = codes[s.id];
            const bound = usedByStudent.get(s.id);
            return (
              <div key={s.id} className="rl" style={{ flexWrap: 'wrap' }}>
                <div className="seat">{s.seat}</div>
                <div className="nm">{s.name}</div>
                {bound ? (
                  <span className="st ok">已綁定</span>
                ) : (
                  <button
                    className="read-btn"
                    onClick={() => inviteMut.mutate(s.id)}
                    disabled={inviteMut.isPending}
                  >
                    產生邀請
                  </button>
                )}
                {code && (
                  <div style={{ width: '100%', marginTop: 6, display: 'flex', gap: 6 }}>
                    <input className="in" style={{ marginTop: 0, fontSize: 11 }} readOnly value={linkFor(code)} />
                    <button
                      className="addbtn"
                      title="複製連結"
                      onClick={() => {
                        void navigator.clipboard.writeText(linkFor(code));
                        toast('已複製邀請連結');
                      }}
                    >
                      ⧉
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState>尚未加入學生，用下方批次貼上名單</EmptyState>
        )}
      </Card>

      <Card label="➕ 批次加入學生">
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
          每行一位：<code>座號,姓名</code>（例如 <code>07,小宇</code>）
        </div>
        <textarea
          className="ta"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder={'01,小恩\n02,小柔\n07,小宇'}
          style={{ minHeight: 90 }}
        />
        <GhostButton style={{ marginTop: 8 }} onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          {addMut.isPending ? '加入中…' : '＋ 加入名單'}
        </GhostButton>
      </Card>
    </>
  );
}

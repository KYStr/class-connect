import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, EmptyState, GhostButton, useToast } from '@/ui';
import { queryKeys } from '@/lib/queryKeys';
import { useMyClasses, useRoster } from '@/hooks/useClasses';
import { createClass } from '@/services/classes';
import { addStudents, countGuardiansByStudent, parseRosterCsv } from '@/services/students';
import { activeInviteByStudent, createInvite, listInvites } from '@/services/invites';
import type { Student } from '@/types/domain';
import { InviteQrSheet } from './InviteQrSheet';
import { InvitePrintPreview, type PrintInviteRow } from './InvitePrintSheet';

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
    onSuccess: (created) => {
      // Optimistic so UI flips to roster / tour without a manual refresh.
      qc.setQueryData(queryKeys.classes.mine(), (prev: { id: string }[] | undefined) => {
        if (prev?.some((c) => c.id === created.id)) return prev;
        return [...(prev ?? []), created];
      });
      void qc.invalidateQueries({ queryKey: queryKeys.classes.mine() });
      void qc.invalidateQueries({ queryKey: queryKeys.features.forClass(created.id) });
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
    queryKey: queryKeys.invites.forClass(classId),
    queryFn: () => listInvites(classId),
  });
  const { data: guardianCounts } = useQuery({
    queryKey: queryKeys.students.guardianCounts(classId),
    queryFn: () => countGuardiansByStudent(classId),
  });
  const [csv, setCsv] = useState('');
  const [sheetStudent, setSheetStudent] = useState<Student | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printRows, setPrintRows] = useState<PrintInviteRow[] | null>(null);

  const activeByStudent = activeInviteByStudent(invites ?? []);

  const inviteMut = useMutation({
    mutationFn: (studentId: string) => createInvite({ classId, studentId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.invites.forClass(classId) });
      toast('邀請已產生');
    },
    onError: (e) => toast(e instanceof Error ? e.message : '產生邀請碼失敗'),
  });

  const batchInviteMut = useMutation({
    mutationFn: async (studentIds: string[]) => {
      for (const id of studentIds) {
        await createInvite({ classId, studentId: id });
      }
    },
    onSuccess: (_d, ids) => {
      void qc.invalidateQueries({ queryKey: queryKeys.invites.forClass(classId) });
      toast(`已為 ${ids.length} 位學生產生邀請`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : '批次產生失敗'),
  });

  const addMut = useMutation({
    mutationFn: () => addStudents(classId, parseRosterCsv(csv)),
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      setCsv('');
      toast(`已加入 ${added.length} 位學生`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : '加入失敗'),
  });

  useEffect(() => {
    const anyBound = [...(guardianCounts?.values() ?? [])].some((n) => n > 0);
    if (anyBound) {
      void qc.invalidateQueries({ queryKey: queryKeys.students.boundCount(classId) });
    }
  }, [guardianCounts, classId, qc]);

  const ensurePrintRows = async () => {
    const list = roster ?? [];
    const missing = list.filter((s) => !activeByStudent.get(s.id)).map((s) => s.id);
    if (missing.length > 0) {
      await batchInviteMut.mutateAsync(missing);
      const fresh = await listInvites(classId);
      const map = activeInviteByStudent(fresh);
      return list
        .map((s) => {
          const inv = map.get(s.id);
          return inv ? { student: s, code: inv.code } : null;
        })
        .filter((r): r is { student: Student; code: string } => Boolean(r));
    }
    return list
      .map((s) => {
        const inv = activeByStudent.get(s.id);
        return inv ? { student: s, code: inv.code } : null;
      })
      .filter((r): r is { student: Student; code: string } => Boolean(r));
  };

  const sheetCode = sheetStudent ? activeByStudent.get(sheetStudent.id)?.code : undefined;

  return (
    <div className="roster-stack">
      <Card label={`👩‍🏫 ${className} · 名單（${roster?.length ?? 0}）`}>
        {(roster?.length ?? 0) > 0 && (
          <div className="invite-toolbar">
            <GhostButton
              disabled={printBusy || batchInviteMut.isPending || !roster?.length}
              onClick={() => {
                void (async () => {
                  setPrintBusy(true);
                  try {
                    const rows = await ensurePrintRows();
                    if (rows.length === 0) {
                      toast('沒有可列印的邀請');
                      return;
                    }
                    setPrintRows(rows);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : '無法準備邀請單');
                  } finally {
                    setPrintBusy(false);
                  }
                })();
              }}
            >
              {printBusy || batchInviteMut.isPending ? '準備中…' : '列印／匯出邀請單'}
            </GhostButton>
          </div>
        )}
        {roster && roster.length > 0 ? (
          roster.map((s) => {
            const inv = activeByStudent.get(s.id);
            const gCount = guardianCounts?.get(s.id) ?? 0;
            return (
              <div key={s.id} className="rl" style={{ flexWrap: 'wrap' }}>
                <div className="seat">{s.seat}</div>
                <div className="nm">{s.name}</div>
                {gCount > 0 ? (
                  <span className="st ok">已綁定 {gCount} 位</span>
                ) : (
                  <span className="st">未綁定</span>
                )}
                {inv ? (
                  <button className="read-btn" type="button" onClick={() => setSheetStudent(s)}>
                    顯示邀請
                  </button>
                ) : (
                  <button
                    className="read-btn"
                    type="button"
                    onClick={() => inviteMut.mutate(s.id)}
                    disabled={inviteMut.isPending}
                  >
                    產生邀請
                  </button>
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

      {sheetStudent && sheetCode && (
        <InviteQrSheet
          student={sheetStudent}
          code={sheetCode}
          guardianCount={guardianCounts?.get(sheetStudent.id) ?? 0}
          busy={inviteMut.isPending}
          onClose={() => setSheetStudent(null)}
          onRegenerate={() => {
            inviteMut.mutate(sheetStudent.id, {
              onSuccess: () => toast('已重新產生邀請（舊連結失效）'),
            });
          }}
        />
      )}

      {printRows && (
        <InvitePrintPreview
          className={className}
          rows={printRows}
          onClose={() => setPrintRows(null)}
        />
      )}
    </div>
  );
}

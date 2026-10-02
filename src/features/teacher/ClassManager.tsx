import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, EmptyState, GhostButton, useToast } from '@/ui';
import { queryKeys } from '@/lib/queryKeys';
import { useMyClasses, useRoster } from '@/hooks/useClasses';
import { createClass } from '@/services/classes';
import {
  addStudents,
  countGuardiansByStudent,
  deleteStudent,
  normalizeSeat,
  updateStudent,
} from '@/services/students';
import { parseRosterText, type ParsedRosterRow } from '@/services/rosterParse';
import { activeInviteByStudent, createInvite, listInvites } from '@/services/invites';
import type { Student } from '@/types/domain';
import { InviteQrSheet } from './InviteQrSheet';
import { InvitePrintPreview, type PrintInviteRow } from './InvitePrintSheet';

const DEFAULT_SEAT_COUNT = 30;

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

  const [oneSeat, setOneSeat] = useState('');
  const [oneName, setOneName] = useState('');
  const [seatCount, setSeatCount] = useState(DEFAULT_SEAT_COUNT);
  const [gridNames, setGridNames] = useState<Record<string, string>>({});
  const [pasteText, setPasteText] = useState('');
  const [draftRows, setDraftRows] = useState<ParsedRosterRow[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSeat, setEditSeat] = useState('');
  const [editName, setEditName] = useState('');
  const [sheetStudent, setSheetStudent] = useState<Student | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printRows, setPrintRows] = useState<PrintInviteRow[] | null>(null);

  const activeByStudent = activeInviteByStudent(invites ?? []);
  const usedSeats = useMemo(
    () => new Set((roster ?? []).map((s) => normalizeSeat(s.seat))),
    [roster],
  );

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

  const updateMut = useMutation({
    mutationFn: (id: string) => updateStudent(id, { seat: editSeat, name: editName }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      setEditingId(null);
      toast('已更新學生');
    },
    onError: (e) => toast(e instanceof Error ? e.message : '更新失敗（座號可能重複）'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      void qc.invalidateQueries({ queryKey: queryKeys.students.guardianCounts(classId) });
      toast('已刪除學生');
    },
    onError: (e) => toast(e instanceof Error ? e.message : '刪除失敗'),
  });

  const addOneMut = useMutation({
    mutationFn: () => {
      const seat = normalizeSeat(oneSeat);
      const name = oneName.trim();
      if (!seat || !name) throw new Error('請填寫座號與姓名');
      if (usedSeats.has(seat)) throw new Error(`座號 ${seat} 已在名單中`);
      return addStudents(classId, [{ seat, name }]);
    },
    onSuccess: (added) => {
      void qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      setOneSeat('');
      setOneName('');
      toast(`已加入 ${added[0]?.name ?? '學生'}`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : '加入失敗'),
  });

  const addGridMut = useMutation({
    mutationFn: () => {
      const rows: { seat: string; name: string }[] = [];
      for (let i = 1; i <= seatCount; i++) {
        const seat = normalizeSeat(String(i));
        if (usedSeats.has(seat)) continue;
        const name = (gridNames[seat] ?? '').trim();
        if (name) rows.push({ seat, name });
      }
      if (rows.length === 0) throw new Error('請至少填一位學生姓名');
      return addStudents(classId, rows);
    },
    onSuccess: (added) => {
      void qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      setGridNames((prev) => {
        const next = { ...prev };
        for (const s of added) delete next[normalizeSeat(s.seat)];
        return next;
      });
      toast(`已加入 ${added.length} 位學生`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : '加入失敗'),
  });

  const parseMut = useMutation({
    mutationFn: () => parseRosterText(pasteText),
    onSuccess: (rows) => {
      setDraftRows(rows);
      toast(`辨識到 ${rows.length} 位，請確認後加入`);
    },
    onError: (e) => toast(e instanceof Error ? e.message : '辨識失敗'),
  });

  const addDraftMut = useMutation({
    mutationFn: () => {
      const rows = (draftRows ?? [])
        .map((r) => ({ seat: normalizeSeat(r.seat), name: r.name.trim() }))
        .filter((r) => r.seat && r.name && !usedSeats.has(r.seat));
      if (rows.length === 0) throw new Error('沒有可加入的新座號（可能都已在名單中）');
      return addStudents(classId, rows);
    },
    onSuccess: (added) => {
      void qc.invalidateQueries({ queryKey: queryKeys.students.roster(classId) });
      setDraftRows(null);
      setPasteText('');
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
        .filter((r): r is PrintInviteRow => Boolean(r));
    }
    return list
      .map((s) => {
        const inv = activeByStudent.get(s.id);
        return inv ? { student: s, code: inv.code } : null;
      })
      .filter((r): r is PrintInviteRow => Boolean(r));
  };

  const sheetCode = sheetStudent ? activeByStudent.get(sheetStudent.id)?.code : undefined;
  const filledGridCount = useMemo(() => {
    let n = 0;
    for (let i = 1; i <= seatCount; i++) {
      const seat = normalizeSeat(String(i));
      if (usedSeats.has(seat)) continue;
      if ((gridNames[seat] ?? '').trim()) n += 1;
    }
    return n;
  }, [seatCount, gridNames, usedSeats]);

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
            const editing = editingId === s.id;
            return (
              <div key={s.id} className="rl roster-person">
                {editing ? (
                  <div className="roster-person-edit">
                    <input
                      className="in roster-one-seat"
                      value={editSeat}
                      onChange={(e) => setEditSeat(e.target.value)}
                      aria-label="座號"
                    />
                    <input
                      className="in roster-one-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="姓名"
                    />
                    <button
                      className="read-btn"
                      type="button"
                      disabled={updateMut.isPending}
                      onClick={() => updateMut.mutate(s.id)}
                    >
                      儲存
                    </button>
                    <button className="read-btn" type="button" onClick={() => setEditingId(null)}>
                      取消
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="roster-person-main">
                      <div className="seat">{s.seat}</div>
                      <div className="nm">{s.name}</div>
                      {gCount > 0 ? (
                        <span className="st ok">已綁定 {gCount}</span>
                      ) : (
                        <span className="st">未綁定</span>
                      )}
                    </div>
                    <div className="roster-person-actions">
                      {inv ? (
                        <button className="read-btn" type="button" onClick={() => setSheetStudent(s)}>
                          邀請
                        </button>
                      ) : (
                        <button
                          className="read-btn"
                          type="button"
                          onClick={() => inviteMut.mutate(s.id)}
                          disabled={inviteMut.isPending}
                        >
                          邀請
                        </button>
                      )}
                      <button
                        className="read-btn"
                        type="button"
                        onClick={() => {
                          setEditingId(s.id);
                          setEditSeat(s.seat);
                          setEditName(s.name);
                        }}
                      >
                        改名
                      </button>
                      <button
                        className="read-btn"
                        type="button"
                        disabled={deleteMut.isPending}
                        onClick={() => {
                          const ok = window.confirm(
                            `刪除 ${s.seat} ${s.name}？邀請與綁定會一併移除，且無法復原。`,
                          );
                          if (ok) deleteMut.mutate(s.id);
                        }}
                      >
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState>尚未加入學生，用下方座號表或逐筆加入</EmptyState>
        )}
      </Card>

      <Card label="✍️ 依座號填姓名（整班一次）">
        <div className="roster-hint">
          像點名表一樣填姓名即可；空白座號會略過。已在名單中的座號會顯示「已加入」。
        </div>
        <div className="roster-count-row">
          <label htmlFor="seat-count">座號到</label>
          <input
            id="seat-count"
            className="in roster-count-in"
            type="number"
            min={1}
            max={60}
            value={seatCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              setSeatCount(Math.min(60, Math.max(1, Math.round(n))));
            }}
          />
        </div>
        <div className="roster-grid">
          {Array.from({ length: seatCount }, (_, idx) => {
            const seat = normalizeSeat(String(idx + 1));
            const taken = usedSeats.has(seat);
            return (
              <label key={seat} className={`roster-grid-row${taken ? ' is-taken' : ''}`}>
                <span className="roster-grid-seat">{seat}</span>
                {taken ? (
                  <span className="roster-grid-taken">已加入</span>
                ) : (
                  <input
                    className="in roster-grid-name"
                    value={gridNames[seat] ?? ''}
                    onChange={(e) =>
                      setGridNames((prev) => ({ ...prev, [seat]: e.target.value }))
                    }
                    placeholder="姓名"
                    autoComplete="off"
                  />
                )}
              </label>
            );
          })}
        </div>
        <Button
          tone="amber"
          style={{ marginTop: 10 }}
          onClick={() => addGridMut.mutate()}
          disabled={addGridMut.isPending || filledGridCount === 0}
        >
          {addGridMut.isPending ? '加入中…' : `一次加入已填 ${filledGridCount} 位`}
        </Button>
      </Card>

      <Card label="➕ 逐筆加入學生">
        <div className="roster-hint">補轉學生或臨時加 1～2 人時用這個最快。</div>
        <div className="roster-one-row">
          <input
            className="in roster-one-seat"
            value={oneSeat}
            onChange={(e) => setOneSeat(e.target.value)}
            placeholder="座號"
            inputMode="numeric"
            autoComplete="off"
          />
          <input
            className="in roster-one-name"
            value={oneName}
            onChange={(e) => setOneName(e.target.value)}
            placeholder="姓名"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addOneMut.mutate();
            }}
          />
          <GhostButton
            onClick={() => addOneMut.mutate()}
            disabled={addOneMut.isPending || !oneSeat.trim() || !oneName.trim()}
          >
            {addOneMut.isPending ? '…' : '加入'}
          </GhostButton>
        </div>
      </Card>

      <Card label="✨ 智慧貼上名單">
        <div className="roster-hint">
          從 Excel／行政系統複製貼上即可（格式亂一點也行）。也可選 .txt／.csv 檔。辨識後請先確認再加入。
        </div>
        <textarea
          className="ta"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={'例如：\n01 小恩\n2、小柔\n07,小宇'}
          style={{ minHeight: 100 }}
        />
        <div className="roster-smart-actions">
          <label className="roster-file-btn">
            選擇檔案
            <input
              type="file"
              accept=".txt,.csv,.tsv,text/plain,text/csv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                void file.text().then((text) => {
                  setPasteText(text);
                  setDraftRows(null);
                  toast(`已載入 ${file.name}`);
                });
              }}
            />
          </label>
          <GhostButton
            onClick={() => parseMut.mutate()}
            disabled={parseMut.isPending || !pasteText.trim()}
          >
            {parseMut.isPending ? '辨識中…' : '辨識名單'}
          </GhostButton>
        </div>

        {draftRows && (
          <div className="roster-draft">
            <div className="roster-draft-title">確認辨識結果（可修改）</div>
            {draftRows.map((row, idx) => {
              const seat = normalizeSeat(row.seat);
              const taken = usedSeats.has(seat);
              return (
                <div key={`${seat}-${idx}`} className={`roster-draft-row${taken ? ' is-taken' : ''}`}>
                  <input
                    className="in roster-one-seat"
                    value={row.seat}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftRows((prev) =>
                        (prev ?? []).map((r, i) => (i === idx ? { ...r, seat: v } : r)),
                      );
                    }}
                    aria-label="座號"
                  />
                  <input
                    className="in roster-one-name"
                    value={row.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setDraftRows((prev) =>
                        (prev ?? []).map((r, i) => (i === idx ? { ...r, name: v } : r)),
                      );
                    }}
                    aria-label="姓名"
                  />
                  <span className="roster-draft-flag">{taken ? '已有' : ''}</span>
                  <button
                    type="button"
                    className="ghost-btn roster-draft-del"
                    onClick={() =>
                      setDraftRows((prev) => (prev ?? []).filter((_, i) => i !== idx))
                    }
                  >
                    刪
                  </button>
                </div>
              );
            })}
            <div className="roster-smart-actions" style={{ marginTop: 10 }}>
              <GhostButton onClick={() => setDraftRows(null)}>取消</GhostButton>
              <Button
                tone="amber"
                onClick={() => addDraftMut.mutate()}
                disabled={addDraftMut.isPending || draftRows.length === 0}
              >
                {addDraftMut.isPending
                  ? '加入中…'
                  : `確認加入 ${draftRows.filter((r) => !usedSeats.has(normalizeSeat(r.seat))).length} 位`}
              </Button>
            </div>
          </div>
        )}
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

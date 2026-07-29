import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, useToast } from '@/ui';

export interface TaxonomyOption {
  id: string;
  name: string;
}

/** Select with inline「＋ 新增」and per-item delete (for subjects / exam types). */
export function TaxonomySelect({
  label,
  value,
  options,
  placeholder,
  addLabel,
  addPlaceholder,
  onChange,
  onAdd,
  onDelete,
  adding,
}: {
  label: string;
  value: string;
  options: TaxonomyOption[];
  placeholder: string;
  addLabel: string;
  addPlaceholder: string;
  onChange: (id: string) => void;
  onAdd: (name: string) => Promise<TaxonomyOption | void> | TaxonomyOption | void;
  onDelete: (id: string) => void;
  adding?: boolean;
}) {
  const { toast } = useToast();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [addingOpen, setAddingOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [host, setHost] = useState<HTMLElement | null>(null);

  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    setHost(document.querySelector('.phone .screen') as HTMLElement | null);
  }, []);

  useEffect(() => {
    if (!open || addingOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, addingOpen]);

  const closeAdd = () => {
    setAddingOpen(false);
    setDraft('');
  };

  const submitAdd = async () => {
    const name = draft.trim();
    if (!name) {
      toast('請輸入名稱');
      return;
    }
    try {
      const created = await onAdd(name);
      setDraft('');
      setAddingOpen(false);
      setOpen(false);
      if (created && 'id' in created) onChange(created.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : '新增失敗');
    }
  };

  const addLayer =
    addingOpen && host
      ? createPortal(
          <div className="tax-add-layer">
            <button
              type="button"
              className="tax-add-mask"
              aria-label="取消新增"
              onClick={closeAdd}
            />
            <div className="tax-add-sheet" role="dialog" aria-modal="true" aria-label={addLabel}>
              <div className="tax-add-title">{addLabel}</div>
              <input
                className="in tax-add-input"
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={addPlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitAdd();
                  if (e.key === 'Escape') closeAdd();
                }}
              />
              <div className="tax-add-actions">
                <button type="button" className="tax-btn ghost" onClick={closeAdd}>
                  取消
                </button>
                <Button
                  tone="amber"
                  disabled={adding || !draft.trim()}
                  onClick={() => void submitAdd()}
                >
                  {adding ? '新增中…' : '新增並選取'}
                </Button>
              </div>
            </div>
          </div>,
          host,
        )
      : null;

  return (
    <div className="field tax-field" ref={rootRef}>
      <label>{label}</label>
      <button
        type="button"
        className="in tax-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((v) => !v);
          setAddingOpen(false);
        }}
      >
        <span className={selected ? '' : 'tax-placeholder'}>
          {selected?.name ?? placeholder}
        </span>
        <span className="tax-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && !addingOpen && (
        <div className="tax-menu" id={listId} role="listbox">
          {options.length === 0 && <div className="tax-empty">尚無選項，請先新增</div>}
          {options.map((o) => (
            <div key={o.id} className="tax-row">
              <button
                type="button"
                className={`tax-opt${o.id === value ? ' on' : ''}`}
                role="option"
                aria-selected={o.id === value}
                onClick={() => {
                  onChange(o.id);
                  setOpen(false);
                }}
              >
                {o.name}
              </button>
              <button
                type="button"
                className="tax-del"
                title="刪除此選項"
                aria-label={`刪除 ${o.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (value === o.id) onChange('');
                  onDelete(o.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="tax-add-opt"
            onClick={() => {
              setAddingOpen(true);
              setDraft('');
              setOpen(false);
            }}
          >
            ＋ {addLabel}
          </button>
        </div>
      )}

      {addLayer}
    </div>
  );
}

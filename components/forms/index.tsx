'use client';
import { ReactNode, useState, useRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useEffect, useMemo } from 'react';
import { X, ChevronDown, Upload, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* --------------------------------------------------------------------------
 * Layout primitives
 * -------------------------------------------------------------------------- */

export function FormSection({
  title, description, children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-2xl p-6">
      <div className="mb-5 pb-4 border-b border-border">
        <h3 className="text-sm font-bold text-text">{title}</h3>
        {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function FormRow({
  label, hint, required, error, children, className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-text-muted">
            {label}{required && <span className="text-destructive ml-0.5">*</span>}
          </span>
          {hint && <span className="text-[10px] text-text-muted">{hint}</span>}
        </div>
      )}
      {children}
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </label>
  );
}

export function FormGrid({
  cols = 2, children, className,
}: {
  cols?: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  const c = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-3', 4: 'grid-cols-2 md:grid-cols-4' }[cols];
  return <div className={cn('grid gap-4', c, className)}>{children}</div>;
}

export function FormFooter({
  onCancel, onSubmit, onSaveDraft, submitLabel = 'Save', busy, dirty,
}: {
  onCancel?: () => void;
  onSubmit?: () => void;
  onSaveDraft?: () => void;
  submitLabel?: string;
  busy?: boolean;
  dirty?: boolean;
}) {
  return (
    <div className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t border-border py-4 flex items-center justify-between gap-2 -mx-6 px-6 rounded-b-2xl">
      <p className="text-[11px] text-text-muted">
        {dirty ? 'You have unsaved changes' : ''}
      </p>
      <div className="flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-border bg-surface-2 text-text-muted hover:bg-surface-3 text-sm font-semibold"
          >
            Cancel
          </button>
        )}
        {onSaveDraft && (
          <button
            type="button"
            onClick={onSaveDraft}
            className="h-10 px-4 rounded-xl border border-border bg-surface-2 text-text hover:bg-surface-3 text-sm font-semibold"
          >
            Save draft
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="h-10 px-5 rounded-xl bg-brick hover:bg-brick-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * TextInput / TextArea / Select
 * -------------------------------------------------------------------------- */

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  invalid?: boolean;
  leading?: ReactNode;
}
export function TextInput({ className, invalid, leading, ...rest }: TextInputProps) {
  return (
    <div className={cn('relative', leading && 'flex items-center')}>
      {leading && <span className="absolute left-3 text-xs text-text-muted">{leading}</span>}
      <input
        {...rest}
        className={cn(
          'w-full h-10 px-3 rounded-xl bg-surface-2 border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 transition placeholder:text-text-muted/60',
          invalid ? 'border-destructive/50 focus:border-destructive/50' : 'border-border focus:border-brick',
          leading && 'pl-8',
          className,
        )}
      />
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}
export function TextArea({ className, invalid, rows = 4, ...rest }: TextAreaProps) {
  return (
    <textarea
      rows={rows}
      {...rest}
      className={cn(
        'w-full px-3 py-2.5 rounded-xl bg-surface-2 border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 transition placeholder:text-text-muted/60',
        invalid ? 'border-destructive/50' : 'border-border focus:border-brick',
        className,
      )}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
  invalid?: boolean;
  placeholder?: string;
}
export function Select({ className, invalid, options, placeholder, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={cn(
          'appearance-none w-full h-10 pl-3 pr-9 rounded-xl bg-surface-2 border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 transition cursor-pointer',
          invalid ? 'border-destructive/50' : 'border-border focus:border-brick',
          className,
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Toggle / Slider / Chip / Multi-select
 * -------------------------------------------------------------------------- */

export function Toggle({
  checked, onChange, label, description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <div className="flex-1">
        {label && <p className="text-sm font-medium text-text">{label}</p>}
        {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
      </div>
      <div className="relative shrink-0">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-10 h-5 bg-surface-3 border border-border rounded-full peer-checked:bg-brick transition" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5 shadow-sm" />
      </div>
    </label>
  );
}

export function Slider({
  value, onChange, min = 0, max = 100, step = 1, hint,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="flex-1 accent-brick"
        />
        <span className="text-sm font-semibold text-text w-10 text-right">{value}</span>
      </div>
      {hint && <p className="text-[11px] text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

export function ChipInput({
  value, onChange, placeholder = 'Add and press Enter',
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const push = () => {
    const t = text.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setText('');
  };
  return (
    <div className="min-h-10 w-full px-2 py-1.5 rounded-xl bg-surface-2 border border-border flex flex-wrap gap-1.5 items-center focus-within:border-brick">
      {value.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brick/10 text-brick text-xs font-semibold border border-brick/20">
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, ix) => ix !== i))}
            className="opacity-60 hover:opacity-100"
            aria-label={`Remove ${v}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); push(); }
          if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={push}
        placeholder={value.length ? '' : placeholder}
        className="flex-1 min-w-[8ch] bg-transparent text-sm outline-none px-1 py-1 placeholder:text-text-muted/60"
      />
    </div>
  );
}

export function MultiSelect({
  value, onChange, options, placeholder = 'Select…',
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const filtered = useMemo(
    () => options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())),
    [options, search],
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (v: string) =>
    value.includes(v) ? onChange(value.filter(x => x !== v)) : onChange([...value, v]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-10 px-3 py-1.5 rounded-xl bg-surface-2 border border-border flex flex-wrap items-center gap-1.5 text-left focus:border-brick"
      >
        {value.length === 0 ? (
          <span className="text-sm text-text-muted/60">{placeholder}</span>
        ) : (
          value.map(v => {
            const opt = options.find(o => o.value === v);
            return (
              <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brick/10 text-brick text-xs font-semibold border border-brick/20">
                {opt?.label ?? v}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); toggle(v); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); toggle(v); } }}
                  className="opacity-60 hover:opacity-100 cursor-pointer"
                >
                  <X size={11} />
                </span>
              </span>
            );
          })
        )}
        <ChevronDown size={13} className="ml-auto text-text-muted" />
      </button>
      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full h-9 px-3 text-sm bg-surface-2 border-b border-border outline-none"
          />
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && <p className="p-3 text-xs text-text-muted">No matches</p>}
            {filtered.map(o => {
              const on = value.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-surface-2',
                    on && 'text-brick font-semibold',
                  )}
                >
                  {o.label}
                  {on && <span className="w-2 h-2 rounded-full bg-brick" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * SearchableDropdown — single-select with async-ish search
 * -------------------------------------------------------------------------- */

export function SearchableDropdown({
  value, onChange, options, placeholder = 'Select…',
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string; subLabel?: string }>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const sel = options.find(o => o.value === value);
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(q.toLowerCase()) ||
    (o.subLabel ?? '').toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-border text-left flex items-center justify-between focus:border-brick"
      >
        <span className={cn('text-sm', sel ? 'text-text' : 'text-text-muted/60')}>
          {sel?.label ?? placeholder}
        </span>
        <ChevronDown size={13} className="text-text-muted" />
      </button>
      {open && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-xl max-h-64 overflow-hidden flex flex-col">
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full h-9 px-3 text-sm bg-surface-2 border-b border-border outline-none"
          />
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 && <p className="p-3 text-xs text-text-muted">No matches</p>}
            {filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 hover:bg-surface-2',
                  value === o.value && 'bg-brick/5',
                )}
              >
                <p className="text-sm text-text">{o.label}</p>
                {o.subLabel && <p className="text-[11px] text-text-muted">{o.subLabel}</p>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * DatePicker / DateTimePicker (native inputs, styled)
 * -------------------------------------------------------------------------- */

export function DatePicker({ value, onChange, min, max }: {
  value: string; onChange: (v: string) => void; min?: string; max?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min} max={max}
      className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick"
    />
  );
}
export function DateTimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick"
    />
  );
}

/* --------------------------------------------------------------------------
 * FileUpload / MultiFileUpload — client-side preview only. Real backend upload
 * would call the media service; for now we surface the file selection back so
 * forms can send the payload to their own endpoint.
 * -------------------------------------------------------------------------- */

export function FileUpload({
  value, onChange, accept = 'image/*', label = 'Choose file',
}: {
  value?: File | null | string;
  onChange: (f: File | null) => void;
  accept?: string;
  label?: string;
}) {
  const preview = typeof value === 'string'
    ? value
    : value
      ? URL.createObjectURL(value)
      : null;
  const isImg = accept.includes('image');
  return (
    <label className="block cursor-pointer">
      <div className="w-full min-h-24 rounded-xl border border-dashed border-border bg-surface-2 hover:bg-surface-3 p-3 flex items-center gap-3 transition">
        {preview ? (
          isImg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-[10px] text-text-muted">FILE</div>
          )
        ) : (
          <div className="w-16 h-16 rounded-lg bg-surface-3 border border-border flex items-center justify-center">
            <Upload size={16} className="text-text-muted" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {typeof value === 'string' ? 'Current file' : value ? value.name : label}
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {accept.replace(/,/g, ', ')} · click to change
          </p>
        </div>
      </div>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export function MultiFileUpload({
  value, onChange, accept = 'image/*',
}: {
  value: (File | string)[];
  onChange: (files: (File | string)[]) => void;
  accept?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {value.map((v, i) => {
          const src = typeof v === 'string' ? v : URL.createObjectURL(v);
          const isImg = accept.includes('image');
          return (
            <div key={i} className="relative w-full aspect-square rounded-lg border border-border overflow-hidden bg-surface-2">
              {isImg ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={src} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-text-muted">FILE</div>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, ix) => ix !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center"
                aria-label="Remove"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
        <label className="cursor-pointer w-full aspect-square rounded-lg border border-dashed border-border bg-surface-2 hover:bg-surface-3 flex items-center justify-center">
          <Plus size={16} className="text-text-muted" />
          <input
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            onChange={e => {
              const files = Array.from(e.target.files ?? []);
              onChange([...value, ...files]);
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * SubForm — repeating rows (credits, tiers, targeting rules, etc.)
 * -------------------------------------------------------------------------- */

export function SubForm<T>({
  items, onChange, addLabel = 'Add row', empty, renderRow, factory,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  addLabel?: string;
  empty?: ReactNode;
  renderRow: (item: T, i: number, update: (patch: Partial<T>) => void) => ReactNode;
  factory: () => T;
}) {
  return (
    <div className="space-y-2">
      {items.length === 0 && empty ? (
        <div className="rounded-xl bg-surface-2 border border-dashed border-border p-4 text-xs text-text-muted text-center">
          {empty}
        </div>
      ) : (
        items.map((item, i) => {
          const update = (patch: Partial<T>) => {
            const next = [...items];
            next[i] = { ...items[i], ...patch };
            onChange(next);
          };
          return (
            <div key={i} className="flex gap-2 items-start p-3 rounded-xl bg-surface-2 border border-border">
              <div className="flex-1">{renderRow(item, i, update)}</div>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, ix) => ix !== i))}
                className="w-8 h-8 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center"
                aria-label="Remove row"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })
      )}
      <button
        type="button"
        onClick={() => onChange([...items, factory()])}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-dashed border-brick/40 bg-brick/5 text-brick text-xs font-semibold hover:bg-brick/10"
      >
        <Plus size={13} /> {addLabel}
      </button>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * RichTextEditor — lightweight contenteditable (no external deps)
 * -------------------------------------------------------------------------- */

export function RichTextEditor({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const cmd = (c: string, v?: string) => {
    document.execCommand(c, false, v);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className={cn(
      'rounded-xl bg-surface-2 border overflow-hidden',
      focused ? 'border-brick ring-2 ring-brick/20' : 'border-border',
    )}>
      <div className="flex items-center gap-0.5 border-b border-border p-1 bg-surface/50">
        {[
          { cmd: 'bold', label: 'B', style: 'font-bold' },
          { cmd: 'italic', label: 'I', style: 'italic' },
          { cmd: 'underline', label: 'U', style: 'underline' },
          { cmd: 'insertUnorderedList', label: '•', style: '' },
          { cmd: 'insertOrderedList', label: '1.', style: '' },
        ].map(b => (
          <button
            key={b.cmd}
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => cmd(b.cmd)}
            className={cn('w-7 h-7 rounded text-text-muted hover:bg-surface-3 text-xs', b.style)}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={e => onChange((e.target as HTMLDivElement).innerHTML)}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="min-h-[100px] p-3 text-sm text-text outline-none prose-sm empty:before:content-[attr(data-placeholder)] empty:before:text-text-muted/60"
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * CountriesMultiSelect — pre-populated country list
 * -------------------------------------------------------------------------- */

const COUNTRIES = [
  { value: 'KE', label: 'Kenya' }, { value: 'UG', label: 'Uganda' },
  { value: 'TZ', label: 'Tanzania' }, { value: 'RW', label: 'Rwanda' },
  { value: 'ET', label: 'Ethiopia' }, { value: 'ZA', label: 'South Africa' },
  { value: 'NG', label: 'Nigeria' }, { value: 'GH', label: 'Ghana' },
  { value: 'EG', label: 'Egypt' }, { value: 'MA', label: 'Morocco' },
  { value: 'US', label: 'United States' }, { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' }, { value: 'AU', label: 'Australia' },
  { value: 'IN', label: 'India' }, { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' }, { value: 'ES', label: 'Spain' },
  { value: 'BR', label: 'Brazil' }, { value: 'MX', label: 'Mexico' },
];

export function CountriesMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return <MultiSelect value={value} onChange={onChange} options={COUNTRIES} placeholder="Select countries…" />;
}

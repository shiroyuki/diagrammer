interface Props {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (v: string | undefined) => void;
}

/** <input type=color> only accepts #rrggbb, but imported styles may be #rgb or a named color. */
export function toHex(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : fallback;
}

/** A color that can be "unset" so the theme default applies. */
export function ColorField({ label, value, fallback, onChange }: Props) {
  return (
    <div className="field">
      <label className="field-label">
        <input
          type="checkbox"
          checked={value !== undefined}
          onChange={(e) => onChange(e.target.checked ? fallback : undefined)}
        />
        {label}
      </label>
      <input
        type="color"
        aria-label={`${label} color`}
        disabled={value === undefined}
        value={toHex(value, fallback)}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

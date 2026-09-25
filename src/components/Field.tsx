import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, id, ...rest }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      <input id={inputId} {...rest} />
    </label>
  );
}

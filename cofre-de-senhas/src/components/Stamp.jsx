import { useEffect, useRef, useState } from "react";

const STYLES = {
  VAZIA: { color: "var(--color-paper-dim)", border: "var(--color-paper-dim)" },
  FRACA: { color: "var(--color-danger)", border: "var(--color-danger)" },
  REGULAR: { color: "var(--color-hazard)", border: "var(--color-hazard)" },
  FORTE: { color: "var(--color-safe)", border: "var(--color-safe)" },
  BLINDADA: { color: "var(--color-safe)", border: "var(--color-safe)" },
};

export default function Stamp({ label }) {
  const [animKey, setAnimKey] = useState(0);
  const prevLabel = useRef(label);

  useEffect(() => {
    if (prevLabel.current !== label) {
      setAnimKey((k) => k + 1);
      prevLabel.current = label;
    }
  }, [label]);

  const style = STYLES[label] || STYLES.VAZIA;

  return (
    <div
      key={animKey}
      className="stamp hit inline-flex items-center justify-center border-4 rounded-sm px-6 py-3 select-none"
      style={{
        color: style.color,
        borderColor: style.border,
      }}
    >
      <span className="font-display text-2xl md:text-3xl tracking-[0.2em] font-bold">
        {label}
      </span>
    </div>
  );
}

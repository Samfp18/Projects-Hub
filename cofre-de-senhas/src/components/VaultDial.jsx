export default function VaultDial({ locked, size = 40 }) {
  return (
    <div
      className="relative rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-300"
      style={{
        width: size,
        height: size,
        borderColor: locked ? "var(--color-paper-dim)" : "var(--color-safe)",
      }}
      role="img"
      aria-label={locked ? "Cofre trancado" : "Cofre destrancado"}
    >
      {/* Marcações do disco, como um dial de cofre de verdade */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute w-0.5 h-1.5"
          style={{
            backgroundColor: locked ? "var(--color-paper-dim)" : "var(--color-safe)",
            top: 2,
            left: "50%",
            transformOrigin: `1px ${size / 2 - 2}px`,
            transform: `rotate(${deg}deg)`,
          }}
        />
      ))}
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none">
        {locked ? (
          <>
            <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="var(--color-paper-dim)" strokeWidth="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="var(--color-paper-dim)" strokeWidth="2" />
          </>
        ) : (
          <>
            <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="var(--color-safe)" strokeWidth="2" />
            <path d="M8 11V7a4 4 0 0 1 7-2.5" stroke="var(--color-safe)" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
}

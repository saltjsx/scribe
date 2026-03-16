export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-[family-name:var(--font-playfair)] text-[20px] font-semibold tracking-[-0.01em] text-foreground ${className}`}
      style={{ fontFeatureSettings: '"liga", "kern"' }}
    >
      Scribe
    </span>
  );
}

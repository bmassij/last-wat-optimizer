/** Blinking orange dot with "!" for high-priority items */
export default function AlertDot({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  return (
    <span className={`lw-alert-dot ${size}${className ? ` ${className}` : ""}`} aria-hidden="true">
      !
    </span>
  );
}

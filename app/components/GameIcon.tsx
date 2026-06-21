interface GameIconProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

export default function GameIcon({ src, alt = "", size = 22, className = "" }: GameIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={`lw-icon inline-block object-contain flex-shrink-0 ${className}`}
    />
  );
}

import Image from "next/image";

interface SuivanLogoProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export default function SuivanLogo({
  size = 40,
  className = "",
  priority = false,
}: SuivanLogoProps) {
  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        alt="Suivan"
        className="object-cover"
        fill
        loading={priority ? "eager" : "lazy"}
        preload={priority}
        sizes={`${size}px`}
        src="/suivan-logo.jpeg"
      />
    </span>
  );
}

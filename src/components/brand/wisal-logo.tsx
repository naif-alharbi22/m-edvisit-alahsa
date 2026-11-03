import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Wisal identity. The SVGs in public/brand are the official Wisal artwork,
 * cropped to their drawn bounds so they can be sized by height alone.
 */
const LOGO = { src: "/brand/wisal-logo.svg", width: 882, height: 319 };
const MARK = { src: "/brand/wisal-mark.svg", width: 513, height: 556 };

/** Full lockup: W mark and the "وصال" wordmark. */
export function WisalLogo({ alt, className, priority }: { alt: string; className?: string; priority?: boolean }) {
  return (
    <Image
      src={LOGO.src}
      width={LOGO.width}
      height={LOGO.height}
      alt={alt}
      priority={priority}
      unoptimized
      className={cn("h-10 w-auto", className)}
    />
  );
}

/** The W mark alone, for compact spaces. Decorative unless `alt` is given. */
export function WisalMark({ alt = "", className }: { alt?: string; className?: string }) {
  return (
    <Image
      src={MARK.src}
      width={MARK.width}
      height={MARK.height}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      unoptimized
      className={cn("h-8 w-auto", className)}
    />
  );
}

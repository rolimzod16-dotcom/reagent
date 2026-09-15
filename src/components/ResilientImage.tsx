"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/** Replace stale or broken remote images without leaving a broken card. */
export function ResilientImage({
  src,
  fallbackSrc,
  alt,
  className,
  sizes,
  priority,
}: Props) {
  const [currentSrc, setCurrentSrc] = useState(src);

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
    />
  );
}

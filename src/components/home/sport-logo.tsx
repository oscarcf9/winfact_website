"use client";

import { useState } from "react";
import Image from "next/image";

export function SportLogo({
  src,
  name,
}: {
  src: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="text-navy/70 font-heading font-bold text-xs tracking-wide">
        {name}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={`${name} logo`}
      width={56}
      height={56}
      className="object-contain"
      onError={() => setFailed(true)}
      unoptimized
    />
  );
}

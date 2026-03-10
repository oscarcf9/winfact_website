import Image from "next/image";

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:mx-0">
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/30">
        <Image
          src="/images/hero-visual.avif"
          alt="Sports analytics dashboard showing data-driven betting insights"
          width={700}
          height={467}
          priority
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  );
}

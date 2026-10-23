import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-[56px] leading-none">Nothing is connected here.</h1>
        <p className="mt-4 text-ivory-dim">This page doesn&rsquo;t exist. The case queue is a good place to start.</p>
        <Link href="/cases" className="btn-primary mt-8 inline-block rounded-xl px-5 py-3 text-[14px] font-medium">Open case queue</Link>
      </div>
    </main>
  );
}

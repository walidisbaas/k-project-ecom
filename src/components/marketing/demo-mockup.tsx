"use client";

import Script from "next/script";

export function DemoMockup() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto max-w-[680px]">
        <div className="overflow-hidden rounded-2xl border border-mk-border shadow-[0_1px_3px_rgba(26,18,7,0.06),0_8px_32px_rgba(26,18,7,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset]">
          {/* @ts-expect-error -- Wistia web component loaded via external script */}
          <wistia-player media-id="gwvyoa82px" aspect="1.7777777777777777" />
        </div>
      </div>

      <Script src="https://fast.wistia.com/player.js" strategy="lazyOnload" />
      <Script
        src="https://fast.wistia.com/embed/gwvyoa82px.js"
        strategy="lazyOnload"
        type="module"
      />

      <style jsx global>{`
        wistia-player[media-id='gwvyoa82px']:not(:defined) {
          background: center / contain no-repeat
            url('https://fast.wistia.com/embed/medias/gwvyoa82px/swatch');
          display: block;
          filter: blur(5px);
          padding-top: 56.25%;
        }
      `}</style>
    </section>
  );
}

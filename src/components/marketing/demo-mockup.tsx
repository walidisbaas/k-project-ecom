"use client";

import { useEffect, useRef, useState } from "react";

export function DemoMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Only load Wistia scripts once the section scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;

    const player = document.createElement("script");
    player.src = "https://fast.wistia.com/player.js";
    player.async = true;

    const embed = document.createElement("script");
    embed.src = "https://fast.wistia.com/embed/gwvyoa82px.js";
    embed.async = true;
    embed.type = "module";

    document.head.appendChild(player);
    document.head.appendChild(embed);

    return () => {
      document.head.removeChild(player);
      document.head.removeChild(embed);
    };
  }, [visible]);

  return (
    <section className="px-6 pb-20">
      <div ref={containerRef} className="mx-auto max-w-[960px]">
        <div className="relative overflow-hidden rounded-2xl border border-mk-border shadow-[0_1px_3px_rgba(26,18,7,0.06),0_8px_32px_rgba(26,18,7,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset]">
          {/* Reserve space with 16:9 ratio to prevent layout shift */}
          <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
            {visible ? (
              <div
                className="absolute inset-0"
                dangerouslySetInnerHTML={{
                  __html: `<wistia-player media-id="gwvyoa82px" aspect="1.7777777777777777" style="width:100%;height:100%;position:absolute;inset:0;"></wistia-player>`,
                }}
              />
            ) : (
              <div
                className="absolute inset-0 animate-pulse bg-mk-bg"
                style={{
                  backgroundImage:
                    "url('https://fast.wistia.com/embed/medias/gwvyoa82px/swatch')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(5px)",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

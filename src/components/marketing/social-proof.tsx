export function SocialProof() {
  return (
    <section className="relative px-6 py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,241,224,0.2)] to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-[600px] text-center">
        {/* Stars */}
        <div className="flex justify-center gap-1 text-3xl text-[#F6A623]">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} aria-hidden="true">
              ★
            </span>
          ))}
        </div>

        {/* Quote */}
        <blockquote className="mt-6 font-heading text-[clamp(20px,3.2vw,28px)] italic leading-relaxed text-mk-text">
          &ldquo;I used to spend my entire Sunday afternoon answering emails.
          Now I check Kenso on Monday morning and everything is handled. I
          genuinely got my weekends back.&rdquo;
        </blockquote>

        {/* Attribution */}
        <p className="mt-6 text-base text-mk-text-muted">
          — Shopify store owner &middot; 1,200+ orders/month
        </p>
      </div>
    </section>
  );
}

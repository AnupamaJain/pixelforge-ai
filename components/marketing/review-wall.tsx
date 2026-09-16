import { ShieldCheck, Star } from "lucide-react";
import { getTestimonials, TRUST_SIGNALS } from "@/config/testimonials";

/**
 * Review wall.
 *
 * Laid out like the testimonial walls that convert well on SaaS pages — a
 * dense, scannable grid with platform attribution.
 *
 * It renders real reviews when there are any. With none, it shows guarantees
 * instead of inventing customers. See the note at the top of
 * config/testimonials.ts for why that line is not negotiable.
 */

function Stars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className="size-3.5 fill-accent text-accent"
        />
      ))}
    </div>
  );
}

export function ReviewWall() {
  const testimonials = getTestimonials();

  if (testimonials.length === 0) {
    return (
      <section
        aria-labelledby="guarantees-heading"
        className="border-b border-border py-16 sm:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[13px] font-medium text-accent">
              What you can count on
            </span>
            <h2
              id="guarantees-heading"
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Guarantees, not testimonials
            </h2>
            <p className="mt-4 leading-relaxed text-fg-muted">
              We&apos;re new, so there are no customer quotes to show yet — and
              we&apos;d rather show you nothing than invent some. Here is what
              the product actually commits to instead, each of it checkable.
            </p>
          </div>

          <ul className="mt-12 grid gap-4 sm:grid-cols-2">
            {TRUST_SIGNALS.map((signal) => (
              <li
                key={signal.id}
                className="rounded-[--radius-lg] border border-border bg-surface p-6 transition-colors hover:border-accent"
              >
                <span className="grid size-9 place-items-center rounded-full bg-accent-soft">
                  <ShieldCheck aria-hidden="true" className="size-4 text-accent" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold">{signal.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {signal.body}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-10 text-center text-xs text-fg-subtle">
            Once real customers have said something worth quoting, their reviews
            replace this section.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="reviews-heading"
      className="border-b border-border py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-medium text-accent">Customers</span>
          <h2
            id="reviews-heading"
            className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Loved by sellers and agencies
          </h2>
        </div>

        {/* Masonry keeps varying quote lengths from leaving ragged gaps. */}
        <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.id}
              className="break-inside-avoid rounded-[--radius-lg] border border-border bg-surface p-5"
            >
              <Stars />

              {testimonial.metric ? (
                <p className="mt-3 text-2xl font-bold tracking-tight text-accent">
                  {testimonial.metric.value}
                  <span className="ml-1.5 text-xs font-normal text-fg-subtle">
                    {testimonial.metric.label}
                  </span>
                </p>
              ) : null}

              <blockquote className="mt-3 text-sm leading-relaxed text-fg">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold uppercase text-accent"
                >
                  {testimonial.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">
                    {testimonial.name}
                  </span>
                  <span className="block truncate text-xs text-fg-subtle">
                    {testimonial.role}, {testimonial.company}
                  </span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

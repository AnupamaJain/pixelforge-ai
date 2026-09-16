import { ShieldCheck } from "lucide-react";
import { getTestimonials, TRUST_SIGNALS } from "@/config/testimonials";

/**
 * Social proof.
 *
 * Renders real testimonials when there are any; otherwise falls back to trust
 * signals that are true on day one. It never invents a customer — see the note
 * at the top of config/testimonials.ts.
 */
export function Testimonials() {
  const testimonials = getTestimonials();

  if (testimonials.length === 0) {
    return (
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[13px] font-medium text-accent">
              What you can count on
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Guarantees, not testimonials
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">
              We&apos;re new, so we don&apos;t have customer quotes yet — and
              we&apos;d rather show you nothing than invent some. Here is what
              the product actually promises instead.
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {TRUST_SIGNALS.map((signal) => (
              <li
                key={signal.id}
                className="rounded-[--radius-lg] border border-border bg-surface p-5"
              >
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 shrink-0 text-accent"
                />
                <h3 className="mt-3 text-[15px] font-semibold">{signal.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
                  {signal.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-border py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-medium text-accent">Customers</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            What people are saying
          </h2>
        </div>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <li
              key={testimonial.id}
              className="flex flex-col rounded-[--radius-lg] border border-border bg-surface p-5"
            >
              {testimonial.metric ? (
                <p className="mb-3 text-2xl font-bold tracking-tight text-accent">
                  {testimonial.metric.value}
                  <span className="ml-1.5 text-xs font-normal text-fg-subtle">
                    {testimonial.metric.label}
                  </span>
                </p>
              ) : null}

              <blockquote className="flex-1 text-sm leading-relaxed text-fg">
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

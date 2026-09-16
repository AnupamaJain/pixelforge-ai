/**
 * Renders JSON-LD.
 *
 * The payload is built server-side from our own data, never from user input,
 * so serialising it into a script tag is safe. `<` is still escaped as a
 * precaution against any future caller passing through user-supplied text.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}

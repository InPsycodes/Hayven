/**
 * `JSON.stringify` doesn't escape `<`, so a value containing `</script>`
 * breaks out of the script tag early and lets whatever follows execute as
 * real markup -- a real risk here since Person schema embeds therapist-
 * editable fields (bio, location). `<` round-trips to an identical `<`
 * when the JSON is parsed, but can't be interpreted as a tag delimiter by
 * the HTML parser while it's still sitting in the script body as text.
 */
export function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

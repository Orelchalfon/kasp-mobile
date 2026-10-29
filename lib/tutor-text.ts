/**
 * Agent replies can carry TTS markup that is meant for the voice engine, not for the child:
 * multi-voice switches such as `<Kaspii female voice 1>…</Kaspii female voice 1>`. Strip the
 * tags (keeping the text inside) before a transcript is shown. Square brackets are kept on
 * purpose: they can be real content, e.g. an English word next to its Hebrew translation.
 */
export function cleanTutorText(text: string): string {
  return text
    .replace(/<\/?[^<>\n]+>/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

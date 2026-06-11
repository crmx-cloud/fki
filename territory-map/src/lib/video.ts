/**
 * Normalizes whatever a franchisor pastes into a video field to a clean,
 * playable embed URL. Accepts:
 *   - full <iframe …> embed snippets (extracts the src)
 *   - YouTube watch/share/shorts URLs  → https://www.youtube.com/embed/ID
 *   - youtu.be short links             → https://www.youtube.com/embed/ID
 *   - Vimeo page URLs                  → https://player.vimeo.com/video/ID
 *   - already-correct embed URLs       → passed through
 * Returns "" for anything that can't be turned into a safe embed URL, so
 * callers hide the player instead of iframing garbage (which resolves as a
 * relative URL and loads our own site inside the player).
 */
export function normalizeVideoEmbedUrl(input: string | undefined | null): string {
  if (!input) return "";
  let value = input.trim();

  // Full iframe snippet pasted — pull out the src attribute
  if (/<iframe/i.test(value)) {
    const m = value.match(/src\s*=\s*["']([^"']+)["']/i);
    if (!m) return "";
    value = m[1].trim();
  }

  // Protocol-relative or missing protocol
  if (value.startsWith("//")) value = "https:" + value;
  if (!/^https?:\/\//i.test(value)) {
    if (/^(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/i.test(value)) {
      value = "https://" + value;
    } else {
      return "";
    }
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  // ── YouTube ──
  const ytId = (id: string | null | undefined) =>
    id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : "";
  if (host === "youtu.be") {
    return ytId(url.pathname.split("/").filter(Boolean)[0]);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") return ytId(url.searchParams.get("v"));
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" || parts[0] === "v") {
      return ytId(parts[1]);
    }
    return ytId(url.searchParams.get("v"));
  }

  // ── Vimeo ──
  if (host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[1];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : "";
  }
  if (host === "vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : "";
  }

  // Other hosts: allow only if it already looks like a dedicated embed/player URL
  if (/embed|player/.test(url.pathname + url.hostname)) return url.toString();
  return "";
}

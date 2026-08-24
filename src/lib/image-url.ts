/** Turn common share links into a direct image URL when possible. */
export function normalizeImageUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return "";

  const drive = url.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/
  );
  if (drive) {
    return `https://drive.google.com/uc?export=view&id=${drive[1]}`;
  }
  const driveOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (url.includes("drive.google.com") && driveOpen) {
    return `https://drive.google.com/uc?export=view&id=${driveOpen[1]}`;
  }

  if (url.includes("dropbox.com")) {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("&dl=0", "")
      .replace("?dl=0", "?raw=1");
  }

  const yandex = url.match(/disk\.yandex\.[a-z.]+\/i\/([a-zA-Z0-9_-]+)/);
  if (yandex) {
    return `https://getfile.dokpub.com/yandex/get/${encodeURIComponent(url)}`;
  }

  return url;
}

export function isHttpUrl(s: string) {
  return /^https?:\/\/\S+/i.test(s.trim());
}

export function guessMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

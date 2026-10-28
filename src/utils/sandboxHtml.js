export const LESSON_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "child-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "style-src 'unsafe-inline'",
].join("; ");

export function createSandboxedHtml(html) {
  const document = new DOMParser().parseFromString(String(html), "text/html");

  document
    .querySelectorAll('meta[http-equiv="Content-Security-Policy" i]')
    .forEach((element) => element.remove());

  const policy = document.createElement("meta");
  policy.setAttribute("http-equiv", "Content-Security-Policy");
  policy.setAttribute("content", LESSON_CSP);
  document.head.prepend(policy);

  return `<!doctype html>${document.documentElement.outerHTML}`;
}

import { describe, expect, it } from "vitest";
import { createSandboxedHtml, LESSON_CSP } from "./sandboxHtml.js";

describe("createSandboxedHtml", () => {
  it("places the application policy before lesson content", () => {
    const output = createSandboxedHtml(
      '<html><head><title>Lesson</title></head><body><script src="https://example.test/a.js"></script></body></html>',
    );
    const document = new DOMParser().parseFromString(output, "text/html");
    const policy = document.head.firstElementChild;

    expect(policy.getAttribute("http-equiv")).toBe("Content-Security-Policy");
    expect(policy.getAttribute("content")).toBe(LESSON_CSP);
    expect(LESSON_CSP).toContain("script-src 'none'");
    expect(LESSON_CSP).toContain("connect-src 'none'");
    expect(LESSON_CSP).toContain("form-action 'none'");
    expect(LESSON_CSP).toContain("base-uri 'none'");
  });

  it("replaces a lesson-supplied content security policy", () => {
    const output = createSandboxedHtml(
      '<meta http-equiv="Content-Security-Policy" content="default-src *"><p>Lesson</p>',
    );
    const document = new DOMParser().parseFromString(output, "text/html");
    const policies = document.querySelectorAll(
      'meta[http-equiv="Content-Security-Policy" i]',
    );

    expect(policies).toHaveLength(1);
    expect(policies[0].getAttribute("content")).toBe(LESSON_CSP);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeLine(
  line: string,
  container: HTMLElement,
  charDelay: number
): Promise<void> {
  for (const char of line) {
    const span = document.createElement("span");
    span.textContent = char;
    container.appendChild(span);
    await sleep(charDelay);
  }
  container.classList.add("fadeout");
  await sleep(2000);
  container.textContent = "";
  container.classList.remove("fadeout");
}

export async function typeLines(
  lines: string[],
  container: HTMLElement,
  charDelay = 100
): Promise<void> {
  for (const line of lines) {
    await typeLine(line, container, charDelay);
  }
}

function splitChars(el: HTMLElement, className: string): HTMLSpanElement[] {
  const text = el.textContent ?? "";
  el.textContent = "";
  const spans: HTMLSpanElement[] = [];
  for (const ch of text) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = ch;
    el.appendChild(span);
    spans.push(span);
  }
  return spans;
}

export function charFlicker(
  elementId: string,
  intervalMs: number,
  durationMs = 1000
): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  const chars = splitChars(el, `${elementId}-char`);
  if (chars.length === 0) return;
  setInterval(() => {
    const target = chars[Math.floor(Math.random() * chars.length)];
    target.style.animation = `flicker ${durationMs}ms ease-in-out`;
    setTimeout(() => {
      target.style.animation = "";
    }, durationMs);
  }, intervalMs);
}

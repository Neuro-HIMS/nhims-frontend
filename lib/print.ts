/**
 * Print just one part of the page, e.g. the hospital card. The element must carry
 * `data-print-area="<area>"`. It is copied into a print-only container and the rest of
 * the page is left out of the printout (see the `body[data-printing]` rules in globals.css).
 */
export function printArea(area: string): void {
  if (typeof window === "undefined") return;
  const source = document.querySelector<HTMLElement>(`[data-print-area="${area}"]`);
  if (!source) {
    window.print();
    return;
  }

  const container = document.createElement("div");
  container.className = "print-root";
  container.appendChild(source.cloneNode(true));
  document.body.appendChild(container);
  document.body.dataset.printing = area;

  const cleanup = () => {
    delete document.body.dataset.printing;
    container.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}

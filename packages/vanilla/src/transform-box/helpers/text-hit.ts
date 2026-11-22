/** Let the browser start a native selection when the pointer hits selectable text. */
export function hitsSelectableText(event: PointerEvent): boolean {
  const target = event.composedPath()[0];
  if (!(target instanceof Element)) return false;
  const document = target.ownerDocument;
  const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || !node.parentElement) continue;
    if (getComputedStyle(node.parentElement).userSelect === 'none') continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (
        rect.width &&
        rect.height &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      )
        return true;
    }
  }
  return false;
}

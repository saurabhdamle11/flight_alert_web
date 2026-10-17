export const $ = (id) => document.getElementById(id);

/** Disables `button` and swaps its label while `fn` runs. */
export async function busy(button, label, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { return await fn(); }
  finally { button.disabled = false; button.textContent = original; }
}

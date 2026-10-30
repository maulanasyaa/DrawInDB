// Salin teks ke clipboard. `navigator.clipboard` bisa tidak tersedia atau
// ditolak di Electron/izin, jadi ada fallback textarea + execCommand.
// Mengembalikan boolean, tidak pernah melempar, supaya pemanggil bisa toast.

function legacyCopy(value) {
  if (typeof document === "undefined" || !document.body) return false;

  const el = document.createElement("textarea");
  el.value = value;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.top = "-9999px";
  el.style.opacity = "0";
  document.body.appendChild(el);

  try {
    el.select();
    return !!document.execCommand("copy");
  } finally {
    document.body.removeChild(el);
  }
}

export async function copyText(text) {
  const value = String(text ?? "");

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Jatuh ke fallback di bawah.
    }
  }

  try {
    return legacyCopy(value);
  } catch {
    return false;
  }
}

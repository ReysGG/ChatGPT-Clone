export function getFriendlyChatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (message.includes("429") || lower.includes("quota") || lower.includes("rate limit")) {
    return "Model AI sedang terkena limit. Coba lagi sebentar, atau ganti ke model yang lebih ringan di Settings.";
  }

  if (message.includes("GEMINI_API_KEY")) {
    return "GEMINI_API_KEY belum tersedia di server. Tambahkan key di file .env lalu restart server.";
  }

  if (lower.includes("fetch failed") || lower.includes("network") || lower.includes("timeout")) {
    return "Koneksi ke AI provider sedang bermasalah. Coba kirim ulang beberapa saat lagi.";
  }

  if (lower.includes("safety") || lower.includes("blocked")) {
    return "Permintaan ini diblokir oleh filter keamanan model. Coba ubah instruksinya.";
  }

  return "Gagal membuat jawaban AI. Coba kirim ulang pesan ini.";
}

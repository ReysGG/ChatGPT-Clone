# Planning Phase Lengkap - Personal AI Chat App

Dokumen ini dibuat sebagai handoff lengkap untuk AI lain atau developer lain yang akan melanjutkan project.

Project ini adalah aplikasi personal AI chat berbasis Next.js dengan auth, chat history, streaming AI response, database persistence, dan sharing conversation.

---

## 0. Kondisi Project Saat Ini

### Stack

- Framework: Next.js 16 App Router
- UI: React, Tailwind CSS, komponen custom, Heroicons/Lucide
- Auth: Better Auth
- Database: PostgreSQL via Prisma
- AI provider: Gemini API
- ORM: Prisma Client generated ke `generated/prisma`
- Runtime lokal: `localhost:3000`

### Fitur Yang Sudah Ada

- Chat UI dengan sidebar dan main chat area.
- Streaming response dari AI.
- Chat history tersimpan di database.
- Conversation dan message sudah persisten.
- Login modal sudah ada.
- Register page sudah ada.
- Sidebar sudah punya state guest/user.
- Conversation sudah owner-based lewat `Conversation.userId`.
- Settings modal sudah ada.
- Public share conversation sudah mulai dibuat.
- Public shared page tersedia di `/share/[shareId]`.

### Share Schema Yang Sudah Ada

Model `Conversation` sudah memiliki field:

```prisma
isShared Boolean   @default(false)
shareId  String?   @unique
sharedAt DateTime?
```

Migration share sudah dibuat dan diterapkan:

```txt
prisma/migrations/20260603065000_add_conversation_share/migration.sql
```

### Aturan Penting Untuk AI Berikutnya

- Jangan start dev server baru jika `localhost:3000` sudah berjalan.
- Jangan pakai `prisma db push --accept-data-loss` kecuali benar-benar paham dampaknya.
- Jika schema berubah, jalankan:

```bash
npx prisma generate
npx prisma migrate deploy
```

- Setelah perubahan besar, jalankan:

```bash
npm run build
```

- Jangan refactor besar sebelum fitur MVP stabil.
- Fokus pada ownership, privacy, dan UX yang konsisten.

---

## 1. Phase 5 - UX Hardening, Auth Polish, dan Share Control

### Tujuan

Membuat fitur yang sudah ada menjadi stabil, aman, dan nyaman dipakai harian.

### Prioritas

1. Share control menu lengkap.
2. Auth state cleanup.
3. Sidebar guest/user polish.
4. Settings guest restriction.
5. Error/success feedback.

### Scope

- Tidak menambah fitur besar seperti upload PDF, RAG, atau web search.
- Fokus memperbaiki fondasi yang sudah ada.

### Tugas Detail

#### 1.1 Auth UX Finalization

- Setelah login:
  - session langsung update.
  - sidebar reload chat milik user.
  - settings user ikut reload.
  - pending message sebelum login tetap dikirim setelah login.
- Setelah register:
  - user langsung login atau redirect ke `/`.
  - session terbaca dengan benar.
  - user baru tidak melihat data user lain.
- Setelah logout:
  - chat list kosong.
  - active chat menjadi `null`.
  - message list kosong.
  - role berubah ke `guest`.
  - header berubah ke tombol `Login`.
- Error feedback:
  - login gagal.
  - register gagal.
  - session expired.
  - unauthorized request.

#### 1.2 Sidebar Guest/User State

- Guest:
  - tidak melihat private chat.
  - tombol New Chat membuka login modal.
  - Search Chat disabled atau membuka login modal.
  - User area menampilkan `Guest`.
- User login:
  - melihat chat miliknya saja.
  - nama/email dari session.
  - New Chat membuat conversation milik user.
  - Delete hanya untuk conversation milik user.
- Empty state:
  - guest: `Login untuk melihat chat pribadi`.
  - user tanpa chat: `No conversations yet`.
  - hasil search kosong: `No matching chats`.

#### 1.3 Share Control Menu

- Ubah tombol share di header menjadi menu/dropdown.
- Menu action:
  - `Share` untuk membuat shared link.
  - `Copy link` untuk copy shared URL.
  - `Open shared page` untuk membuka `/share/[shareId]`.
  - `Stop sharing` untuk mematikan link.
- State visual:
  - chat belum shared: tampilkan share action biasa.
  - chat sudah shared: tampilkan indikator shared.
  - setelah copy: feedback `Link copied`.
  - setelah stop sharing: indikator hilang.
- Endpoint:
  - `PATCH /api/conversations/[id]/share`.
  - body `{ "isShared": true }` untuk enable.
  - body `{ "isShared": false }` untuk disable.
  - hanya owner conversation yang boleh toggle.
- Public page:
  - `/share/[shareId]` hanya valid jika `isShared = true`.
  - jika disabled, halaman harus 404.
  - tidak boleh expose email, userId, atau internal data sensitif.

#### 1.4 Settings Hardening

- Guest:
  - boleh melihat default settings.
  - tidak boleh save settings.
  - save action membuka login modal atau tampilkan unauthorized state.
- User login:
  - settings disimpan per user.
  - settings reload setelah login.
  - jika belum ada settings, buat default untuk user itu.
- Feedback:
  - saving.
  - saved.
  - failed.

### File Utama

- `app/page.tsx`
- `app/_hooks/use-chat-state.ts`
- `app/_components/auth-card.tsx`
- `app/_components/login-modal.tsx`
- `app/_components/settings-modal.tsx`
- `app/_components/sidebar/index.tsx`
- `app/_components/sidebar/types.ts`
- `app/_components/chat/chat-header.tsx`
- `app/_components/chat/types.ts`
- `app/api/conversations/[id]/share/route.ts`
- `app/api/settings/route.ts`
- `app/share/[shareId]/page.tsx`

### Acceptance Criteria

- Guest tidak melihat private chat.
- Login langsung reload chat user.
- Logout langsung membersihkan UI.
- Share link bisa dibuat, dicopy, dibuka, dan dimatikan.
- Stop sharing membuat public link menjadi 404.
- Guest tidak bisa save settings.
- `npm run build` berhasil.

---

## 2. Phase 6 - Conversation Management

### Tujuan

Merapikan pengelolaan chat history agar user bisa bekerja dengan banyak conversation.

### Tugas Detail

#### 2.1 Manual Rename Conversation

- Tambahkan action rename di sidebar row atau chat header.
- Tambahkan API `PATCH /api/conversations/[id]`.
- Body:

```json
{
  "title": "Judul baru"
}
```

- Validasi:
  - title tidak kosong.
  - title max 80-120 karakter.
  - hanya owner yang boleh rename.
- UI:
  - inline edit atau modal kecil.
  - Enter untuk save.
  - Escape untuk cancel.
  - title update langsung di sidebar.

#### 2.2 Delete Conversation Polish

- Pastikan confirmation dialog jelas.
- Setelah delete active chat:
  - pindah ke chat berikutnya.
  - jika tidak ada chat, active chat `null`.
- Delete harus owner-only.
- Loading state saat delete berjalan.

#### 2.3 Clear All Chats

- Hanya user login.
- Confirmation sebelum delete all.
- Hanya menghapus conversation milik user login.
- Setelah clear:
  - chat list kosong.
  - message list kosong.
  - active chat `null`.

#### 2.4 Sidebar Enhancements

- Badge shared untuk chat yang sedang dibagikan.
- Timestamp relatif tetap stabil.
- Search tetap bekerja untuk title baru setelah rename.
- Optional: action menu per chat row.

### File Utama

- `app/_components/sidebar/chat-row.tsx`
- `app/_components/sidebar/delete-chat-dialog.tsx`
- `app/_components/sidebar/index.tsx`
- `app/_hooks/use-chat-state.ts`
- `app/api/conversations/[id]/route.ts`
- `app/api/conversations/route.ts`
- `lib/chat-db.ts`

### Acceptance Criteria

- Rename chat berhasil tanpa refresh.
- Delete active chat tidak merusak state.
- Clear all hanya menghapus chat milik user.
- User lain tidak bisa rename/delete chat bukan miliknya.
- Guest tidak bisa rename/delete/clear.

---

## 3. Phase 7 - Admin Panel Foundation

### Tujuan

Membuat admin panel untuk mengelola user, konfigurasi app, model AI, dan observability dasar.

Admin panel penting karena aplikasi mulai punya banyak user, auth, settings, dan shared conversation. Admin perlu cara melihat kondisi sistem tanpa akses langsung ke database.

### Role dan Access

- Role existing: `guest`, `user`, `admin`.
- Admin ditentukan lewat `ADMIN_EMAIL` di environment.
- Semua route admin harus proteksi server-side lewat `requireAdmin()`.
- Jangan hanya proteksi dari UI.

### Menu Admin Panel

#### 3.1 Admin Dashboard

Tampilkan ringkasan:

- total users.
- total conversations.
- total messages.
- total shared conversations.
- conversations created today.
- messages created today.
- active sessions.
- provider health status.

#### 3.2 User Management

Tabel user:

- name.
- email.
- role computed: admin/user.
- createdAt.
- total conversations.
- total messages.
- active sessions.

Action:

- view user detail.
- delete user jika aman.
- disable user jika model `User` nanti ditambah `isDisabled`.
- force logout user dengan delete sessions.

Catatan:

- Jangan implement destructive delete dulu tanpa confirmation kuat.
- Untuk MVP admin, cukup read-only + force logout.

#### 3.3 Conversation Audit

Tabel conversations:

- title.
- owner name/email.
- message count.
- isShared.
- sharedAt.
- updatedAt.

Action:

- view metadata.
- open shared link jika shared.
- admin unshare conversation jika diperlukan.

Catatan privacy:

- Jangan tampilkan full message content di admin panel secara default.
- Jika perlu audit content, buat explicit action dan warning.

#### 3.4 System Settings

Admin bisa mengatur default global:

- default model.
- default system prompt.
- default temperature.
- app registration enabled/disabled.
- public sharing enabled/disabled.
- max messages per conversation.
- max prompt length.

Butuh model baru jika global settings belum ada:

```prisma
model AppSetting {
  id                 String   @id @default(cuid())
  defaultModel       String?
  defaultSystemPrompt String?
  defaultTemperature Float    @default(0.7)
  registrationEnabled Boolean @default(true)
  sharingEnabled     Boolean @default(true)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

#### 3.5 Provider Health

Tampilkan status:

- database reachable.
- Gemini reachable.
- model configured.
- environment variable tersedia.
- response latency sederhana.

Gunakan endpoint existing `/api/health` sebagai dasar.

### API Admin Yang Dibutuhkan

- `GET /api/admin/summary`
- `GET /api/admin/users`
- `GET /api/admin/users/[id]`
- `POST /api/admin/users/[id]/logout`
- `GET /api/admin/conversations`
- `PATCH /api/admin/conversations/[id]/unshare`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

Semua endpoint wajib memanggil `requireAdmin()`.

### File Utama

- `app/admin/page.tsx`
- `app/admin/_components/admin-settings-form.tsx`
- `app/api/admin/summary/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[id]/route.ts`
- `app/api/admin/conversations/route.ts`
- `app/api/admin/settings/route.ts`
- `lib/auth.ts`
- `lib/prisma.ts`
- `prisma/schema.prisma`

### Acceptance Criteria

- Non-admin tidak bisa akses `/admin`.
- Non-admin tidak bisa akses API admin secara langsung.
- Admin dashboard menampilkan ringkasan data.
- Admin bisa melihat user list.
- Admin bisa melihat conversation metadata.
- Admin bisa unshare conversation jika diperlukan.
- Admin settings tersimpan di database.
- Build berhasil.

---

## 4. Phase 8 - Prompt Library dan Templates

### Tujuan

Membuat user bisa menyimpan prompt favorit dan memakai template saat memulai chat.

### Fitur

#### 4.1 Prompt Templates

- User bisa membuat template prompt.
- Template memiliki:
  - title.
  - body.
  - category.
  - optional tags.
- User bisa insert template ke chat input.

#### 4.2 Template Ownership

Saat ini model `PromptTemplate` belum terikat user. Untuk multi-user, perlu update:

```prisma
model PromptTemplate {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  body      String
  category  String?
  isGlobal  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Global templates bisa dikelola admin.

#### 4.3 UI

- Prompt library modal.
- Search template.
- Category filter.
- Insert into input.
- Create/edit/delete template.

### API

- `GET /api/prompt-templates`
- `POST /api/prompt-templates`
- `PATCH /api/prompt-templates/[id]`
- `DELETE /api/prompt-templates/[id]`

### File Utama

- `app/_components/chat-input/index.tsx`
- `app/_components/prompt-library-modal.tsx`
- `app/api/prompt-templates/route.ts`
- `app/api/prompt-templates/[id]/route.ts`
- `prisma/schema.prisma`

### Acceptance Criteria

- User bisa membuat prompt template pribadi.
- User bisa insert template ke chat input.
- User tidak bisa melihat template private user lain.
- Admin bisa membuat global template.

---

## 5. Phase 9 - Memory dan Personalization

### Tujuan

Membuat AI assistant punya konteks personal yang bisa disimpan dan dikelola user.

### Design Principle

Memory harus transparan dan bisa dikontrol user. Jangan simpan semua hal otomatis tanpa UI review.

### Model Yang Disarankan

Model `Memory` saat ini belum user-scoped. Perlu update:

```prisma
model Memory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  key       String
  value     String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, key])
  @@index([userId])
}
```

### Fitur

- User bisa add memory manual.
- User bisa edit/delete memory.
- User bisa disable memory.
- Chat API memasukkan enabled memories ke system prompt.
- Optional: AI memberi suggestion memory, user approve dulu.

### UI

- Memory tab di settings.
- List memory.
- Add/edit/delete.
- Toggle enabled.

### API

- `GET /api/memories`
- `POST /api/memories`
- `PATCH /api/memories/[id]`
- `DELETE /api/memories/[id]`

### Acceptance Criteria

- Memory terikat ke user.
- User lain tidak bisa membaca memory user lain.
- Chat response memakai memory enabled.
- User bisa mematikan memory kapan saja.

---

## 6. Phase 10 - File Upload dan Document Chat

### Tujuan

User bisa upload file dan meminta AI membaca/merangkum dokumen.

### Scope MVP

Mulai dari file text-friendly:

- `.txt`
- `.md`
- `.json`
- `.csv`
- PDF sederhana jika parser tersedia

Jangan langsung buat RAG kompleks sebelum upload dasar stabil.

### Model Yang Disarankan

Model `Upload` saat ini belum user-scoped dan belum conversation-scoped. Perlu update:

```prisma
model Upload {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  conversationId String?
  conversation   Conversation? @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  filename       String
  mimeType       String
  sizeBytes      Int
  storagePath    String
  extractedText  String?
  createdAt      DateTime @default(now())

  @@index([userId])
  @@index([conversationId])
}
```

### Storage Options

- Local storage untuk development.
- Supabase Storage / S3-compatible untuk deploy.
- Jangan simpan file besar langsung di database.

### API

- `POST /api/uploads`
- `GET /api/uploads`
- `GET /api/uploads/[id]`
- `DELETE /api/uploads/[id]`

### Chat Integration

- Chat input bisa attach file.
- Backend mengambil extracted text.
- Prompt menyertakan ringkasan atau potongan dokumen.
- Batasi ukuran text agar tidak melebihi context.

### Acceptance Criteria

- User bisa upload file kecil.
- File terikat ke user.
- User lain tidak bisa akses upload.
- AI bisa menjawab berdasarkan isi file.
- File bisa dihapus.

---

## 7. Phase 11 - Search, Tags, dan Organization

### Tujuan

Membantu user menemukan chat lama saat jumlah conversation bertambah.

### Fitur

#### 7.1 Search Conversation

- Search by title.
- Search by message content.
- Filter shared/non-shared.
- Filter date range.

#### 7.2 Tags

Model `Tag` dan `ConversationTag` sudah ada, tapi perlu pastikan user-scoped benar.

Perlu cek:

- Tag name sebaiknya unique per user, bukan global unique.
- Saat ini `Tag.name` unique global bisa mengganggu multi-user.

Rekomendasi schema:

```prisma
model Tag {
  id        String            @id @default(cuid())
  name      String
  userId    String
  user      User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  links     ConversationTag[]
  createdAt DateTime          @default(now())

  @@unique([userId, name])
  @@index([userId])
}
```

#### 7.3 UI

- Tag badges di chat row.
- Add/remove tags.
- Filter by tag.
- Search panel atau command palette.

### API

- `GET /api/search/conversations?q=`
- `GET /api/tags`
- `POST /api/tags`
- `PATCH /api/conversations/[id]/tags`

### Acceptance Criteria

- Search title dan message berjalan.
- Tags tidak bocor antar user.
- User bisa filter chat by tag.
- Build berhasil setelah schema change.

---

## 8. Phase 12 - Multi Model dan Provider Management

### Tujuan

Membuat app bisa memakai lebih dari satu model/provider secara aman.

### Provider Kandidat

- Gemini.
- OpenAI.
- Anthropic.
- Ollama untuk local model.

### Design

Buat abstraction di `lib/ai.ts`:

- `listModels()`.
- `getModel(provider, modelName)`.
- `streamCompletion()`.
- `generateCompletion()`.

Jangan membuat UI model selector terlalu kompleks sebelum backend abstraction stabil.

### Admin Settings

Admin bisa:

- enable/disable provider.
- set default provider.
- set default model.
- test provider health.

### User Settings

User bisa:

- pilih default model.
- pilih temperature.
- set system prompt pribadi.

### Acceptance Criteria

- User bisa memilih model yang enabled.
- Disabled provider tidak tampil ke user.
- API key tetap hanya di server.
- Build berhasil.

---

## 9. Phase 13 - Web Search Tooling

### Tujuan

AI bisa membantu dengan informasi terbaru saat user mengaktifkan web search.

### Prinsip

- Web search harus opt-in per message atau per chat.
- Jangan selalu browse karena biaya dan latency.
- Tampilkan sumber jika jawaban memakai web search.

### Fitur

- Toggle `Web search` di input.
- Backend route tool search.
- AI prompt menerima search results.
- Assistant message menampilkan citations/sources.

### API

- `POST /api/tools/web-search`
- Integrasi di `POST /api/chat`

### Data Model Optional

```prisma
model ToolRun {
  id             String   @id @default(cuid())
  userId         String
  conversationId String?
  messageId      String?
  toolName       String
  input          Json
  output         Json?
  createdAt      DateTime @default(now())
}
```

### Acceptance Criteria

- Web search bisa diaktifkan per prompt.
- Jawaban mencantumkan sumber.
- Tool run terikat ke user.
- Jika search gagal, chat tetap memberi error friendly.

---

## 10. Phase 14 - Usage, Rate Limit, dan Quota

### Tujuan

Mencegah penggunaan berlebihan dan memberi admin visibility terhadap biaya/usage.

### Fitur

- Hitung messages per user per hari.
- Hitung AI calls per user.
- Simpan approximate token count jika provider memberi data.
- Rate limit endpoint chat.
- Admin bisa melihat usage dashboard.

### Model Yang Disarankan

```prisma
model UsageEvent {
  id             String   @id @default(cuid())
  userId         String
  conversationId String?
  type           String
  provider       String?
  model          String?
  inputTokens    Int?
  outputTokens   Int?
  createdAt      DateTime @default(now())

  @@index([userId, createdAt])
  @@index([type, createdAt])
}
```

### Rate Limit MVP

- Per user: max N messages per minute.
- Per guest: no chat allowed.
- Per IP optional jika app dibuka publik.

### Acceptance Criteria

- Chat endpoint punya basic rate limit.
- Admin bisa lihat usage summary.
- Usage event tidak memblok chat jika logging gagal, tapi error dicatat.

---

## 11. Phase 15 - Notifications dan Activity

### Tujuan

Memberi feedback async untuk aktivitas penting.

### Fitur

- Toast system global.
- Activity log untuk user.
- Admin activity log.
- Optional: email notification untuk event tertentu.

### Event Kandidat

- Login berhasil/gagal.
- Share link dibuat.
- Share link dimatikan.
- Settings disimpan.
- Upload selesai diproses.

### Model Optional

```prisma
model ActivityEvent {
  id        String   @id @default(cuid())
  userId    String?
  type      String
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
  @@index([type, createdAt])
}
```

### Acceptance Criteria

- User mendapat feedback jelas untuk action penting.
- Admin bisa audit event penting.
- Tidak ada sensitive data di metadata activity.

---

## 12. Phase 16 - Deployment, Security, dan Production Readiness

### Tujuan

Membuat app aman dan siap deploy.

### Security Checklist

- `BETTER_AUTH_SECRET` minimal 32 karakter dan high entropy.
- `ADMIN_EMAIL` diset di environment.
- `DATABASE_URL` hanya server-side.
- API keys hanya server-side.
- Public share tidak expose data sensitif.
- Semua private API memanggil `requireUser()`.
- Semua admin API memanggil `requireAdmin()`.
- Tidak ada default user fallback untuk private data.
- Tidak ada Prisma error mentah yang bocor ke client.

### Deployment Checklist

- Build berhasil.
- Migration deploy berhasil.
- Env lengkap.
- Health endpoint OK.
- Logging tersedia.
- Error boundary minimal tersedia.

### Environment Variables

Minimal:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
AUTH_SECRET=
ADMIN_EMAIL=
GEMINI_API_KEY=
GEMINI_MODEL=
NEXT_PUBLIC_APP_URL=
```

### Acceptance Criteria

- Deploy production berhasil.
- Login/register berjalan di production domain.
- Chat streaming berjalan di production.
- Shared page bisa dibuka publik.
- Admin panel hanya bisa dibuka admin.

---

## 13. Phase 17 - Testing dan QA Automation

### Tujuan

Mengurangi regresi saat fitur semakin banyak.

### Test Level

#### 13.1 Unit/Utility Tests

- `createTitleFromMessage()`.
- serializer conversation/message.
- auth role helper.
- share id generation.

#### 13.2 API Tests

- conversations owner-only.
- messages owner-only.
- share enable/disable owner-only.
- settings user-only.
- admin route admin-only.

#### 13.3 E2E Manual atau Playwright

Flow utama:

- register.
- login.
- create chat.
- send message.
- share chat.
- open public link.
- stop sharing.
- logout.

### Acceptance Criteria

- Test core API ownership tersedia.
- Build tetap wajib lulus.
- Manual checklist terdokumentasi.

---

## 14. Phase 18 - UI Polish dan Accessibility

### Tujuan

Merapikan pengalaman visual dan keyboard interaction.

### Tugas

- Keyboard navigation untuk sidebar.
- Escape untuk close modal/menu.
- Focus trap di modal.
- Tooltip untuk icon-only buttons.
- Loading skeleton untuk chat list.
- Toast feedback konsisten.
- Responsive mobile drawer stabil.
- Text tidak overlap di mobile.

### File Utama

- `app/_components/sidebar/*`
- `app/_components/chat/*`
- `app/_components/chat-input/*`
- `app/_components/settings-modal.tsx`
- `app/_components/auth-card.tsx`

### Acceptance Criteria

- Semua modal bisa ditutup via Escape.
- Tombol icon punya accessible label.
- Mobile sidebar tidak overlap dengan chat input.
- Layout tidak shift besar saat streaming.

---

## 15. Phase 19 - Advanced Personal Assistant Features

### Tujuan

Mengembangkan app dari chat biasa menjadi personal assistant.

### Kandidat Fitur

- Project-based chat.
- Long-term memory dengan approval.
- File/document workspace.
- Prompt library global dan personal.
- Web search opt-in.
- Voice input.
- Image generation.
- Scheduled reminders.
- Export conversation ke Markdown/PDF.
- Import conversation.

### Prioritas Yang Disarankan

1. Prompt library.
2. Memory manual.
3. File upload basic.
4. Search/tags.
5. Web search.
6. Multi-model.
7. Voice/image/reminders.

### Acceptance Criteria

- Setiap fitur baru tetap user-scoped.
- Tidak ada fitur yang expose data user lain.
- Admin bisa disable fitur yang belum stabil.

---

## 16. Urutan Eksekusi Rekomendasi

Kerjakan dalam urutan ini agar fondasi tetap stabil:

1. Share control menu lengkap.
2. Stop sharing UI dan shared badge.
3. Auth/sidebar/settings hardening.
4. Conversation rename dan management.
5. Public shared page polish.
6. Admin panel foundation.
7. Admin user/conversation/settings APIs.
8. Prompt library.
9. Memory user-scoped.
10. File upload basic.
11. Search dan tags.
12. Usage/rate limit.
13. Production readiness.
14. Testing automation.
15. Advanced assistant features.

---

## 17. Manual Validation Checklist

Jalankan setelah perubahan besar:

```bash
npm run build
```

Jika schema berubah:

```bash
npx prisma generate
npx prisma migrate deploy
```

Manual test di `localhost:3000`:

1. Buka app sebagai guest.
2. Sidebar tidak menampilkan private chats.
3. Klik New Chat sebagai guest.
4. Login modal muncul.
5. Register user baru.
6. Buat chat baru.
7. Kirim message.
8. Tunggu AI reply.
9. Refresh halaman.
10. Chat history tetap ada.
11. Share chat.
12. Copy link.
13. Buka `/share/[shareId]` tanpa login.
14. Stop sharing.
15. Buka link lagi, harus 404.
16. Rename chat.
17. Delete chat.
18. Clear all chats.
19. Logout.
20. Sidebar kosong.
21. Login sebagai user lain.
22. Pastikan chat user pertama tidak terlihat.
23. Login sebagai admin.
24. Buka `/admin`.
25. Pastikan non-admin tidak bisa buka `/admin`.

---

## 18. Prompt Handoff Untuk AI Lain

Gunakan prompt ini jika ingin melanjutkan dengan AI lain:

```text
Kamu melanjutkan project Next.js Personal AI Chat App.

Stack:
- Next.js 16 App Router
- Prisma + PostgreSQL
- Better Auth
- Gemini API
- Tailwind CSS

Kondisi saat ini:
- Chat streaming sudah jalan.
- Conversation dan Message sudah tersimpan.
- Login modal dan register page sudah ada.
- Sidebar sudah punya guest/user state.
- Conversation sudah owner-based lewat Conversation.userId.
- Share conversation sudah mulai dibuat dengan Conversation.isShared, Conversation.shareId, Conversation.sharedAt.
- Endpoint PATCH /api/conversations/[id]/share sudah ada.
- Public page /share/[shareId] sudah ada.
- Migration share sudah diterapkan ke DB.

Aturan:
- Jangan start dev server baru jika localhost:3000 sudah berjalan.
- Jangan pakai prisma db push --accept-data-loss.
- Jika schema berubah, jalankan npx prisma generate dan npx prisma migrate deploy.
- Setelah perubahan besar, jalankan npm run build.
- Jangan refactor besar sebelum fitur MVP stabil.

Target kerja berikutnya:
1. Implement share control menu lengkap: Share, Copy link, Open shared page, Stop sharing, shared indicator.
2. Pastikan Stop sharing membuat /share/[shareId] 404.
3. Pastikan hanya owner yang bisa toggle share, rename, delete, dan clear chat.
4. Rapikan auth flow: login/register/logout harus reload atau clear state dengan benar.
5. Rapikan sidebar guest/user state.
6. Pastikan guest tidak bisa save settings.
7. Tambahkan manual rename conversation.
8. Polish public shared page agar read-only dan tidak expose data sensitif.
9. Setelah itu lanjut admin panel foundation.

Admin panel target:
- Protect /admin dengan requireAdmin().
- Tambahkan admin summary dashboard.
- Tambahkan user list.
- Tambahkan conversation audit metadata.
- Tambahkan admin settings untuk default model, registration enabled, sharing enabled.
- Semua /api/admin/* wajib requireAdmin().

File penting:
- app/page.tsx
- app/_hooks/use-chat-state.ts
- app/_components/chat/chat-header.tsx
- app/_components/sidebar/index.tsx
- app/_components/sidebar/chat-row.tsx
- app/_components/settings-modal.tsx
- app/api/conversations/[id]/route.ts
- app/api/conversations/[id]/share/route.ts
- app/share/[shareId]/page.tsx
- app/admin/page.tsx
- lib/auth.ts
- lib/chat-db.ts
- prisma/schema.prisma

Acceptance criteria:
- Guest tidak melihat private chats.
- User hanya melihat chat miliknya.
- Share link bisa dibuat, dicopy, dibuka, dan dimatikan.
- Stop sharing membuat shared link tidak bisa dibuka.
- Rename chat berhasil tanpa refresh.
- Settings hanya bisa disimpan user login.
- Non-admin tidak bisa akses admin panel atau admin API.
- npm run build berhasil.
```

---

## 19. Prioritas Singkat Untuk Mulai Besok

Jika hanya ingin mulai dari 5 task paling penting:

1. Buat share menu lengkap di chat header.
2. Tambahkan stop sharing UI dan shared badge.
3. Tambahkan rename conversation.
4. Kunci settings save untuk guest.
5. Buat admin dashboard read-only dengan summary, user list, dan conversation metadata.


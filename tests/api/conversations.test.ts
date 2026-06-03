import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () => ({}),
}));

// Mock prisma client
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockDeleteMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: (...args: any[]) => mockFindMany(...args),
      create: (...args: any[]) => mockCreate(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
    },
  },
}));

// Mock auth helpers
const mockGetSession = vi.fn();
const mockRequireUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSession: () => mockGetSession(),
  requireUser: () => mockRequireUser(),
  authErrorResponse: (msg: string, status = 401) => Response.json({ error: msg }, { status }),
}));

// Mock chat-db functions
vi.mock("@/lib/chat-db", () => ({
  getChatUser: (userId: string) => Promise.resolve({ id: userId }),
  serializeConversation: (c: any) => ({
    id: c.id,
    title: c.title,
    userId: c.userId,
    tags: [],
  }),
}));

import { GET, POST, DELETE } from "@/app/api/conversations/route";

describe("Conversations API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/conversations", () => {
    it("should return empty list if user is guest / not authenticated", async () => {
      mockGetSession.mockResolvedValue({ isAuthenticated: false, role: "guest" });
      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body).toEqual({ conversations: [] });
    });

    it("should return list of conversations for authenticated user", async () => {
      mockGetSession.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockFindMany.mockResolvedValue([
        { id: "conv-1", title: "Chat 1", userId: "user-123" },
        { id: "conv-2", title: "Chat 2", userId: "user-123" },
      ]);

      const response = await GET();
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.conversations).toHaveLength(2);
      expect(body.conversations[0].id).toBe("conv-1");
    });
  });

  describe("POST /api/conversations", () => {
    it("should reject guest users", async () => {
      mockRequireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      const response = await POST();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Login diperlukan untuk membuat chat baru.");
    });

    it("should create new conversation for authenticated user", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockCreate.mockResolvedValue({ id: "new-conv", title: "Percakapan baru", userId: "user-123" });

      const response = await POST();
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.conversation.id).toBe("new-conv");
    });
  });

  describe("DELETE /api/conversations", () => {
    it("should reject guest users", async () => {
      mockRequireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      const response = await DELETE();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Login diperlukan untuk menghapus chat.");
    });

    it("should clear conversations for user", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockDeleteMany.mockResolvedValue({ count: 5 });

      const response = await DELETE();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
    });
  });
});

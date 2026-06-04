import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () => ({}),
}));

// Mock prisma client
const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

// Mock auth helpers
const mockRequireUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireUser: () => mockRequireUser(),
  authErrorResponse: (msg: string, status = 401) => Response.json({ error: msg }, { status }),
}));

// Mock chat-db functions
const mockAssertConversationOwner = vi.fn();
vi.mock("@/lib/chat-db", () => ({
  getChatUser: (userId: string) => Promise.resolve({ id: userId }),
  assertConversationOwner: (...args: any[]) => mockAssertConversationOwner(...args),
  serializeMessage: (m: any) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }),
}));

import { GET } from "@/app/api/conversations/[id]/messages/route";

describe("Messages API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/conversations/[id]/messages", () => {
    it("should reject guest users", async () => {
      mockRequireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      const req = new NextRequest("http://localhost/api/conversations/conv-123/messages");
      const response = await GET(req, { params: Promise.resolve({ id: "conv-123" }) });
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Login diperlukan untuk membuka chat.");
    });

    it("should reject if user does not own conversation", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockAssertConversationOwner.mockRejectedValue(new Error("CONVERSATION_NOT_FOUND"));

      const req = new NextRequest("http://localhost/api/conversations/conv-123/messages");
      const response = await GET(req, { params: Promise.resolve({ id: "conv-123" }) });
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Conversation not found");
    });

    it("should return message list for conversation owner", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockAssertConversationOwner.mockResolvedValue({ id: "conv-123", userId: "user-123" });
      mockFindMany.mockResolvedValue([
        { id: "msg-2", role: "assistant", content: "Hai" },
        { id: "msg-1", role: "user", content: "Halo" },
      ]);

      const req = new NextRequest("http://localhost/api/conversations/conv-123/messages");
      const response = await GET(req, { params: Promise.resolve({ id: "conv-123" }) });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].id).toBe("msg-1");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () => ({}),
}));

// Mock prisma client
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appSetting: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    conversation: {
      update: (...args: any[]) => mockUpdate(...args),
    },
  },
}));

// Mock activity logger
vi.mock("@/lib/activity", () => ({
  logActivityEvent: vi.fn(),
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
  createShareId: () => "mocked-share-id",
  serializeConversation: (c: any) => ({
    id: c.id,
    isShared: c.isShared,
    shareId: c.shareId,
  }),
}));

import { PATCH } from "@/app/api/conversations/[id]/share/route";

describe("Share API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("PATCH /api/conversations/[id]/share", () => {
    it("should reject guest users", async () => {
      mockRequireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      
      const req = new NextRequest("http://localhost/api/conversations/conv-123/share", {
        method: "PATCH",
        body: JSON.stringify({ isShared: true }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "conv-123" }) });
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Login diperlukan untuk share chat.");
    });

    it("should reject sharing if sharing is globally disabled by admin", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockFindFirst.mockResolvedValue({ sharingEnabled: false });

      const req = new NextRequest("http://localhost/api/conversations/conv-123/share", {
        method: "PATCH",
        body: JSON.stringify({ isShared: true }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "conv-123" }) });
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("Fitur berbagi percakapan sedang dinonaktifkan");
    });

    it("should allow conversation owner to enable sharing", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockFindFirst.mockResolvedValue({ sharingEnabled: true });
      mockAssertConversationOwner.mockResolvedValue({ id: "conv-123", userId: "user-123", shareId: null });
      mockUpdate.mockResolvedValue({ id: "conv-123", isShared: true, shareId: "mocked-share-id" });

      const req = new NextRequest("http://localhost/api/conversations/conv-123/share", {
        method: "PATCH",
        body: JSON.stringify({ isShared: true }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: "conv-123" }) });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.conversation.isShared).toBe(true);
      expect(body.conversation.shareId).toBe("mocked-share-id");
    });
  });
});

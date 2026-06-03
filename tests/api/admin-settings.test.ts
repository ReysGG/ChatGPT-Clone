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
const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appSetting: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      update: (...args: any[]) => mockUpdate(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

// Mock auth helpers
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth", () => ({
  requireAdmin: () => mockRequireAdmin(),
  authErrorResponse: (msg: string, status = 403) => Response.json({ error: msg }, { status }),
}));

import { GET, PUT } from "@/app/api/admin/settings/route";

describe("Admin Settings API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/admin/settings", () => {
    it("should reject non-admin users with 403 Forbidden", async () => {
      mockRequireAdmin.mockRejectedValue(new Error("ADMIN_REQUIRED"));

      const response = await GET();
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Akses ditolak. Anda bukan admin.");
    });

    it("should allow admins to load settings", async () => {
      mockRequireAdmin.mockResolvedValue({ role: "admin", isAuthenticated: true });
      mockFindFirst.mockResolvedValue({
        id: "global",
        defaultModel: "gemini-2.5-flash-lite",
      });

      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.settings.defaultModel).toBe("gemini-2.5-flash-lite");
    });
  });

  describe("PUT /api/admin/settings", () => {
    it("should reject non-admin users with 403 Forbidden", async () => {
      mockRequireAdmin.mockRejectedValue(new Error("ADMIN_REQUIRED"));

      const req = new NextRequest("http://localhost/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          defaultModel: "gemini-2.5-flash-lite",
          systemPrompt: "Admin Prompt",
          temperature: 0.7,
          registrationEnabled: true,
          sharingEnabled: true,
          maxMessagesPerChat: 100,
          maxPromptLength: 4000,
          maxMessagesPerUserPerDay: 50,
          rateLimitMessagesPerMinute: 10,
        }),
      });

      const response = await PUT(req);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe("Akses ditolak. Anda bukan admin.");
    });

    it("should allow admins to save settings", async () => {
      mockRequireAdmin.mockResolvedValue({ role: "admin", isAuthenticated: true });
      mockFindFirst.mockResolvedValue({ id: "global" });
      mockUpdate.mockResolvedValue({
        defaultModel: "gemini-2.5-pro",
        defaultSystemPrompt: "Custom admin system prompt",
      });

      const req = new NextRequest("http://localhost/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          defaultModel: "gemini-2.5-pro",
          systemPrompt: "Custom admin system prompt",
          temperature: 0.8,
          registrationEnabled: true,
          sharingEnabled: true,
          maxMessagesPerChat: 100,
          maxPromptLength: 4000,
          maxMessagesPerUserPerDay: 50,
          rateLimitMessagesPerMinute: 10,
        }),
      });

      const response = await PUT(req);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.settings.defaultSystemPrompt).toBe("Custom admin system prompt");
    });
  });
});

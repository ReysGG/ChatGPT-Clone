import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: () => ({}),
}));

// Mock prisma client
const mockFindFirstAppSetting = vi.fn();
const mockFindFirstSetting = vi.fn();
const mockCreateSetting = vi.fn();
const mockUpdateSetting = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    appSetting: {
      findFirst: (...args: any[]) => mockFindFirstAppSetting(...args),
    },
    setting: {
      findFirst: (...args: any[]) => mockFindFirstSetting(...args),
      create: (...args: any[]) => mockCreateSetting(...args),
      update: (...args: any[]) => mockUpdateSetting(...args),
    },
  },
}));

// Mock activity logger
vi.mock("@/lib/activity", () => ({
  logActivityEvent: vi.fn(),
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
}));

import { GET, PUT } from "@/app/api/settings/route";

describe("Settings API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /api/settings", () => {
    it("should return default settings if user is not logged in", async () => {
      mockGetSession.mockResolvedValue({ isAuthenticated: false, role: "guest" });
      mockFindFirstAppSetting.mockResolvedValue({
        defaultModel: "gemini-2.5-flash-lite",
        defaultSystemPrompt: "Hello standard Prompt",
        defaultTemperature: 0.7,
      });

      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.settings.defaultModel).toBe("gemini-2.5-flash-lite");
      expect(body.settings.systemPrompt).toBe("Hello standard Prompt");
    });

    it("should return user-specific settings if user is logged in and has custom settings", async () => {
      mockGetSession.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockFindFirstAppSetting.mockResolvedValue(null);
      mockFindFirstSetting.mockResolvedValue({
        defaultModel: "gemini-2.5-pro",
        systemPrompt: "My custom system prompt",
        temperature: 0.9,
      });

      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.settings.defaultModel).toBe("gemini-2.5-pro");
      expect(body.settings.systemPrompt).toBe("My custom system prompt");
    });
  });

  describe("PUT /api/settings", () => {
    it("should reject guest users", async () => {
      mockRequireUser.mockRejectedValue(new Error("AUTH_REQUIRED"));
      
      const req = new NextRequest("http://localhost/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          defaultModel: "gemini-2.5-flash-lite",
          systemPrompt: "Prompt",
          temperature: 0.7,
        }),
      });

      const response = await PUT(req);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Login diperlukan untuk mengubah settings.");
    });

    it("should save user settings when user is logged in", async () => {
      mockRequireUser.mockResolvedValue({ isAuthenticated: true, role: "user", userId: "user-123" });
      mockFindFirstSetting.mockResolvedValue(null); // No existing settings, will create
      mockCreateSetting.mockResolvedValue({
        defaultModel: "gemini-2.5-flash-lite",
        systemPrompt: "New Prompt",
        temperature: 0.8,
      });

      const req = new NextRequest("http://localhost/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          defaultModel: "gemini-2.5-flash-lite",
          systemPrompt: "New Prompt",
          temperature: 0.8,
        }),
      });

      const response = await PUT(req);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.settings.systemPrompt).toBe("New Prompt");
      expect(body.settings.temperature).toBe(0.8);
    });
  });
});

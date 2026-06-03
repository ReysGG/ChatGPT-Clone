import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/headers
const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

// Mock better-auth api getSession
const mockGetSession = vi.fn();
vi.mock("@/lib/better-auth", () => ({
  auth: {
    api: {
      getSession: () => mockGetSession(),
    },
  },
}));

import { getSession, requireUser, requireAdmin, authErrorResponse } from "@/lib/auth";

describe("auth helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  describe("getSession", () => {
    it("should return guest status when session is empty/null", async () => {
      mockGetSession.mockResolvedValue(null);
      const session = await getSession();
      expect(session).toEqual({
        role: "guest",
        isAuthenticated: false,
      });
    });

    it("should return user status when authenticated with a regular email", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "user-123",
          email: "user@example.com",
          name: "John Doe",
          image: null,
        },
      });

      const session = await getSession();
      expect(session).toEqual({
        role: "user",
        isAuthenticated: true,
        userId: "user-123",
        email: "user@example.com",
        name: "John Doe",
        image: null,
      });
    });

    it("should return admin status when authenticated with the admin email", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "admin-123",
          email: "admin@example.com",
          name: "Admin User",
          image: "https://example.com/avatar.png",
        },
      });

      const session = await getSession();
      expect(session).toEqual({
        role: "admin",
        isAuthenticated: true,
        userId: "admin-123",
        email: "admin@example.com",
        name: "Admin User",
        image: "https://example.com/avatar.png",
      });
    });

    it("should treat admin email as case-insensitive", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "admin-123",
          email: "ADMIN@EXAMPLE.COM",
          name: "Admin User",
          image: null,
        },
      });

      const session = await getSession();
      expect(session.role).toBe("admin");
    });
  });

  describe("requireUser", () => {
    it("should throw AUTH_REQUIRED error if user is guest", async () => {
      mockGetSession.mockResolvedValue(null);
      await expect(requireUser()).rejects.toThrow("AUTH_REQUIRED");
    });

    it("should return session if user is authenticated", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "user-123",
          email: "user@example.com",
        },
      });
      const session = await requireUser();
      expect(session.isAuthenticated).toBe(true);
    });
  });

  describe("requireAdmin", () => {
    it("should throw ADMIN_REQUIRED error if user is not admin", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "user-123",
          email: "user@example.com",
        },
      });
      await expect(requireAdmin()).rejects.toThrow("ADMIN_REQUIRED");
    });

    it("should return session if user is admin", async () => {
      mockGetSession.mockResolvedValue({
        user: {
          id: "admin-123",
          email: "admin@example.com",
        },
      });
      const session = await requireAdmin();
      expect(session.role).toBe("admin");
    });
  });

  describe("authErrorResponse", () => {
    it("should create Response with default status and message", async () => {
      const response = authErrorResponse();
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: "Login diperlukan untuk mengirim pesan." });
    });

    it("should support custom status and message", async () => {
      const response = authErrorResponse("Ditolak", 403);
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({ error: "Ditolak" });
    });
  });
});

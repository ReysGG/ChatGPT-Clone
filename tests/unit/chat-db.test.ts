import { describe, it, expect, vi } from "vitest";

// Mock server-only before anything else
vi.mock("server-only", () => ({}));

// Mock prisma before importing lib/chat-db to avoid database connectivity issues during testing
vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn(),
    },
  },
}));

import {
  createTitleFromMessage,
  serializeConversation,
  serializeMessage,
  createShareId,
} from "@/lib/chat-db";

describe("chat-db utilities", () => {
  describe("createTitleFromMessage", () => {
    it("should clean and trim whitespace", () => {
      expect(createTitleFromMessage("  hello   world  ")).toBe("hello world");
    });

    it("should return default value for empty message", () => {
      expect(createTitleFromMessage("   ")).toBe("Percakapan baru");
    });

    it("should truncate message to 48 chars and add ellipsis if longer", () => {
      const longMsg = "a".repeat(100);
      expect(createTitleFromMessage(longMsg)).toBe("a".repeat(48) + "…");
    });

    it("should not truncate message if exactly 48 chars or shorter", () => {
      const msg48 = "a".repeat(48);
      expect(createTitleFromMessage(msg48)).toBe(msg48);
    });
  });

  describe("serializeConversation", () => {
    it("should properly format a conversation object", () => {
      const now = new Date("2026-06-03T12:00:00Z");
      const rawConv = {
        id: "conv-123",
        title: "Test Chat",
        createdAt: now,
        updatedAt: now,
        isShared: true,
        shareId: "share-abc",
        sharedAt: now,
        tags: [
          { tag: { id: "tag-1", name: "Penting" } },
        ],
      };

      const result = serializeConversation(rawConv);
      expect(result).toEqual({
        id: "conv-123",
        title: "Test Chat",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        isShared: true,
        shareId: "share-abc",
        sharedAt: now.toISOString(),
        tags: [
          { id: "tag-1", name: "Penting" },
        ],
      });
    });

    it("should return defaults for optional fields if missing", () => {
      const now = new Date("2026-06-03T12:00:00Z");
      const rawConv = {
        id: "conv-123",
        title: "Test Chat",
        createdAt: now,
        updatedAt: now,
      };

      const result = serializeConversation(rawConv);
      expect(result).toEqual({
        id: "conv-123",
        title: "Test Chat",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        isShared: false,
        shareId: null,
        sharedAt: null,
        tags: [],
      });
    });
  });

  describe("serializeMessage", () => {
    it("should format message properly", () => {
      const now = new Date("2026-06-03T12:00:00Z");
      const rawMsg = {
        id: "msg-123",
        role: "user",
        content: "Halo AI",
        createdAt: now,
      };

      const result = serializeMessage(rawMsg);
      expect(result).toEqual({
        id: "msg-123",
        role: "user",
        content: "Halo AI",
        createdAt: now.toISOString(),
      });
    });
  });

  describe("createShareId", () => {
    it("should generate a non-empty string", () => {
      const id1 = createShareId();
      const id2 = createShareId();
      expect(id1).toBeTypeOf("string");
      expect(id1.length).toBeGreaterThan(5);
      expect(id1).not.toBe(id2);
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureFirstTouch,
  FIRST_TOUCH_STORAGE_KEY,
  readFirstTouchAttribution,
} from "../first-touch";

type StorageStub = Pick<Storage, "getItem" | "setItem">;

function stubBrowser({
  search = "",
  referrer = "",
  storage,
}: {
  search?: string;
  referrer?: string;
  storage: StorageStub;
}) {
  vi.stubGlobal("window", {
    localStorage: storage,
    location: { search },
  });
  vi.stubGlobal("document", { referrer });
}

describe("first-touch attribution", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("when the visitor has no recorded first touch", () => {
    it("stores the attribution fields and capture timestamp together", () => {
      // Arrange
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-07T15:30:00.000Z"));
      const storage: StorageStub = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      };
      stubBrowser({
        search:
          "?utm_source=whatsapp&utm_medium=social&utm_campaign=eleicoes&utm_content=grupo-a",
        referrer: "https://example.com/origem?convite=pessoal#trecho",
        storage,
      });

      // Act
      captureFirstTouch();

      // Assert
      expect(storage.setItem).toHaveBeenCalledWith(
        FIRST_TOUCH_STORAGE_KEY,
        JSON.stringify({
          utmSource: "whatsapp",
          utmMedium: "social",
          utmCampaign: "eleicoes",
          utmContent: "grupo-a",
          referrer: "https://example.com/origem",
          capturedAt: "2026-09-07T15:30:00.000Z",
        }),
      );
    });

    it("stores null for missing UTM fields", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      };
      stubBrowser({ storage });

      // Act
      captureFirstTouch();

      // Assert
      const storedValue = vi.mocked(storage.setItem).mock.calls[0]?.[1];
      expect(JSON.parse(storedValue ?? "")).toMatchObject({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: "",
      });
    });

    it("discards a referrer that is not an HTTP address", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      };
      stubBrowser({ referrer: "not-a-url", storage });

      // Act
      captureFirstTouch();

      // Assert
      const storedValue = vi.mocked(storage.setItem).mock.calls[0]?.[1];
      expect(JSON.parse(storedValue ?? "")).toMatchObject({ referrer: null });
    });
  });

  describe("when a first touch already exists", () => {
    it("does not replace it", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() => "existing-value"),
        setItem: vi.fn(),
      };
      stubBrowser({
        search: "?utm_source=google",
        storage,
      });

      // Act
      captureFirstTouch();

      // Assert
      expect(storage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("when browser storage is unavailable", () => {
    it("returns safely when reading throws", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() => {
          throw new Error("Storage blocked");
        }),
        setItem: vi.fn(),
      };
      stubBrowser({ storage });

      // Act
      const capture = () => captureFirstTouch();

      // Assert
      expect(capture).not.toThrow();
      expect(storage.setItem).not.toHaveBeenCalled();
    });

    it("returns safely when writing throws", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => {
          throw new Error("Storage blocked");
        }),
      };
      stubBrowser({ storage });

      // Act
      const capture = () => captureFirstTouch();

      // Assert
      expect(capture).not.toThrow();
    });
  });

  describe("when rendered on the server", () => {
    it("returns without accessing browser APIs", () => {
      // Arrange
      vi.stubGlobal("window", undefined);

      // Act
      const capture = () => captureFirstTouch();

      // Assert
      expect(capture).not.toThrow();
    });
  });

  describe("when reading attribution", () => {
    it("returns the stored attribution fields", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() =>
          JSON.stringify({
            utmSource: "whatsapp",
            utmMedium: "social",
            utmCampaign: null,
            utmContent: "grupo-a",
            referrer: "https://example.com/origem?convite=pessoal#trecho",
            capturedAt: "2026-09-07T15:30:00.000Z",
          }),
        ),
        setItem: vi.fn(),
      };
      stubBrowser({ storage });

      // Act
      const attribution = readFirstTouchAttribution();

      // Assert
      expect(attribution).toEqual({
        utmSource: "whatsapp",
        utmMedium: "social",
        utmCampaign: null,
        utmContent: "grupo-a",
        referrer: "https://example.com/origem",
      });
    });

    it("returns nullable fields when the stored value is invalid", () => {
      // Arrange
      const storage: StorageStub = {
        getItem: vi.fn(() => "invalid-json"),
        setItem: vi.fn(),
      };
      stubBrowser({ storage });

      // Act
      const attribution = readFirstTouchAttribution();

      // Assert
      expect(attribution).toEqual({
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        utmContent: null,
        referrer: null,
      });
    });
  });
});

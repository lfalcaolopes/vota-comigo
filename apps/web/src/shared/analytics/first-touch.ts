import type { Attribution } from "@vota-comigo/shared-types";

export const FIRST_TOUCH_STORAGE_KEY = "vota-comigo:first-touch";

export type FirstTouch = Omit<Attribution, "referrer"> & {
  referrer: string;
  capturedAt: string;
};

const EMPTY_ATTRIBUTION: Attribution = {
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  utmContent: null,
  referrer: null,
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export function readFirstTouchAttribution(): Attribution {
  if (typeof window === "undefined") return { ...EMPTY_ATTRIBUTION };

  let storedFirstTouch: string | null;

  try {
    storedFirstTouch = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
  } catch {
    return { ...EMPTY_ATTRIBUTION };
  }

  if (storedFirstTouch === null) return { ...EMPTY_ATTRIBUTION };

  try {
    const value: unknown = JSON.parse(storedFirstTouch);
    if (typeof value !== "object" || value === null) {
      return { ...EMPTY_ATTRIBUTION };
    }

    const attribution = value as Record<string, unknown>;
    if (
      !isNullableString(attribution.utmSource) ||
      !isNullableString(attribution.utmMedium) ||
      !isNullableString(attribution.utmCampaign) ||
      !isNullableString(attribution.utmContent) ||
      !isNullableString(attribution.referrer)
    ) {
      return { ...EMPTY_ATTRIBUTION };
    }

    return {
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      utmContent: attribution.utmContent,
      referrer: attribution.referrer,
    };
  } catch {
    return { ...EMPTY_ATTRIBUTION };
  }
}

export function captureFirstTouch(): void {
  if (typeof window === "undefined") return;

  let existingFirstTouch: string | null;

  try {
    existingFirstTouch = window.localStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
  } catch {
    return;
  }

  if (existingFirstTouch !== null) return;

  const searchParams = new URLSearchParams(window.location.search);
  const firstTouch: FirstTouch = {
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),
    utmContent: searchParams.get("utm_content"),
    referrer: document.referrer,
    capturedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(
      FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify(firstTouch),
    );
  } catch {}
}

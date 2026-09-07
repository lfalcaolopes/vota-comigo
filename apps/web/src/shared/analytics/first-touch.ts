export const FIRST_TOUCH_STORAGE_KEY = "vota-comigo:first-touch";

export type FirstTouch = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  referrer: string;
  capturedAt: string;
};

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

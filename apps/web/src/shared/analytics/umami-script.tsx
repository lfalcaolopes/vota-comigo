"use client";

import Script from "next/script";

import { keepCampaignParams } from "./campaign-params";

type UmamiPayload = { url: string };

declare global {
  interface Window {
    umamiBeforeSend?: (type: string, payload: UmamiPayload) => UmamiPayload;
  }
}

// Set at module load so it exists before the tracker's first send; search terms and filters must not reach Umami.
if (typeof window !== "undefined") {
  window.umamiBeforeSend = (_type, payload) => ({
    ...payload,
    url: keepCampaignParams(payload.url),
  });
}

export function UmamiScript() {
  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id="e0275ca9-8678-4b71-b095-dfcb1f37dc80"
      data-domains="www.quemvotacomigo.com.br,quemvotacomigo.com.br"
      data-do-not-track="true"
      data-exclude-hash="true"
      data-before-send="umamiBeforeSend"
      strategy="afterInteractive"
    />
  );
}

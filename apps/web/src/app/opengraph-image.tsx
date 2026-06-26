import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_NAME } from "@/shared/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1C1612";
const PRIMARY = "#BD5A1C";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: "80px",
        }}
      >
        <svg width="132" height="132" viewBox="0 0 200 200" fill="none">
          <path
            d="M116 40H60C54.6957 40 49.6086 42.1071 45.8579 45.8579C42.1071 49.6086 40 54.6957 40 60V130L70 160H84"
            stroke={INK}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M108 160V134"
            stroke={PRIMARY}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M132 160V117"
            stroke={PRIMARY}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M156 160V93"
            stroke={PRIMARY}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M86.5 78.5L107.5 99.5L156 51"
            stroke={INK}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 700,
              color: INK,
              letterSpacing: "-0.02em",
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: "34px",
              color: "#5c534c",
              lineHeight: 1.4,
              maxWidth: "900px",
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>

        <div
          style={{ display: "flex", height: "12px", backgroundColor: PRIMARY }}
        />
      </div>
    ),
    size,
  );
}

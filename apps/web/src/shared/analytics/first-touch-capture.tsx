"use client";

import { useEffect } from "react";

import { captureFirstTouch } from "./first-touch";

export function FirstTouchCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);

  return null;
}

"use client";

import { useLayoutEffect } from "react";

export function DeputadoPerfilScrollReset() {
  useLayoutEffect(() => {
    if (window.location.hash === "") {
      window.scrollTo(0, 0);
    }
  }, []);

  return null;
}

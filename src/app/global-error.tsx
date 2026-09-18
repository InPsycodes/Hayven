"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Only rendered when an error escapes the root layout itself -- deliberately
 * dependency-light (no next/font, no shared components) so the fallback
 * can't itself fail to render for the same reason the page did.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          backgroundColor: "#e4e1df",
          color: "#1a1a1a",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#4a4744", fontSize: "14px", margin: 0, maxWidth: "320px" }}>
          We&apos;ve been notified and are looking into it. You can try again, or come back in a moment.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "8px",
            padding: "10px 20px",
            backgroundColor: "#9c5934",
            color: "#faf8f6",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

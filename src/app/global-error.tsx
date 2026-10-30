"use client";

/** Last-resort error boundary (renders outside the locale layout). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Something went wrong · حدث خطأ ما</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}>
            Try again · حاول مرة أخرى
          </button>
        </div>
      </body>
    </html>
  );
}

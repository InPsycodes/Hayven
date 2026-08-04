import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

const VALID_SIZES = ["192", "512", "512-maskable"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  if (!VALID_SIZES.includes(size as (typeof VALID_SIZES)[number])) {
    return new NextResponse("Not found", { status: 404 });
  }

  const px = size.startsWith("512") ? 512 : 192;
  const isMaskable = size.endsWith("maskable");
  // Maskable icons need safe-area padding so platform masks don't clip the glyph.
  const pad = isMaskable ? Math.round(px * 0.16) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#17140F",
        }}
      >
        <div
          style={{
            width: px - pad * 2,
            height: px - pad * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#9C5934",
            borderRadius: px * 0.08,
          }}
        >
          <span
            style={{
              color: "#FFFFFF",
              fontSize: (px - pad * 2) * 0.5,
              fontWeight: 600,
              fontFamily: "sans-serif",
            }}
          >
            H
          </span>
        </div>
      </div>
    ),
    { width: px, height: px }
  );
}

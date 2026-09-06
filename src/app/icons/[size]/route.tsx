import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

const VALID_SIZES = ["192", "512", "512-maskable", "badge"] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  if (!VALID_SIZES.includes(size as (typeof VALID_SIZES)[number])) {
    return new NextResponse("Not found", { status: 404 });
  }

  // The Android notification badge is masked to its alpha channel and drawn
  // in the system's monochrome tint -- it needs a transparent background and
  // generous safe-area padding, not the filled dark square the app icons use
  // (that would render as a solid blob).
  const isBadge = size === "badge";
  const px = isBadge ? 96 : size.startsWith("512") ? 512 : 192;
  const isMaskable = size.endsWith("maskable");
  const padRatio = isBadge ? 0.22 : isMaskable ? 0.16 : 0;
  const pad = Math.round(px * padRatio);

  const logo = await readFile(join(process.cwd(), "public/images/logo-icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isBadge ? "transparent" : "#17140F",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={px - pad * 2}
          height={px - pad * 2}
          alt=""
        />
      </div>
    ),
    { width: px, height: px }
  );
}

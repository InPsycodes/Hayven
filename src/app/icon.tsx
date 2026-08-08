import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  const logo = await readFile(join(process.cwd(), "public/images/logo-icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoSrc} width={size.width} height={size.height} alt="" />
    ),
    size
  );
}

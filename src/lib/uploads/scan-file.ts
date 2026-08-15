import "server-only";

const CLOUDMERSIVE_SCAN_URL = "https://api.cloudmersive.com/virus/scan/file";

export type ScanResult = { clean: true } | { clean: false; reason: string };

/**
 * Fail CLOSED, unlike the rest of this codebase's fire-and-forget
 * integrations (email, rate limiting): those degrade gracefully because
 * nothing bad happens if they silently no-op. This one exists specifically
 * to stop a malicious file before it ever reaches storage -- if the scan
 * can't be completed (no key configured, network error, API outage), the
 * upload must be rejected, not let through unscanned.
 */
export async function scanFileForViruses(file: File): Promise<ScanResult> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY;
  if (!apiKey) {
    console.error("scanFileForViruses: CLOUDMERSIVE_API_KEY not configured -- rejecting upload");
    return { clean: false, reason: "File scanning isn't available right now. Please try again shortly." };
  }

  const formData = new FormData();
  formData.append("inputFile", file, file.name);

  let response: Response;
  try {
    response = await fetch(CLOUDMERSIVE_SCAN_URL, {
      method: "POST",
      headers: { Apikey: apiKey },
      body: formData,
    });
  } catch (err) {
    console.error("scanFileForViruses: request threw", err);
    return { clean: false, reason: "Couldn't verify this file right now. Please try again in a moment." };
  }

  if (!response.ok) {
    console.error("scanFileForViruses: API error", response.status, await response.text().catch(() => ""));
    return { clean: false, reason: "Couldn't verify this file right now. Please try again in a moment." };
  }

  const result = (await response.json()) as { CleanResult?: boolean };
  if (result.CleanResult !== true) {
    return { clean: false, reason: "This file failed a security scan and can't be uploaded." };
  }
  return { clean: true };
}

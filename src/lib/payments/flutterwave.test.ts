import { afterEach, describe, expect, it } from "vitest";

import { verifyWebhookHash } from "./flutterwave";

const original = process.env.FLUTTERWAVE_WEBHOOK_HASH;
afterEach(() => {
  process.env.FLUTTERWAVE_WEBHOOK_HASH = original;
});

describe("verifyWebhookHash", () => {
  it("accepts only the exact secret hash", () => {
    process.env.FLUTTERWAVE_WEBHOOK_HASH = "s3cret-hash";
    expect(verifyWebhookHash("s3cret-hash")).toBe(true);
    expect(verifyWebhookHash("s3cret-hasx")).toBe(false);
    expect(verifyWebhookHash("s3cret")).toBe(false);
    expect(verifyWebhookHash(null)).toBe(false);
  });

  it("accepts nothing when no hash is configured", () => {
    delete process.env.FLUTTERWAVE_WEBHOOK_HASH;
    expect(verifyWebhookHash("")).toBe(false);
    expect(verifyWebhookHash("anything")).toBe(false);
  });
});

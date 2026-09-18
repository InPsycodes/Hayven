import Link from "next/link";
import { IconWifiOff } from "@tabler/icons-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-offwhite px-6 text-center">
      <IconWifiOff size={28} stroke={1.5} className="text-muted-foreground" />
      <h1 className="font-heading text-xl text-charcoal">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your dashboard, bookings, and messages need a connection. Reconnect and this
        page will load.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        In the meantime, any{" "}
        <Link href="/learn" className="font-medium text-terracotta hover:underline">
          Learning Center
        </Link>{" "}
        guides you&apos;ve already opened are still readable.
      </p>
    </div>
  );
}

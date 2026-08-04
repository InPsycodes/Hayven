import { IconWifiOff } from "@tabler/icons-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-offwhite px-6 text-center">
      <IconWifiOff size={28} stroke={1.5} className="text-muted-foreground" />
      <h1 className="font-heading text-xl text-charcoal">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Hayven needs a connection to load this page. Check your network and try again.
      </p>
    </div>
  );
}

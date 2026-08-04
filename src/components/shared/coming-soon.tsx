import { IconTools } from "@tabler/icons-react";

/**
 * Stub for nav-referenced routes outside the 19 screens covered by the
 * approved UI-prompts spec (e.g. admin Users/Reports/Metrics) -- keeps every
 * nav link clickable without fabricating a design that was never speced.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <IconTools size={28} stroke={1.5} className="text-muted-foreground" />
      <h1 className="font-heading text-xl text-charcoal">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This area isn&apos;t part of the current build yet. It&apos;s wired into
        navigation so the app feels complete, but the screen itself hasn&apos;t
        been designed.
      </p>
    </div>
  );
}

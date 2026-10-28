export default function StepsLayout({ children }: { children: React.ReactNode }) {
  return (
    // min-h-[calc(...)], not min-h-screen -- see the --pwa-reserve comment
    // in globals.css. Covers the booking flow and signup steps, where a
    // live audit found the install toast landing directly on the signup
    // consent checkbox.
    <main
      id="main"
      className="flex min-h-[calc(100dvh-var(--pwa-reserve,0px))] items-start justify-center bg-offwhite p-4 py-10 md:items-center md:p-10"
    >
      {/* bg-card, not bg-paper: --paper and --offwhite are the same colour,
          so a paper card vanished into the page and the dark step header
          floated on its own. The card colour also lets the bg-paper chips
          and summary panels inside read as tinted boxes. */}
      <div className="w-full max-w-[640px] overflow-hidden rounded-md bg-card shadow-[0_1px_2px_rgba(26,26,26,.04),0_6px_16px_-10px_rgba(26,26,26,.15)]">
        {children}
      </div>
    </main>
  );
}

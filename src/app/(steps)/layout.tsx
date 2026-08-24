export default function StepsLayout({ children }: { children: React.ReactNode }) {
  return (
    // min-h-[calc(...)], not min-h-screen -- see the --pwa-reserve comment
    // in globals.css. Covers the booking flow and signup steps, where a
    // live audit found the install toast landing directly on the signup
    // consent checkbox.
    <main
      id="main"
      className="flex min-h-[calc(100vh-var(--pwa-reserve,0px))] items-start justify-center bg-offwhite p-4 py-10 md:items-center md:p-10"
    >
      <div className="w-full max-w-[640px] overflow-hidden rounded-md bg-paper">
        {children}
      </div>
    </main>
  );
}

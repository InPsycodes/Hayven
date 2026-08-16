export default function StepsLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-offwhite p-4 py-10 md:items-center md:p-10">
      <div className="w-full max-w-[640px] overflow-hidden rounded-md bg-paper">
        {children}
      </div>
    </main>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="flex min-h-screen flex-col md:flex-row">{children}</main>;
}

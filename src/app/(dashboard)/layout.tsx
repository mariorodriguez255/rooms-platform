import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { AppHeader } from "./app-header";

// Shell of the signed-in area. The parts that depend on the session stream
// in behind Suspense boundaries (Cache Components), so the shell itself is
// static and loads instantly.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4">
          <Link href="/dashboard" className="font-semibold">
            rooms-platform
          </Link>
          <Suspense
            fallback={
              <div className="ml-auto h-8 w-40 animate-pulse rounded-md bg-muted" />
            }
          >
            <AppHeader />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

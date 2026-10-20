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
        {/* Phones: logo and menu on one row, navigation below. */}
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="order-1 font-semibold">
            rooms-platform
          </Link>
          <Suspense
            fallback={
              <div className="order-2 ml-auto h-8 w-40 animate-pulse rounded-md bg-muted" />
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

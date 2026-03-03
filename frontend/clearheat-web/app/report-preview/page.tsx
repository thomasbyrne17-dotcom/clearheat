import { Suspense } from "react";
import ReportPreviewClient from "./ReportPreviewClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-6 py-10">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </main>
      }
    >
      <ReportPreviewClient />
    </Suspense>
  );
}
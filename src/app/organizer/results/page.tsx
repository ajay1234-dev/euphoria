"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageSkeleton } from "@/components/common/PageSkeleton";

function RedirectToProjectorResults() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/projector/results${query ? `?${query}` : ""}`);
  }, [router, searchParams]);

  return <PageSkeleton />;
}

export default function OrganizerResultsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RedirectToProjectorResults />
    </Suspense>
  );
}

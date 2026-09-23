"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageSkeleton } from "@/components/common/PageSkeleton";

export default function OrganizerDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projector/timer");
  }, [router]);

  return <PageSkeleton />;
}

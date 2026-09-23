"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppConfig } from "@/hooks/useData";
import { CinematicProjector } from "@/components/organizer/CinematicProjector";
import { normalizeProjectionSetId, type ProjectionSetId } from "@/config/projection";

function ResultsPresentation() {
  const { config } = useAppConfig();
  const searchParams = useSearchParams();

  const urlSet = searchParams.get("set");
  const forcedSetId: ProjectionSetId | undefined = urlSet
    ? normalizeProjectionSetId(urlSet)
    : undefined;

  const urlTest = searchParams.get("test");
  const forcedTestMode: boolean | undefined =
    urlTest !== null ? urlTest === "true" : undefined;

  const eventId = config?.activeEventId ?? null;

  return (
    <CinematicProjector
      eventId={eventId}
      forcedSetId={forcedSetId}
      forcedTestMode={forcedTestMode}
    />
  );
}

export default function ResultsProjectorPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-white flex items-center justify-center select-none" />
      }
    >
      <ResultsPresentation />
    </Suspense>
  );
}

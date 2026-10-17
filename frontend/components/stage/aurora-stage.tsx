"use client";

import { useEffect, useRef } from "react";

const AuroraStage = () => {
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const syncPaused = () => stage.toggleAttribute("data-paused", document.hidden);
    syncPaused();
    document.addEventListener("visibilitychange", syncPaused);
    return () => document.removeEventListener("visibilitychange", syncPaused);
  }, []);

  return (
    <div ref={stageRef} className="aurora" aria-hidden="true">
      <div className="aurora__orb aurora__orb--indigo" />
      <div className="aurora__orb aurora__orb--teal" />
      <div className="aurora__orb aurora__orb--amber" />
      <div className="aurora__noise" />
      <div className="aurora__vignette" />
    </div>
  );
};

export default AuroraStage;

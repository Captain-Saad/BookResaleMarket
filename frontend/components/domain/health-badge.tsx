"use client";

import Badge from "@/components/ui/badge";
import useHealthStatus from "@/hooks/use-health-status";
import type { HealthBadgeProps } from "@/lib/types";

const HealthBadge = ({ labels, tones }: HealthBadgeProps) => {
  const status = useHealthStatus();

  return (
    <p role="status" className="flex justify-center">
      <Badge tone={tones[status]}>{labels[status]}</Badge>
    </p>
  );
};

export default HealthBadge;

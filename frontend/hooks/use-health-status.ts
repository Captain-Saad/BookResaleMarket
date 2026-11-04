import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { HealthStatus } from "@/lib/types";

const useHealthStatus = () => {
  const [status, setStatus] = useState(HealthStatus.Checking);

  useEffect(() => {
    let active = true;
    api
      .GET("/healthz")
      .then(({ data }) => {
        if (active) setStatus(data?.status === "ok" ? HealthStatus.Online : HealthStatus.Offline);
      })
      .catch(() => {
        if (active) setStatus(HealthStatus.Offline);
      });
    return () => {
      active = false;
    };
  }, []);

  return status;
};

export default useHealthStatus;

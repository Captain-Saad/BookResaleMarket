import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import HealthBadge from "@/components/domain/health-badge";
import { API_BASE_URL, HEALTH_BADGE_LABELS, HEALTH_BADGE_TONES } from "@/lib/constants";
import { server } from "../utils/msw";

const renderBadge = () =>
  render(<HealthBadge labels={HEALTH_BADGE_LABELS} tones={HEALTH_BADGE_TONES} />);

describe("HealthBadge", () => {
  it("shows the API as online when /healthz answers ok", async () => {
    renderBadge();
    expect(screen.getByRole("status")).toHaveTextContent("Checking API…");
    expect(await screen.findByText("API online")).toBeInTheDocument();
  });

  it("shows the API as offline when the request fails", async () => {
    server.use(http.get(`${API_BASE_URL}/healthz`, () => HttpResponse.error()));
    renderBadge();
    expect(await screen.findByText("API offline")).toBeInTheDocument();
  });

  it("shows the API as offline on an error status", async () => {
    server.use(http.get(`${API_BASE_URL}/healthz`, () => HttpResponse.json({}, { status: 503 })));
    renderBadge();
    expect(await screen.findByText("API offline")).toBeInTheDocument();
  });
});

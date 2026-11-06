"use client";

import ResourceState from "@/components/domain/resource-state";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useSellerPanel } from "@/hooks/use-account";
import { LoadStatus, SaveStatus, type SellerPanelProps, UserRole } from "@/lib/types";

const SellerPanel = ({ copy }: SellerPanelProps) => {
  const { status, account, retry, saveStatus, isBusy, becomeSeller, startVerification } =
    useSellerPanel();
  const verification = account && copy.statuses[account.sellerVerification];

  return (
    <section className="glass glass--2 flex flex-col items-start gap-4 p-6">
      <h1 className="font-display text-h2 text-ink-1">{copy.title}</h1>
      {status !== LoadStatus.Ready || !account || !verification ? (
        <ResourceState status={status} copy={copy} onRetry={retry} />
      ) : !account.roles.includes(UserRole.Seller) ? (
        <>
          <p className="text-ink-2">{copy.becomeDescription}</p>
          <Button loading={isBusy} onClick={becomeSeller}>
            {copy.becomeLabel}
          </Button>
        </>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-1">
            {copy.statusLabel}
            <Badge>{verification.badge}</Badge>
          </p>
          <p role="status" className="text-ink-2">
            {verification.description}
          </p>
          {copy.startableStatuses.includes(account.sellerVerification) && (
            <Button loading={isBusy} onClick={startVerification}>
              {copy.startLabel}
            </Button>
          )}
        </>
      )}
      {saveStatus === SaveStatus.Failed && (
        <p role="alert" className="text-sm text-danger-ink">
          {copy.saveFailed}
        </p>
      )}
    </section>
  );
};

export default SellerPanel;

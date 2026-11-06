import Button from "@/components/ui/button";
import { LoadStatus, type ResourceStateProps } from "@/lib/types";

const ResourceState = ({ status, copy, onRetry }: ResourceStateProps) =>
  status === LoadStatus.Loading ? (
    <p role="status" className="text-ink-2">
      {copy.loading}
    </p>
  ) : (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-ink-2">{copy.loadFailed}</p>
      <Button variant="secondary" onClick={onRetry}>
        {copy.retry}
      </Button>
    </div>
  );

export default ResourceState;

"use client";

import FormFields from "@/components/domain/form-fields";
import ResourceState from "@/components/domain/resource-state";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { useAddressManager } from "@/hooks/use-account";
import { type AddressManagerProps, LoadStatus, SaveStatus } from "@/lib/types";

const AddressManager = ({ copy }: AddressManagerProps) => {
  const {
    status,
    addresses,
    retry,
    form,
    onSubmit,
    saveStatus,
    isEditorOpen,
    openEditor,
    closeEditor,
    deleting,
    setDeleting,
    confirmDelete,
  } = useAddressManager();
  const saveFailed = saveStatus === SaveStatus.Failed && (
    <p role="alert" className="text-sm text-danger-ink">
      {copy.saveFailed}
    </p>
  );

  return (
    <section className="glass glass--2 flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-h2 text-ink-1">{copy.title}</h1>
        {status === LoadStatus.Ready && (
          <Button onClick={() => openEditor(null)}>{copy.addLabel}</Button>
        )}
      </div>
      {status !== LoadStatus.Ready ? (
        <ResourceState status={status} copy={copy} onRetry={retry} />
      ) : addresses.length === 0 ? (
        <p className="text-ink-2">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-md border border-glass-border p-4"
            >
              <address className="text-ink-2 not-italic">
                <span className="block font-medium text-ink-1">{address.recipientName}</span>
                {address.line1}
                {address.line2 && <span className="block">{address.line2}</span>}
                <span className="block">
                  {address.city}, {address.region} {address.postalCode}, {address.country}
                </span>
              </address>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => openEditor(address)}>
                  {copy.editLabel}
                </Button>
                <Button variant="ghost" onClick={() => setDeleting(address)}>
                  {copy.deleteLabel}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={isEditorOpen}
        onOpenChange={(open) => !open && closeEditor()}
        title={copy.formTitle}
        closeLabel={copy.closeLabel}
      >
        <form method="post" noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormFields form={form} fields={copy.fields} idPrefix="address" />
          {saveFailed}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeEditor}>
              {copy.cancelLabel}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {copy.submitLabel}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={copy.deleteTitle}
        description={copy.deleteDescription}
        closeLabel={copy.closeLabel}
      >
        {saveFailed}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            {copy.cancelLabel}
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            {copy.deleteLabel}
          </Button>
        </div>
      </Modal>
    </section>
  );
};

export default AddressManager;

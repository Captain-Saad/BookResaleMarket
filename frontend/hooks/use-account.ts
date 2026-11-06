import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import {
  accountSchema,
  type Address,
  addressFormSchema,
  addressListSchema,
  profileFormSchema,
} from "@/lib/auth/schemas";
import { API_PATHS, EMPTY_ADDRESS } from "@/lib/constants";
import { type AuthFormValues, LoadStatus, SaveStatus } from "@/lib/types";

const useResource = <T>(path: string, schema: z.ZodType<T>) => {
  const [state, setState] = useState<{ status: LoadStatus; data?: T }>({
    status: LoadStatus.Loading,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch(path)
      .then(({ ok, body }) => {
        const parsed = schema.safeParse(body);
        if (!active) return;
        setState(
          ok && parsed.success
            ? { status: LoadStatus.Ready, data: parsed.data }
            : { status: LoadStatus.Failed },
        );
      })
      .catch(() => {
        if (active) setState({ status: LoadStatus.Failed });
      });
    return () => {
      active = false;
    };
  }, [path, schema, attempt]);

  const retry = useCallback(() => {
    setState({ status: LoadStatus.Loading });
    setAttempt((value) => value + 1);
  }, []);

  const setData = useCallback((data: T) => setState({ status: LoadStatus.Ready, data }), []);

  return { ...state, retry, setData };
};

const send = (path: string, method: string, values?: AuthFormValues) =>
  apiFetch(path, { method, body: values && JSON.stringify(values) });

export const useProfileForm = () => {
  const { status, data, retry, setData } = useResource(API_PATHS.me, accountSchema);
  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle);
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: data && { displayName: data.displayName, phone: data.phone ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaveStatus(SaveStatus.Idle);
    try {
      const { ok, body } = await send(API_PATHS.me, "PATCH", values);
      const parsed = accountSchema.safeParse(body);
      if (ok && parsed.success) setData(parsed.data);
      setSaveStatus(ok && parsed.success ? SaveStatus.Saved : SaveStatus.Failed);
    } catch {
      setSaveStatus(SaveStatus.Failed);
    }
  });

  return { status, account: data, retry, form, onSubmit, saveStatus };
};

export const useAddressManager = () => {
  const { status, data, retry, setData } = useResource(API_PATHS.addresses, addressListSchema);
  const addresses = data ?? [];
  const [editing, setEditing] = useState<{ address: Address | null } | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle);
  const form = useForm<AuthFormValues>({ resolver: zodResolver(addressFormSchema) });

  const openEditor = (address: Address | null) => {
    setSaveStatus(SaveStatus.Idle);
    form.reset(
      address ? { ...EMPTY_ADDRESS, ...address, line2: address.line2 ?? "" } : EMPTY_ADDRESS,
    );
    setEditing({ address });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const { address } = editing;
      const { ok, body } = await send(
        address ? `${API_PATHS.addresses}/${address.id}` : API_PATHS.addresses,
        address ? "PATCH" : "POST",
        values,
      );
      const parsed = addressListSchema.element.safeParse(body);
      if (!ok || !parsed.success) {
        setSaveStatus(SaveStatus.Failed);
        return;
      }
      setData(
        address
          ? addresses.map((item) => (item.id === parsed.data.id ? parsed.data : item))
          : [...addresses, parsed.data],
      );
      setEditing(null);
    } catch {
      setSaveStatus(SaveStatus.Failed);
    }
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const { ok } = await send(`${API_PATHS.addresses}/${deleting.id}`, "DELETE");
      if (!ok) {
        setSaveStatus(SaveStatus.Failed);
        return;
      }
      setData(addresses.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch {
      setSaveStatus(SaveStatus.Failed);
    }
  };

  return {
    status,
    addresses,
    retry,
    form,
    onSubmit,
    saveStatus,
    isEditorOpen: editing !== null,
    openEditor,
    closeEditor: () => setEditing(null),
    deleting,
    setDeleting,
    confirmDelete,
  };
};

export const useSellerPanel = () => {
  const { status, data, retry, setData } = useResource(API_PATHS.me, accountSchema);
  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (path: string) => {
    setIsBusy(true);
    setSaveStatus(SaveStatus.Idle);
    try {
      const { ok, body } = await send(path, "POST");
      const parsed = accountSchema.safeParse(body);
      if (ok && parsed.success) setData(parsed.data);
      else setSaveStatus(SaveStatus.Failed);
    } catch {
      setSaveStatus(SaveStatus.Failed);
    } finally {
      setIsBusy(false);
    }
  };

  return {
    status,
    account: data,
    retry,
    saveStatus,
    isBusy,
    becomeSeller: () => run(API_PATHS.becomeSeller),
    startVerification: () => run(API_PATHS.sellerVerification),
  };
};

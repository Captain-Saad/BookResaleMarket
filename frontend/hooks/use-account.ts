import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api/client";
import { loginPathFor } from "@/lib/auth/guards";
import { addressFormSchema, problemSchema, profileFormSchema } from "@/lib/auth/schemas";
import { ADDRESS_ITEM_PATH, API_PATHS, EMPTY_ADDRESS, ROUTES } from "@/lib/constants";
import {
  type Account,
  type AccountUpdateRequest,
  type Address,
  type AddressRequest,
  type ApiOutcome,
  type AuthFormValues,
  LoadStatus,
  ProblemCode,
  SaveStatus,
} from "@/lib/types";

const useSessionRedirect = () => {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    ({ response, error }: ApiOutcome<unknown>) => {
      if (response.status === 401) {
        router.push(loginPathFor(pathname, ""));
        return true;
      }
      const code = problemSchema.safeParse(error).data?.code;
      if (response.status === 403 && code === ProblemCode.AccountSuspended) {
        router.push(ROUTES.suspended);
        return true;
      }
      return false;
    },
    [router, pathname],
  );
};

const useResource = <T>(load: () => Promise<ApiOutcome<T>>) => {
  const redirectIfNeeded = useSessionRedirect();
  const [state, setState] = useState<{ status: LoadStatus; data?: T }>({
    status: LoadStatus.Loading,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    load()
      .then((outcome) => {
        if (!active || redirectIfNeeded(outcome)) return;
        setState(
          outcome.response.ok && outcome.data !== undefined
            ? { status: LoadStatus.Ready, data: outcome.data }
            : { status: LoadStatus.Failed },
        );
      })
      .catch(() => {
        if (active) setState({ status: LoadStatus.Failed });
      });
    return () => {
      active = false;
    };
  }, [load, redirectIfNeeded, attempt]);

  const retry = useCallback(() => {
    setState({ status: LoadStatus.Loading });
    setAttempt((value) => value + 1);
  }, []);

  const setData = useCallback((data: T) => setState({ status: LoadStatus.Ready, data }), []);

  return { ...state, retry, setData, redirectIfNeeded };
};

const loadAccount = () => api.GET(API_PATHS.me);
const loadAddresses = () => api.GET(API_PATHS.addresses);

export const useProfileForm = () => {
  const { status, data, retry, setData, redirectIfNeeded } = useResource(loadAccount);
  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle);
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: data && { displayName: data.displayName, phone: data.phone ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaveStatus(SaveStatus.Idle);
    try {
      const outcome = await api.PATCH(API_PATHS.me, { body: values as AccountUpdateRequest });
      if (redirectIfNeeded(outcome)) return;
      if (outcome.data) setData(outcome.data);
      setSaveStatus(outcome.data ? SaveStatus.Saved : SaveStatus.Failed);
    } catch {
      setSaveStatus(SaveStatus.Failed);
    }
  });

  return { status, account: data, retry, form, onSubmit, saveStatus };
};

export const useAddressManager = () => {
  const { status, data, retry, setData, redirectIfNeeded } = useResource(loadAddresses);
  const addresses = data ?? [];
  const [editing, setEditing] = useState<{ address: Address | null } | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle);
  const form = useForm<AuthFormValues>({ resolver: zodResolver(addressFormSchema) });

  const openEditor = (address: Address | null) => {
    setSaveStatus(SaveStatus.Idle);
    form.reset({
      ...EMPTY_ADDRESS,
      ...(address && {
        recipientName: address.recipientName,
        line1: address.line1,
        line2: address.line2 ?? "",
        city: address.city,
        region: address.region,
        postalCode: address.postalCode,
        country: address.country,
      }),
    });
    setEditing({ address });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const { address } = editing;
      const body = values as AddressRequest;
      const outcome = address
        ? await api.PATCH(ADDRESS_ITEM_PATH, { params: { path: { address_id: address.id } }, body })
        : await api.POST(API_PATHS.addresses, { body });
      if (redirectIfNeeded(outcome)) return;
      const saved = outcome.data;
      if (!saved) {
        setSaveStatus(SaveStatus.Failed);
        return;
      }
      setData(
        address
          ? addresses.map((item) => (item.id === saved.id ? saved : item))
          : [...addresses, saved],
      );
      setEditing(null);
    } catch {
      setSaveStatus(SaveStatus.Failed);
    }
  });

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const outcome = await api.DELETE(ADDRESS_ITEM_PATH, {
        params: { path: { address_id: deleting.id } },
      });
      if (redirectIfNeeded(outcome)) return;
      if (!outcome.response.ok) {
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
  const { status, data, retry, setData, redirectIfNeeded } = useResource(loadAccount);
  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle);
  const [isBusy, setIsBusy] = useState(false);

  const run = async (request: () => Promise<ApiOutcome<Account>>) => {
    setIsBusy(true);
    setSaveStatus(SaveStatus.Idle);
    try {
      const outcome = await request();
      if (redirectIfNeeded(outcome)) return;
      if (outcome.data) setData(outcome.data);
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
    becomeSeller: () => run(() => api.POST(API_PATHS.becomeSeller)),
    startVerification: () => run(() => api.POST(API_PATHS.sellerVerification)),
  };
};

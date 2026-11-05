import AppShell from "@/components/layout/app-shell";
import { APP_SHELL } from "@/lib/constants";
import type { ChildrenProps } from "@/lib/types";

const AdminLayout = ({ children }: ChildrenProps) => <AppShell {...APP_SHELL}>{children}</AppShell>;

export default AdminLayout;

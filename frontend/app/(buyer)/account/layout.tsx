import AccountNav from "@/components/domain/account-nav";
import { ACCOUNT_NAV } from "@/lib/constants";
import type { ChildrenProps } from "@/lib/types";

const AccountLayout = ({ children }: ChildrenProps) => (
  <main className="flex-1 px-4 py-8">
    <div className="mx-auto flex w-full max-w-page flex-col gap-6">
      <AccountNav
        label={ACCOUNT_NAV.label}
        links={ACCOUNT_NAV.links}
        roleLinks={ACCOUNT_NAV.roleLinks}
        signOutLabel={ACCOUNT_NAV.signOutLabel}
      />
      {children}
    </div>
  </main>
);

export default AccountLayout;

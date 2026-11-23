import { requireUser } from "@/lib/auth";
import { attentionCount } from "@/lib/orders";
import { logoutAction } from "../actions";
import { Icon } from "@/components/admin/ui";
import { NavLink, NewOrdersPopup } from "@/components/admin/client";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const admin = user.role === "admin";
  const waiting = await attentionCount(user);
  return (
    <>
      <header className="adm-top">
        <strong>Evoque Lebanon</strong>
        <form action={logoutAction} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="who">{user.name}</span>
          <button className="btn ghost sm">Log out</button>
        </form>
      </header>
      <div className="adm-shell">
        <nav className="adm-nav" aria-label="Portal">
          {admin && <NavLink href="/admin" exact><Icon name="home" />Home</NavLink>}
          <NavLink href="/admin/orders"><Icon name="orders" />Orders{waiting > 0 && <span className="dot" aria-label={`${waiting} waiting`}>{waiting}</span>}</NavLink>
          {admin && <NavLink href="/admin/products"><Icon name="box" />Stock</NavLink>}
          {admin && <NavLink href="/admin/reports"><Icon name="chart" />Reports</NavLink>}
          {admin && <NavLink href="/admin/staff"><Icon name="users" />Staff</NavLink>}
          <NavLink href="/admin/account"><Icon name="user" />Account</NavLink>
        </nav>
        <div className="adm-main">{children}</div>
      </div>
      <NewOrdersPopup
        initial={waiting}
        href={admin ? "/admin/orders?status=new" : "/admin/orders?status=confirmed"}
        label={admin ? "new orders to confirm" : "orders ready for delivery"}
      />
    </>
  );
}

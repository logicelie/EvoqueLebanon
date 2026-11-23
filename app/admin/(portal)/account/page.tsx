import { requireUser } from "@/lib/auth";
import { Flash } from "@/components/admin/ui";
import { Submit } from "@/components/admin/client";
import { ownPasswordAction } from "../../actions";

export const metadata = { title: "Account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await requireUser();
  return (
    <div className="stack" style={{ maxWidth: 460 }}>
      <div className="adm-head" style={{ marginBottom: 0 }}><h1>Account</h1></div>
      <Flash sp={await searchParams} />
      <section className="card">
        <dl className="kv"><dt>Name</dt><dd>{me.name}</dd><dt>Username</dt><dd>{me.username}</dd><dt>Role</dt><dd>{me.role === "admin" ? "Admin" : "Driver"}</dd></dl>
      </section>
      <section className="card">
        <h2>Change password</h2>
        <form className="form" action={ownPasswordAction}>
          <label className="f">Current password<input name="current" type="password" required autoComplete="current-password" /></label>
          <label className="f">New password (8 characters or more)<input name="next" type="password" minLength={8} required autoComplete="new-password" /></label>
          <Submit className="btn">Change password</Submit>
        </form>
      </section>
    </div>
  );
}

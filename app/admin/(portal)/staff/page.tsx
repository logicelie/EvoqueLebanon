import { requireUser } from "@/lib/auth";
import { q } from "@/lib/db";
import { Flash } from "@/components/admin/ui";
import { Submit } from "@/components/admin/client";
import { staffCreateAction, staffUpdateAction } from "../../actions";

export const metadata = { title: "Staff" };

export default async function Staff({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await requireUser("admin");
  const users = await q<{ id: number; username: string; name: string; role: string; active: boolean }>("select id, username, name, role, active from users order by active desc, role, name");
  return (
    <div className="stack">
      <div className="adm-head" style={{ marginBottom: 0 }}><h1>Staff</h1></div>
      <Flash sp={await searchParams} />
      <div className="cols cols2">
        <section className="card">
          <h2>People who can log in</h2>
          <div className="stack">
            {users.map((u) => (
              <div key={u.id} style={{ borderBottom: "1px solid #f1f1f3", paddingBottom: 14 }}>
                <div className="adm-head" style={{ marginBottom: 8 }}>
                  <div><strong>{u.name}</strong>{u.id === me.id && <span className="mut"> (you)</span>}<div className="mut sm">Username: {u.username}</div></div>
                  <div className="btnrow"><span className="pill">{u.role === "admin" ? "Admin" : "Driver"}</span>{!u.active && <span className="pill unpaid">Deactivated</span>}</div>
                </div>
                <details>
                  <summary className="sm" style={{ cursor: "pointer", minHeight: 32 }}>Change password or access</summary>
                  <div className="stack" style={{ marginTop: 10 }}>
                    <form className="filters" action={staffUpdateAction} style={{ marginBottom: 0 }}>
                      <input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="password" />
                      <label className="f">New password<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
                      <Submit className="btn ghost">Set password</Submit>
                    </form>
                    {u.id !== me.id && (
                      <form action={staffUpdateAction}>
                        <input type="hidden" name="id" value={u.id} /><input type="hidden" name="op" value="toggle" />
                        <Submit className={u.active ? "btn danger sm" : "btn ghost sm"}>{u.active ? "Deactivate account" : "Reactivate account"}</Submit>
                      </form>
                    )}
                  </div>
                </details>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <h2>Add a person</h2>
          <form className="form" action={staffCreateAction}>
            <label className="f">Name<input name="name" required maxLength={80} /></label>
            <label className="f">Username<input name="username" required autoCapitalize="none" pattern="[A-Za-z0-9._\-]{3,30}" /></label>
            <label className="f">Role
              <select name="role" defaultValue="driver">
                <option value="driver">Driver: sees only orders to deliver</option>
                <option value="admin">Admin: sees everything</option>
              </select>
            </label>
            <label className="f">Password (8 characters or more)<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
            <Submit className="btn">Add</Submit>
          </form>
        </section>
      </div>
    </div>
  );
}

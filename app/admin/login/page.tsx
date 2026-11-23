import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { loginAction } from "../actions";
import { Flash } from "@/components/admin/ui";
import { Submit } from "@/components/admin/client";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/admin");
  return (
    <div className="adm-login">
      <form className="card form" action={loginAction}>
        <div>
          <h1>Evoque Lebanon</h1>
          <p className="mut sm" style={{ margin: "4px 0 0" }}>Staff portal</p>
        </div>
        {!hasDb && <div className="note warn" style={{ margin: 0 }}>The portal database is not connected yet.</div>}
        <Flash sp={await searchParams} />
        <label className="f">Username<input name="username" autoComplete="username" autoCapitalize="none" required /></label>
        <label className="f">Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <Submit className="btn block">Log in</Submit>
      </form>
    </div>
  );
}

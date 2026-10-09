"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null as null | { error: string });
  return (
    <div className="login card">
      <h1>New launches</h1>
      <p className="sub">Visibility plan for new and reactivated brands, sellers and subcategories.</p>
      <form action={action}>
        <label htmlFor="email">Your work email</label>
        <input id="email" name="email" type="email" autoComplete="email" placeholder="firstname.lastname@jumia.com" autoFocus required />
        <div style={{ marginTop: 14 }}>
          <button className="btn orange" disabled={pending}>
            {pending ? "Signing in…" : "Continue"}
          </button>
        </div>
        {state?.error && <div className="err">{state.error}</div>}
      </form>
      <p className="note" style={{ marginTop: 18 }}>
        Your email is shown next to every request, booking and change, so everyone can follow the history.
      </p>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null as null | { error: string });
  return (
    <div className="login card">
      <h1>New launches</h1>
      <p className="sub">Visibility plan for new and reactivated brands. Enter your team passcode.</p>
      <form action={action}>
        <label htmlFor="passcode">Team passcode</label>
        <input id="passcode" name="passcode" type="password" autoFocus required />
        <div style={{ marginTop: 14 }}>
          <button className="btn orange" disabled={pending}>
            {pending ? "Checking…" : "Sign in"}
          </button>
        </div>
        {state?.error && <div className="err">{state.error}</div>}
      </form>
      <p className="note" style={{ marginTop: 18 }}>
        Commercial passcode: create and edit requests. Marketing passcode: decide, confirm go-live and book placements.
      </p>
    </div>
  );
}

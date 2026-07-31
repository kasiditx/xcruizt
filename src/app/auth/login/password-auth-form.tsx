"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";

import {
  signInWithPassword,
  signUpWithPassword,
  type PasswordAuthActionState,
} from "./actions";

type AuthMode = "signin" | "signup";

const initialPasswordAuthState: PasswordAuthActionState = {
  status: "idle",
  message: "",
};

function getSubmitLabel(isSignup: boolean, isPending: boolean) {
  if (isPending) {
    return isSignup ? "กำลังสร้างบัญชี..." : "กำลังเข้าสู่ระบบ...";
  }

  return isSignup ? "สมัครและเข้าสู่ระบบ" : "เข้าสู่ระบบ";
}

function CredentialForm({
  mode,
  nextPath,
}: {
  mode: AuthMode;
  nextPath: string;
}) {
  const action =
    mode === "signup" ? signUpWithPassword : signInWithPassword;
  const [state, formAction, isPending] = useActionState(
    action,
    initialPasswordAuthState,
  );
  const isSignup = mode === "signup";
  const messageId = state.message ? `${mode}-auth-message` : undefined;

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className="auth-form"
    >
      <input name="next" type="hidden" value={nextPath} />

      <div className="auth-form__field">
        <label htmlFor={`${mode}-username`}>Username</label>
        <input
          aria-describedby={`username-hint${messageId ? ` ${messageId}` : ""}`}
          aria-invalid={state.status === "error"}
          autoCapitalize="none"
          autoComplete="username"
          id={`${mode}-username`}
          maxLength={24}
          minLength={3}
          name="username"
          pattern="[A-Za-z0-9_]+"
          placeholder="pilot_07"
          required
          spellCheck={false}
          type="text"
        />
        <p className="auth-form__hint" id="username-hint">
          ใช้ a-z, 0-9 หรือ _ จำนวน 3–24 ตัว
        </p>
      </div>

      <div className="auth-form__field">
        <label htmlFor={`${mode}-password`}>Password</label>
        <input
          aria-describedby={messageId}
          aria-invalid={state.status === "error"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          id={`${mode}-password`}
          maxLength={72}
          minLength={8}
          name="password"
          placeholder="อย่างน้อย 8 ตัว"
          required
          type="password"
        />
      </div>

      <button className="auth-submit" disabled={isPending} type="submit">
        {isSignup ? (
          <UserPlus aria-hidden="true" size={17} />
        ) : (
          <LogIn aria-hidden="true" size={17} />
        )}
        {getSubmitLabel(isSignup, isPending)}
      </button>

      {state.message ? (
        <p
          aria-live="polite"
          className="auth-message auth-message--error"
          id={messageId}
          role="alert"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function PasswordAuthForm({ nextPath }: { nextPath: string }) {
  const [mode, setMode] = useState<AuthMode>("signin");

  return (
    <>
      <fieldset
        aria-label="เลือกรูปแบบบัญชี"
        className="auth-mode-switch"
      >
        <button
          aria-pressed={mode === "signin"}
          onClick={() => setMode("signin")}
          type="button"
        >
          เข้าสู่ระบบ
        </button>
        <button
          aria-pressed={mode === "signup"}
          onClick={() => setMode("signup")}
          type="button"
        >
          สมัครบัญชี
        </button>
      </fieldset>

      <CredentialForm key={mode} mode={mode} nextPath={nextPath} />
    </>
  );
}

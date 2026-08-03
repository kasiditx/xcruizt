"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";

import { ValidatedForm } from "@/components/forms/validated-form";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
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

function validateSignupCredentials(form: HTMLFormElement) {
  const password = form.querySelector<HTMLInputElement>(
    'input[name="password"]',
  );
  const confirmation = form.querySelector<HTMLInputElement>(
    'input[name="confirmPassword"]',
  );

  if (password && confirmation && password.value !== confirmation.value) {
    return {
      confirmPassword: "Password และการยืนยัน Password ต้องตรงกัน",
    };
  }

  return {};
}

function CredentialForm({
  mode,
  nextPath,
  turnstileSiteKey,
}: {
  mode: AuthMode;
  nextPath: string;
  turnstileSiteKey: string | null;
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
    <ValidatedForm
      action={formAction}
      aria-busy={isPending}
      className="auth-form"
      validate={isSignup ? validateSignupCredentials : undefined}
    >
      <input name="next" type="hidden" value={nextPath} />

      <div className="auth-form__field">
        <label htmlFor={`${mode}-username`}>Username</label>
        <input
          aria-describedby={`username-hint${messageId ? ` ${messageId}` : ""}`}
          autoCapitalize="none"
          autoComplete="username"
          id={`${mode}-username`}
          maxLength={24}
          minLength={3}
          name="username"
          pattern="[A-Za-z0-9_]+"
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
          aria-describedby={`password-hint${messageId ? ` ${messageId}` : ""}`}
          autoComplete={isSignup ? "new-password" : "current-password"}
          id={`${mode}-password`}
          maxLength={72}
          minLength={8}
          name="password"
          required
          type="password"
        />
        <p className="auth-form__hint" id="password-hint">
          ใช้ Password อย่างน้อย 8 ตัว
        </p>
      </div>

      {isSignup ? (
        <div className="auth-form__field">
          <label htmlFor="signup-confirm-password">ยืนยัน Password</label>
          <input
            aria-describedby={`confirm-password-hint${messageId ? ` ${messageId}` : ""}`}
            autoComplete="new-password"
            id="signup-confirm-password"
            maxLength={72}
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
          <p className="auth-form__hint" id="confirm-password-hint">
            กรอก Password เดิมอีกครั้งให้ตรงกัน
          </p>
        </div>
      ) : null}

      {turnstileSiteKey ? (
        <TurnstileWidget
          action={mode}
          resetSignal={state.message}
          siteKey={turnstileSiteKey}
        />
      ) : null}

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
    </ValidatedForm>
  );
}

export function PasswordAuthForm({
  nextPath,
  turnstileSiteKey,
}: {
  nextPath: string;
  turnstileSiteKey: string | null;
}) {
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

      <CredentialForm
        key={mode}
        mode={mode}
        nextPath={nextPath}
        turnstileSiteKey={turnstileSiteKey}
      />
    </>
  );
}

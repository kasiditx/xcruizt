"use client";

import { UserRoundCheck } from "lucide-react";
import { useActionState } from "react";

import { ValidatedForm } from "@/components/forms/validated-form";
import {
  completeProfileAction,
  type CompleteProfileActionState,
} from "./actions";

const initialState: CompleteProfileActionState = {
  status: "idle",
  message: "",
};

export function UsernameForm({ nextPath }: { nextPath: string }) {
  const [state, formAction, isPending] = useActionState(
    completeProfileAction,
    initialState,
  );
  const messageId = state.message ? "profile-username-message" : undefined;

  return (
    <ValidatedForm
      action={formAction}
      aria-busy={isPending}
      className="auth-form"
    >
      <input name="next" type="hidden" value={nextPath} />

      <div className="auth-form__field">
        <label htmlFor="profile-username">Username</label>
        <input
          aria-describedby={`profile-username-hint${
            messageId ? ` ${messageId}` : ""
          }`}
          autoCapitalize="none"
          autoComplete="username"
          id="profile-username"
          maxLength={24}
          minLength={3}
          name="username"
          pattern="[A-Za-z0-9_]+"
          required
          spellCheck={false}
          type="text"
        />
        <p className="auth-form__hint" id="profile-username-hint">
          ใช้ a-z, 0-9 หรือ _ จำนวน 3–24 ตัว
        </p>
      </div>

      <button className="auth-submit" disabled={isPending} type="submit">
        <UserRoundCheck aria-hidden="true" size={17} />
        {isPending ? "กำลังบันทึก..." : "บันทึก Username"}
      </button>

      {state.message ? (
        <p
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

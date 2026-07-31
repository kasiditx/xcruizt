"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseProfileInput } from "@/modules/identity/application/profile-input";
import { getCurrentAccountResolution } from "@/modules/identity/infrastructure/current-account";
import { updateCustomerDisplayName } from "@/modules/identity/infrastructure/profile-repository";

export async function updateProfileAction(formData: FormData) {
  const resolution = await getCurrentAccountResolution();
  if (resolution.status === "anonymous") {
    redirect("/auth/login?next=/account/profile");
  }
  if (resolution.status === "profile_required") {
    redirect("/auth/complete-profile?next=/account/profile");
  }

  const parsed = parseProfileInput({
    displayName: formData.get("displayName"),
  });
  if (!parsed.ok) redirect("/account/profile?notice=invalid");

  const updated = await updateCustomerDisplayName(
    resolution.account.id,
    parsed.value.displayName,
  );
  if (!updated) redirect("/account/profile?notice=not_found");

  revalidatePath("/");
  revalidatePath("/account/profile");
  redirect("/account/profile?notice=updated");
}

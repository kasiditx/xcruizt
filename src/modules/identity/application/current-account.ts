type CurrentAccountDependencies = {
  getAuthenticatedUserId(): Promise<string | null>;
  findProfileByUserId(
    userId: string,
  ): Promise<{ username: string } | null>;
};

export type CurrentAccount = {
  id: string;
  username: string;
};

export type CurrentAccountResolution =
  | {
      status: "anonymous";
    }
  | {
      status: "profile_required";
      userId: string;
    }
  | {
      status: "ready";
      account: CurrentAccount;
    };

export async function resolveCurrentAccount(
  dependencies: CurrentAccountDependencies,
): Promise<CurrentAccountResolution> {
  const userId = await dependencies.getAuthenticatedUserId();

  if (!userId) {
    return {
      status: "anonymous",
    };
  }

  const profile = await dependencies.findProfileByUserId(userId);

  if (!profile) {
    return {
      status: "profile_required",
      userId,
    };
  }

  return {
    status: "ready",
    account: {
      id: userId,
      username: profile.username,
    },
  };
}

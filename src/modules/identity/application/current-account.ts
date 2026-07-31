import {
  ADMIN_PERMISSIONS,
  hasAdminAccess,
  type AdminPermission,
} from "../domain/permissions";

type CurrentAccountDependencies = {
  getAuthenticatedUserId(): Promise<string | null>;
  findProfileByUserId(
    userId: string,
  ): Promise<{ username: string } | null>;
  findAdminAuthorizationByUserId(userId: string): Promise<{
    permissionCodes: string[];
    roleNames: string[];
  }>;
};

export type CurrentAccountAdmin = {
  isAdmin: boolean;
  permissionCodes: AdminPermission[];
  roleNames: string[];
};

export type CurrentAccount = {
  admin: CurrentAccountAdmin;
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

  const authorization =
    await dependencies.findAdminAuthorizationByUserId(userId);
  const approvedPermissions = new Set<string>(
    Object.values(ADMIN_PERMISSIONS),
  );
  const permissionCodes = [
    ...new Set(
      authorization.permissionCodes.filter(
        (permissionCode): permissionCode is AdminPermission =>
          approvedPermissions.has(permissionCode),
      ),
    ),
  ];

  return {
    status: "ready",
    account: {
      admin: {
        isAdmin: hasAdminAccess(new Set(permissionCodes)),
        permissionCodes,
        roleNames: [...new Set(authorization.roleNames)],
      },
      id: userId,
      username: profile.username,
    },
  };
}

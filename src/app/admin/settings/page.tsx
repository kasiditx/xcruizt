import { AdminOperationsShell } from "@/components/admin/admin-operations-shell";
import { AdminNotice } from "@/components/admin/admin-feedback";
import { AdminValidatedForm } from "@/components/admin/admin-validated-form";
import { listAdminRoleSettings } from "@/modules/administration/infrastructure/admin-role-repository";
import { requireAdminPermission } from "@/modules/administration/infrastructure/authorization";
import { ADMIN_PERMISSIONS } from "@/modules/identity/domain/permissions";

import { assignRoleAction, removeRoleAction } from "./actions";

const notices: Record<string, string> = {
  already_assigned: "บัญชีนี้มี Role ดังกล่าวแล้ว",
  assigned: "Assign Admin Role และบันทึก Audit Log แล้ว",
  invalid: "ข้อมูล Role ไม่ถูกต้อง",
  last_super_admin: "ลบไม่ได้: ระบบต้องเหลือ Super Admin อย่างน้อยหนึ่งบัญชี",
  not_found: "ไม่พบบัญชีหรือ Role",
  removed: "Remove Admin Role และบันทึก Audit Log แล้ว",
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const account = await requireAdminPermission(
    ADMIN_PERMISSIONS.manageAdminRoles,
  );
  const [settings, query] = await Promise.all([
    listAdminRoleSettings(),
    searchParams,
  ]);

  return (
    <AdminOperationsShell
      account={account}
      description="จัดการ Role แบบ server-authorized พร้อมป้องกันการลบ Super Admin คนสุดท้าย"
      title="Admin roles"
    >
      {query.notice && notices[query.notice] ? (
        <AdminNotice
          message={notices[query.notice]}
          noticeCode={query.notice}
        />
      ) : null}
      <div className="admin-operation-forms">
        <AdminValidatedForm
          action={assignRoleAction}
          className="admin-operation-form"
        >
          <h2>Assign role</h2>
          <label>
            <span>User</span>
            <select name="userId" required>
              <option value="">เลือกบัญชี</option>
              {settings.users.map((user) => (
                <option key={user.id} value={user.id}>
                  @{user.username}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Role</span>
            <select name="roleId" required>
              <option value="">เลือก Role</option>
              {settings.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-action" type="submit">
            Assign
          </button>
        </AdminValidatedForm>
        <div className="admin-operation-form">
          <h2>Remove role</h2>
          <p>
            การ Remove ใช้ปุ่มที่ผูกกับ Assignment โดยตรง
            เพื่อลดความเสี่ยงเลือก User/Role ผิดคู่
          </p>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--responsive">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.assignments.map((assignment) => (
              <tr key={`${assignment.userId}:${assignment.roleId}`}>
                <td data-label="User">@{assignment.username}</td>
                <td data-label="Role">{assignment.roleName}</td>
                <td data-label="Action">
                  <form action={removeRoleAction}>
                    <input
                      name="userId"
                      type="hidden"
                      value={assignment.userId}
                    />
                    <input
                      name="roleId"
                      type="hidden"
                      value={assignment.roleId}
                    />
                    <button className="admin-inline-action" type="submit">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {settings.assignments.length === 0 ? (
          <p className="admin-table-empty">ยังไม่มี Admin Role Assignment</p>
        ) : null}
      </div>
    </AdminOperationsShell>
  );
}

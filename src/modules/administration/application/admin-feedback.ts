export type AdminFeedbackTone = "error" | "info" | "success" | "warning";

type ValidationFlags = Partial<
  Pick<
    ValidityState,
    | "badInput"
    | "patternMismatch"
    | "rangeOverflow"
    | "rangeUnderflow"
    | "stepMismatch"
    | "tooLong"
    | "tooShort"
    | "typeMismatch"
    | "valueMissing"
  >
>;

type ValidationMessageInput = {
  controlType?: string;
  label: string;
  max?: string;
  maxLength?: number;
  min?: string;
  minLength?: number;
  patternHint?: string;
  validity: ValidationFlags;
};

const SUCCESS_NOTICE_CODES = new Set([
  "assigned",
  "created",
  "deactivated",
  "granted",
  "published",
  "queued",
  "removed",
  "revoked",
  "updated",
]);

const WARNING_NOTICE_CODES = new Set([
  "active_main_package_required",
  "already_active",
  "already_assigned",
  "already_queued",
  "already_revoked",
  "duplicate",
  "immutable",
  "invalid_transition",
  "last_super_admin",
  "not_linked",
  "not_refundable",
  "product_not_published",
  "rate_limited",
]);

const ERROR_NOTICE_CODES = new Set([
  "dimension_mismatch",
  "invalid",
  "not_configured",
  "not_found",
  "product_not_found",
  "provider_failed",
  "provider_unavailable",
  "rate_limit_unavailable",
  "target_not_found",
  "unapproved_origin",
]);

function labelSeparator(label: string): string {
  return /[A-Za-z0-9)]$/.test(label) ? " " : "";
}

function labelPrefixSeparator(label: string): string {
  return /^[A-Za-z0-9(]/.test(label) ? " " : "";
}

function withRequirement(label: string, requirement: string): string {
  return `${label}${labelSeparator(label)}${requirement}`;
}

export function getAdminNoticeTone(code: string): AdminFeedbackTone {
  if (SUCCESS_NOTICE_CODES.has(code)) return "success";
  if (WARNING_NOTICE_CODES.has(code)) return "warning";
  if (ERROR_NOTICE_CODES.has(code)) return "error";
  return "info";
}

export function getAdminValidationMessage({
  controlType,
  label,
  max,
  maxLength,
  min,
  minLength,
  patternHint,
  validity,
}: ValidationMessageInput): string {
  if (validity.valueMissing) {
    return controlType === "select"
      ? `กรุณาเลือก ${label}`
      : `กรุณากรอก${labelPrefixSeparator(label)}${label}`;
  }
  if (validity.typeMismatch && controlType === "email") {
    return "กรุณากรอกอีเมลให้ถูกต้อง";
  }
  if (validity.tooShort && minLength != null) {
    return withRequirement(label, `ต้องมีอย่างน้อย ${minLength} ตัวอักษร`);
  }
  if (validity.tooLong && maxLength != null) {
    return withRequirement(label, `ต้องไม่เกิน ${maxLength} ตัวอักษร`);
  }
  if (validity.rangeUnderflow && min != null) {
    return withRequirement(label, `ต้องไม่น้อยกว่า ${min}`);
  }
  if (validity.rangeOverflow && max != null) {
    return withRequirement(label, `ต้องไม่มากกว่า ${max}`);
  }
  if (validity.patternMismatch) {
    return patternHint ?? withRequirement(label, "มีรูปแบบไม่ถูกต้อง");
  }
  if (validity.stepMismatch || validity.badInput) {
    return withRequirement(label, "ต้องเป็นตัวเลขที่ถูกต้อง");
  }
  if (validity.typeMismatch) {
    return withRequirement(label, "มีรูปแบบไม่ถูกต้อง");
  }
  return `กรุณาตรวจสอบ ${label}`;
}

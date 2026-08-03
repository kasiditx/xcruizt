"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
  type SubmitEvent,
} from "react";

import { getAdminValidationMessage } from "@/modules/administration/application/admin-feedback";

import { AdminFeedback } from "./admin-feedback";

type FieldErrors = Record<string, string[] | undefined>;

type AdminValidatedFormProps = Omit<
  ComponentPropsWithoutRef<"form">,
  "noValidate"
> & {
  fieldErrors?: FieldErrors;
  formError?: string;
};

type NamedControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  children?: ReactNode;
  name?: string;
  type?: string;
};

type ValidatableControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function getControlLabel(control: ValidatableControl): string {
  const ariaLabel = control.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  const label = control.labels?.[0];
  const visibleLabel = label?.querySelector(":scope > span")?.textContent?.trim();
  return visibleLabel || control.name;
}

function isValidatableControl(element: Element): element is ValidatableControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function collectConstraintErrors(form: HTMLFormElement): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const element of Array.from(form.elements)) {
    if (
      !isValidatableControl(element) ||
      !element.name ||
      element.type === "hidden" ||
      element.validity.valid
    ) {
      continue;
    }

    const minLength = "minLength" in element && element.minLength >= 0
      ? element.minLength
      : undefined;
    const maxLength = "maxLength" in element && element.maxLength >= 0
      ? element.maxLength
      : undefined;
    const min = "min" in element ? element.min || undefined : undefined;
    const max = "max" in element ? element.max || undefined : undefined;

    errors[element.name] = getAdminValidationMessage({
      controlType:
        element instanceof HTMLSelectElement ? "select" : element.type,
      label: getControlLabel(element),
      max,
      maxLength,
      min,
      minLength,
      patternHint:
        element.dataset.validationHint || element.getAttribute("title") || undefined,
      validity: element.validity,
    });
  }

  return errors;
}

function enhanceChildren(
  children: ReactNode,
  errors: Record<string, string>,
  idPrefix: string,
): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement<NamedControlProps>(child)) return child;

    const isControl =
      typeof child.type === "string" &&
      ["input", "select", "textarea"].includes(child.type);
    const fieldName = child.props.name;

    if (isControl && fieldName && child.props.type !== "hidden") {
      const error = errors[fieldName];
      if (!error) return child;

      const errorId = `${idPrefix}-${fieldName}-error`;
      const describedBy = [child.props["aria-describedby"], errorId]
        .filter(Boolean)
        .join(" ");
      const control = cloneElement(child as ReactElement<NamedControlProps>, {
        "aria-describedby": describedBy,
        "aria-invalid": true,
      });

      return (
        <Fragment key={`${fieldName}-validation`}>
          {control}
          <p className="admin-form__field-error" id={errorId}>
            {error}
          </p>
        </Fragment>
      );
    }

    if (child.props.children == null) return child;
    return cloneElement(child, {
      children: enhanceChildren(child.props.children, errors, idPrefix),
    });
  });
}

export function AdminValidatedForm({
  children,
  fieldErrors = {},
  formError,
  onInputCapture,
  onInvalidCapture,
  onSubmit,
  ...formProps
}: AdminValidatedFormProps) {
  const generatedId = useId().replaceAll(":", "");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mergedErrors = useMemo(() => {
    const serverErrors = Object.fromEntries(
      Object.entries(fieldErrors)
        .filter((entry): entry is [string, string[]] => Boolean(entry[1]?.[0]))
        .map(([name, messages]) => [name, messages[0]]),
    );
    return { ...serverErrors, ...clientErrors };
  }, [clientErrors, fieldErrors]);
  const validationErrors = Object.entries(clientErrors);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const nextErrors = collectConstraintErrors(form);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      setClientErrors(nextErrors);
      window.requestAnimationFrame(() => {
        const firstInvalid = form.querySelector<ValidatableControl>(
          "[aria-invalid='true']",
        );
        firstInvalid?.focus();
      });
      return;
    }

    setClientErrors({});
    onSubmit?.(event);
  }

  return (
    <form
      {...formProps}
      noValidate
      onInputCapture={(event) => {
        const target = event.target;
        if (
          target instanceof Element &&
          isValidatableControl(target) &&
          target.name &&
          target.validity.valid
        ) {
          setClientErrors((current) => {
            if (!current[target.name]) return current;
            const next = { ...current };
            delete next[target.name];
            return next;
          });
        }
        onInputCapture?.(event);
      }}
      onInvalidCapture={(event) => {
        event.preventDefault();
        onInvalidCapture?.(event);
      }}
      onSubmit={handleSubmit}
    >
      {formError ? (
        <AdminFeedback message={formError} tone="error" />
      ) : null}
      {validationErrors.length > 0 ? (
        <div className="admin-validation-summary" role="alert">
          <strong>ตรวจสอบข้อมูลอีกครั้ง</strong>
          <p>พบ {validationErrors.length.toLocaleString("th-TH")} จุดที่ต้องแก้ไข</p>
        </div>
      ) : null}
      {enhanceChildren(children, mergedErrors, `admin-${generatedId}`)}
    </form>
  );
}

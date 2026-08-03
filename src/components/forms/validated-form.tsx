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

type FieldErrors = Record<string, string[] | undefined>;

type ValidatedFormProps = Omit<
  ComponentPropsWithoutRef<"form">,
  "noValidate"
> & {
  fieldErrors?: FieldErrors;
  validate?: (form: HTMLFormElement) => Record<string, string | undefined>;
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
  const visibleLabel =
    label?.querySelector(":scope > span")?.textContent?.trim() ||
    label?.textContent?.trim();
  return visibleLabel || control.name;
}

function isValidatableControl(element: Element): element is ValidatableControl {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function labelSeparator(label: string): string {
  return /[A-Za-z0-9)]$/.test(label) ? " " : "";
}

function labelPrefixSeparator(label: string): string {
  return /^[A-Za-z0-9(]/.test(label) ? " " : "";
}

function getValidationMessage(control: ValidatableControl): string {
  const label = getControlLabel(control);
  const minLength = "minLength" in control && control.minLength >= 0
    ? control.minLength
    : undefined;
  const maxLength = "maxLength" in control && control.maxLength >= 0
    ? control.maxLength
    : undefined;
  const min = "min" in control ? control.min || undefined : undefined;
  const max = "max" in control ? control.max || undefined : undefined;

  if (control.validity.valueMissing) {
    return `กรุณากรอก${labelPrefixSeparator(label)}${label}`;
  }
  if (control.validity.typeMismatch && control.type === "email") {
    return "กรุณากรอกอีเมลให้ถูกต้อง";
  }
  if (control.validity.tooShort && minLength != null) {
    return `${label}${labelSeparator(label)}ต้องมีอย่างน้อย ${minLength} ตัวอักษร`;
  }
  if (control.validity.tooLong && maxLength != null) {
    return `${label}${labelSeparator(label)}ต้องไม่เกิน ${maxLength} ตัวอักษร`;
  }
  if (control.validity.rangeUnderflow && min != null) {
    return `${label}${labelSeparator(label)}ต้องไม่น้อยกว่า ${min}`;
  }
  if (control.validity.rangeOverflow && max != null) {
    return `${label}${labelSeparator(label)}ต้องไม่มากกว่า ${max}`;
  }
  if (control.validity.patternMismatch) {
    return control.dataset.validationMessage || `${label}${labelSeparator(label)}มีรูปแบบไม่ถูกต้อง`;
  }
  if (control.validity.stepMismatch || control.validity.badInput) {
    return `${label}${labelSeparator(label)}ต้องเป็นตัวเลขที่ถูกต้อง`;
  }
  if (control.validity.typeMismatch) {
    return `${label}${labelSeparator(label)}มีรูปแบบไม่ถูกต้อง`;
  }
  return `กรุณาตรวจสอบ ${label}`;
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

    errors[element.name] = getValidationMessage(element);
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
          <p className="form-field-error" id={errorId}>
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

export function ValidatedForm({
  children,
  fieldErrors = {},
  onInputCapture,
  onInvalidCapture,
  onSubmit,
  validate,
  ...formProps
}: ValidatedFormProps) {
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
    const nextErrors = {
      ...collectConstraintErrors(form),
      ...Object.fromEntries(
        Object.entries(validate?.(form) ?? {}).filter(
          (entry): entry is [string, string] => Boolean(entry[1]),
        ),
      ),
    };

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
      {validationErrors.length > 0 ? (
        <div className="form-validation-summary" role="alert">
          <strong>ตรวจสอบข้อมูลอีกครั้ง</strong>
          <p>พบ {validationErrors.length.toLocaleString("th-TH")} จุดที่ต้องแก้ไข</p>
        </div>
      ) : null}
      {enhanceChildren(children, mergedErrors, `form-${generatedId}`)}
    </form>
  );
}

import { z } from "zod";

export const MAX_PRODUCT_FILE_SIZE_BYTES = 250 * 1024 * 1024;

export type SkuPackageType = "single" | "collection" | "bundle";

const fileUploadSchema = z
  .object({
    contentType: z.enum([
      "application/octet-stream",
      "application/pdf",
      "application/zip",
      "text/plain",
    ]),
    fileRole: z.enum([
      "main_package",
      "installer",
      "guide",
      "checksum",
      "extra",
    ]),
    fileSizeBytes: z
      .number()
      .int()
      .positive()
      .max(MAX_PRODUCT_FILE_SIZE_BYTES),
    originalFilename: z
      .string()
      .trim()
      .min(1)
      .max(180)
      .refine((value) => !/[/\\\0\r\n]/.test(value)),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sha256Base64: z
      .string()
      .regex(/^[A-Za-z0-9+/]{43}=$/),
    versionId: z.uuid(),
  })
  .superRefine((input, context) => {
    const extension = input.originalFilename
      .toLowerCase()
      .match(/\.[a-z0-9]+$/)?.[0];
    const allowedExtensions = {
      checksum: [".txt"],
      extra: [".pdf", ".txt", ".zip"],
      guide: [".pdf"],
      installer: [".exe"],
      main_package: [".zip"],
    } as const;
    const allowedContentTypes = {
      checksum: ["text/plain"],
      extra: [
        "application/pdf",
        "application/zip",
        "text/plain",
      ],
      guide: ["application/pdf"],
      installer: ["application/octet-stream"],
      main_package: [
        "application/octet-stream",
        "application/zip",
      ],
    } as const;

    if (
      !extension ||
      !(allowedExtensions[input.fileRole] as readonly string[]).includes(
        extension,
      ) ||
      !(
        allowedContentTypes[
          input.fileRole
        ] as readonly string[]
      ).includes(input.contentType)
    ) {
      context.addIssue({
        code: "custom",
        message: "ชนิดไฟล์ไม่ตรงกับ File role",
        path: ["originalFilename"],
      });
    }
  });

export type FileUploadInput = z.infer<typeof fileUploadSchema>;

export function parseFileUploadInput(input: unknown):
  | { ok: true; value: FileUploadInput }
  | { fieldErrors: Record<string, string[]>; ok: false } {
  const result = fileUploadSchema.safeParse(input);
  if (result.success) return { ok: true, value: result.data };

  return {
    fieldErrors: result.error.flatten().fieldErrors,
    ok: false,
  };
}

const skuPackageUploadSchema = z.object({
  contentType: z.enum([
    "application/octet-stream",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "text/plain",
  ]),
  fileRole: z.literal("main_package"),
  fileSizeBytes: z.number().int().positive().max(MAX_PRODUCT_FILE_SIZE_BYTES),
  originalFilename: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .refine((value) => !/[\/\0\r\n]/.test(value)),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sha256Base64: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  skuId: z.uuid(),
});

export type SkuPackageUploadInput = z.infer<
  typeof skuPackageUploadSchema
>;

export function parseSkuPackageUploadInput(
  input: unknown,
  skuType: SkuPackageType,
):
  | { ok: true; value: SkuPackageUploadInput }
  | { fieldErrors: Record<string, string[]>; ok: false } {
  const result = skuPackageUploadSchema.safeParse(input);
  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      ok: false,
    };
  }

  const extension =
    result.data.originalFilename.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  const expectedExtension = skuType === "single" ? ".ini" : ".rar";
  const allowedContentTypes =
    skuType === "single"
      ? ["text/plain", "application/octet-stream"]
      : [
          "application/octet-stream",
          "application/vnd.rar",
          "application/x-rar-compressed",
        ];

  if (
    extension !== expectedExtension ||
    !allowedContentTypes.includes(result.data.contentType)
  ) {
    return {
      fieldErrors: {
        originalFilename: [
          skuType === "single"
            ? "Single package ต้องเป็นไฟล์ .ini"
            : "Collection/Bundle package ต้องเป็นไฟล์ .rar",
        ],
      },
      ok: false,
    };
  }

  return { ok: true, value: result.data };
}

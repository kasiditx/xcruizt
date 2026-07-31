import "server-only";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { R2Environment } from "@/lib/env/r2";
import { hasExpectedFileSignature } from "../application/file-signature";
import type { FileUploadInput } from "../application/file-upload-input";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

function createR2Client(environment: R2Environment): S3Client {
  return new S3Client({
    credentials: {
      accessKeyId: environment.accessKeyId,
      secretAccessKey: environment.secretAccessKey,
    },
    endpoint: `https://${environment.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  });
}

export async function createR2UploadUrl(input: {
  environment: R2Environment;
  storageKey: string;
  upload: FileUploadInput;
}): Promise<{
  expiresInSeconds: number;
  headers: Record<string, string>;
  uploadUrl: string;
}> {
  const headers = {
    "content-type": input.upload.contentType,
    "x-amz-checksum-sha256": input.upload.sha256Base64,
    "x-amz-meta-sha256": input.upload.sha256,
  };
  const uploadUrl = await getSignedUrl(
    createR2Client(input.environment),
    new PutObjectCommand({
      Bucket: input.environment.bucketPrivate,
      ChecksumSHA256: input.upload.sha256Base64,
      ContentType: input.upload.contentType,
      Key: input.storageKey,
      Metadata: { sha256: input.upload.sha256 },
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );

  return {
    expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    headers,
    uploadUrl,
  };
}

export async function verifyR2UploadedObject(input: {
  contentType: string;
  environment: R2Environment;
  expectedSizeBytes: number;
  originalFilename: string;
  sha256: string;
  storageBucket: string;
  storageKey: string;
}): Promise<boolean> {
  if (input.storageBucket !== input.environment.bucketPrivate) {
    return false;
  }

  const client = createR2Client(input.environment);
  const object = await client.send(
    new HeadObjectCommand({
      Bucket: input.environment.bucketPrivate,
      ChecksumMode: "ENABLED",
      Key: input.storageKey,
    }),
  );
  const actualContentType = object.ContentType?.split(";")[0].trim();
  const checksumMatches =
    !object.ChecksumSHA256 ||
    Buffer.from(object.ChecksumSHA256, "base64").toString("hex") ===
      input.sha256;

  const metadataMatches =
    object.ContentLength === input.expectedSizeBytes &&
    actualContentType === input.contentType &&
    object.Metadata?.sha256 === input.sha256 &&
    checksumMatches;
  if (!metadataMatches) return false;

  const sample = await client.send(
    new GetObjectCommand({
      Bucket: input.environment.bucketPrivate,
      Key: input.storageKey,
      Range: "bytes=0-63",
    }),
  );
  const bytes = sample.Body
    ? await sample.Body.transformToByteArray()
    : new Uint8Array();

  return hasExpectedFileSignature(input.originalFilename, bytes);
}

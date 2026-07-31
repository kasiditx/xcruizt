import "server-only";

import {
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { R2Environment } from "@/lib/env/r2";
import { buildSafeContentDisposition } from "../application/download-policy";
import type { AuthorizedDownload } from "./download-repository";

export const DOWNLOAD_URL_TTL_SECONDS = 180;

export async function createR2DownloadUrl(
  environment: R2Environment,
  download: AuthorizedDownload,
): Promise<string> {
  if (download.storageBucket !== environment.bucketPrivate) {
    throw new Error("Download file is outside the private bucket.");
  }

  const client = new S3Client({
    credentials: {
      accessKeyId: environment.accessKeyId,
      secretAccessKey: environment.secretAccessKey,
    },
    endpoint: `https://${environment.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
  });

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: environment.bucketPrivate,
      Key: download.storageKey,
      ResponseContentDisposition: buildSafeContentDisposition(
        download.originalFilename,
      ),
      ResponseContentType: download.contentType,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}

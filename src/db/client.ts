import "server-only";

import { parseDatabaseRuntimeEnvironment } from "@/lib/env/database";

import { createDatabaseConnection } from "./connection";

const { DATABASE_URL } = parseDatabaseRuntimeEnvironment(process.env);
const connection = createDatabaseConnection(DATABASE_URL);

export const db = connection.db;

export async function closeDatabaseConnection(): Promise<void> {
  await connection.close();
}

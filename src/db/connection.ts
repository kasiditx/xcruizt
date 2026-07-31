import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { databaseClientOptions } from "./client-options";
import * as schema from "./schema";

export function createDatabaseConnection(connectionString: string) {
  const queryClient = postgres(connectionString, databaseClientOptions);

  return {
    db: drizzle(queryClient, { schema }),
    async close(): Promise<void> {
      await queryClient.end({ timeout: 5 });
    },
  };
}

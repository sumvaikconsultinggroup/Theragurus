import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import { setServers } from "node:dns/promises";

nextEnv.loadEnvConfig(process.cwd());
if (process.env.MONGODB_DNS_SERVERS)
  setServers(
    process.env.MONGODB_DNS_SERVERS.split(",")
      .map((server) => server.trim())
      .filter(Boolean),
  );
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is missing from the server environment.");
  process.exit(1);
}
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000,
  maxPoolSize: 2,
  appName: "theragurus-connection-check",
  family: 4,
});
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "theragurus");
  await db.command({ ping: 1 });
  console.log(
    JSON.stringify({
      connected: true,
      database: db.databaseName,
      credentialPrinted: false,
    }),
  );
} catch (error) {
  // MongoDB errors can contain connection details. Only print an error class/code.
  console.error(
    JSON.stringify({
      connected: false,
      error: error.name,
      code: error.code || null,
    }),
  );
  const parsed = new URL(process.env.MONGODB_URI);
  const redact = (value) =>
    String(value || "")
      .replaceAll(parsed.password, "[redacted]")
      .replaceAll(parsed.username, "[redacted]")
      .replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, "[redacted URI]");
  if (error.reason?.servers)
    console.error(
      JSON.stringify({
        servers: [...error.reason.servers].map(([host, server]) => ({
          host,
          error: server.error?.name,
          code: server.error?.cause?.code,
          reason: redact(server.error?.message),
        })),
      }),
    );
  process.exitCode = 1;
} finally {
  await client.close();
}

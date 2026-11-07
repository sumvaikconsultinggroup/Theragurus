import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { setServers } from "node:dns/promises";
import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import schema from "../src/lib/mongodb-schema.json" with { type: "json" };

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.MONGODB_URI)
  throw new Error(
    "Set MONGODB_URI in .env.local before running booking tests.",
  );
if (process.env.MONGODB_DNS_SERVERS)
  setServers(
    process.env.MONGODB_DNS_SERVERS.split(",")
      .map((server) => server.trim())
      .filter(Boolean),
  );
const origin = "http://localhost:3001";
const fixtureDirectory = path.join(process.cwd(), ".test-data");
await mkdir(fixtureDirectory, { recursive: true });
// Atlas shared clusters can impose a 38-byte database-name limit.
const runId = randomUUID().replaceAll("-", "").slice(0, 20);
const databaseName = `theragurus_test_${runId}`;
const applicationDatabase = process.env.MONGODB_DB || "theragurus";
const client = new MongoClient(process.env.MONGODB_URI, {
  appName: "theragurus-isolated-tests",
  maxPoolSize: 2,
  serverSelectionTimeoutMS: 15000,
  family: 4,
});
try {
  await client.connect();
} catch (error) {
  console.error(
    `MongoDB test connection failed (${error.name}). Run npm run db:check.`,
  );
  process.exit(1);
}
const fixtureDb = client.db(databaseName);
await fixtureDb.collection("test_ownership").insertOne({ _id: runId });
function startServer(port) {
  return spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "localhost",
      "--port",
      String(port),
    ],
    {
      env: {
        ...process.env,
        APP_ORIGIN: `http://localhost:${port}`,
        MONGODB_DB: databaseName,
        CLERK_SECRET_KEY: "",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
}
const servers = [startServer(3001), startServer(3002)];
const secondOrigin = "http://localhost:3002";
let output = "";
for (const server of servers) {
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (servers.some((server) => server.exitCode !== null))
      throw new Error(`Test server stopped: ${output}`);
    try {
      const responses = await Promise.all(
        [origin, secondOrigin].map((base) => fetch(`${base}/api/services`)),
      );
      if (responses.every((response) => response.ok)) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error(`Test server did not start: ${output}`);
  const tests = spawn(process.execPath, ["scripts/test-booking-api.mjs"], {
    env: {
      ...process.env,
      TEST_ORIGIN: origin,
      TEST_SECOND_ORIGIN: secondOrigin,
    },
    stdio: "inherit",
    windowsHide: true,
  });
  const code = await new Promise((resolve) => tests.once("exit", resolve));
  if (code !== 0) {
    process.stderr.write(output);
    process.exitCode = 1;
  }
  if (code === 0) {
    const routes = spawn(
      process.execPath,
      ["scripts/verify-routes.mjs", origin],
      { stdio: "inherit", windowsHide: true },
    );
    const routeCode = await new Promise((resolve) =>
      routes.once("exit", resolve),
    );
    if (routeCode !== 0) process.exitCode = 1;
  }
} finally {
  servers.forEach((server) => server.kill());
  await Promise.all(
    servers.map(
      (server) =>
        new Promise((resolve) => {
          if (server.exitCode !== null) resolve();
          else server.once("exit", resolve);
        }),
    ),
  );
  try {
    const proof = await fixtureDb
      .collection("test_ownership")
      .findOne({ _id: runId });
    if (
      databaseName !== applicationDatabase &&
      databaseName === `theragurus_test_${runId}` &&
      proof
    ) {
      const persisted = await fixtureDb
        .collection(schema.appointments.name)
        .countDocuments();
      if (persisted)
        console.log(
          `MongoDB persistence verified: ${persisted} synthetic appointment documents remain after server exit.`,
        );
      // Only remove this invocation's uniquely named, ownership-marked test DB.
      await fixtureDb.dropDatabase();
      console.log(
        "Isolated MongoDB test database removed. Application database untouched.",
      );
    } else throw new Error("Test database cleanup ownership check failed.");
  } finally {
    await client.close();
  }
}

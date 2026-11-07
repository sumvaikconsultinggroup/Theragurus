import "server-only";
import { setServers } from "node:dns/promises";
import {
  MongoClient,
  MongoServerError,
  type ClientSession,
  type IndexDescription,
} from "mongodb";
import schema from "./mongodb-schema.json";
import type {
  AppointmentRecord,
  CustomerRecord,
  RequestLimitRecord,
  ScheduleRecord,
  SessionRecord,
} from "./booking-models";

function collections(client: MongoClient, databaseName: string) {
  const database = client.db(databaseName);
  return {
    client,
    database,
    customers: database.collection<CustomerRecord>(schema.customers.name),
    sessions: database.collection<SessionRecord>(schema.sessions.name),
    appointments: database.collection<AppointmentRecord>(
      schema.appointments.name,
    ),
    limits: database.collection<RequestLimitRecord>(schema.limits.name),
    schedule: database.collection<ScheduleRecord>(schema.schedule.name),
  };
}
export type BookingStore = ReturnType<typeof collections>;
type Cache = {
  uri: string;
  databaseName: string;
  promise: Promise<BookingStore>;
};
const processCache = globalThis as typeof globalThis & {
  __theragurusMongo?: Cache;
  __theragurusMongoDns?: string;
};
export function isDuplicateKey(error: unknown): error is MongoServerError {
  return error instanceof MongoServerError && error.code === 11000;
}

export function getStore(): Promise<BookingStore> {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB || "theragurus";
  if (!uri)
    return Promise.reject(
      new Error("MongoDB is not configured on the server."),
    );
  if (!/^[a-zA-Z0-9_-]{1,38}$/.test(databaseName))
    return Promise.reject(new Error("Invalid MongoDB database name."));
  const cached = processCache.__theragurusMongo;
  if (cached?.uri === uri && cached.databaseName === databaseName)
    return cached.promise;
  const servers = process.env.MONGODB_DNS_SERVERS?.trim();
  if (servers && processCache.__theragurusMongoDns !== servers) {
    // Process-local SRV/TXT resolver configuration; does not change OS DNS or TLS.
    setServers(
      servers
        .split(",")
        .map((server) => server.trim())
        .filter(Boolean),
    );
    processCache.__theragurusMongoDns = servers;
  }
  const client = new MongoClient(uri, {
    appName: "theragurus-booking",
    maxPoolSize: 20,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 10000,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    family: 4,
  });
  const promise = (async () => {
    await client.connect();
    const store = collections(client, databaseName);
    await Promise.all(
      Object.values(schema)
        .filter((value) => value.indexes.length)
        .map((value) =>
          store.database
            .collection(value.name)
            .createIndexes(value.indexes as IndexDescription[]),
        ),
    );
    try {
      await store.schedule.updateOne(
        { _id: "primary-provider" },
        { $setOnInsert: { version: 0 } },
        { upsert: true },
      );
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
    return store;
  })();
  processCache.__theragurusMongo = { uri, databaseName, promise };
  void promise.catch(async () => {
    if (processCache.__theragurusMongo?.promise === promise)
      delete processCache.__theragurusMongo;
    await client.close().catch(() => {});
  });
  return promise;
}

export async function transaction<T>(
  operation: (store: BookingStore, session: ClientSession) => Promise<T>,
  lockSchedule = false,
): Promise<T> {
  const store = await getStore();
  const session = store.client.startSession();
  try {
    return await session.withTransaction(
      async () => {
        // Serializes reservation mutations across app instances, preventing snapshot write skew.
        if (lockSchedule)
          await store.schedule.updateOne(
            { _id: "primary-provider" },
            { $inc: { version: 1 } },
            { session },
          );
        return operation(store, session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
        maxCommitTimeMS: 10000,
      },
    );
  } finally {
    await session.endSession();
  }
}

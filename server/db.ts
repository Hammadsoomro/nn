import { MongoClient, Db, Collection } from "mongodb";

// Declare global for serverless environments (connection reuse across warm invocations)
declare global {
  // eslint-disable-next-line no-var
  var __mongoClient__: MongoClient | undefined;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export interface DbCollections {
  users: Collection;
  queuedLines: Collection;
  history: Collection;
  chatMessages: Collection;
  chatGroups: Collection;
  claimSettings: Collection;
  claimedNumbers: Collection;
  announcements: Collection;
}

let collections: DbCollections | null = null;

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI environment variable is not set. Cannot start the application without a database connection.",
    );
  }

  try {
    // Use globalThis to cache the client across warm invocations in serverless
    if (!(globalThis as any).__mongoClient__) {
      const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE || "10", 10);
      const serverSelectionTimeoutMS = parseInt(
        process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "5000",
        10,
      );

      (globalThis as any).__mongoClient__ = new MongoClient(mongoUri, {
        maxPoolSize,
        serverSelectionTimeoutMS,
        socketTimeoutMS: 45000,
      });

      await (globalThis as any).__mongoClient__.connect();
    }

    client = (globalThis as any).__mongoClient__;
    const dbName = process.env.MONGODB_DB || "taskflow";
    db = client.db(dbName);

    // Create indexes for better performance
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ teamId: 1 });

    const queuedCollection = db.collection("queuedLines");
    await queuedCollection.createIndex({ teamId: 1 });
    await queuedCollection.createIndex({ addedAt: -1 });

    const historyCollection = db.collection("history");
    await historyCollection.createIndex({ teamId: 1 });
    await historyCollection.createIndex({ claimedBy: 1 });
    await historyCollection.createIndex({ claimedAt: -1 });

    const chatCollection = db.collection("chatMessages");
    await chatCollection.createIndex({ teamId: 1 });
    await chatCollection.createIndex({ createdAt: -1 });

    const groupCollection = db.collection("chatGroups");
    await groupCollection.createIndex({ teamId: 1 });

    const settingsCollection = db.collection("claimSettings");
    await settingsCollection.createIndex({ teamId: 1 });

    const claimedCollection = db.collection("claimedNumbers");
    await claimedCollection.createIndex({ teamId: 1 });
    await claimedCollection.createIndex({ claimedBy: 1 });
    await claimedCollection.createIndex({ claimedAt: -1 });

    const announcementsCollection = db.collection("announcements");
    await announcementsCollection.createIndex({ teamId: 1 });
    await announcementsCollection.createIndex({ createdAt: -1 });

    collections = {
      users: usersCollection,
      queuedLines: queuedCollection,
      history: historyCollection,
      chatMessages: chatCollection,
      chatGroups: groupCollection,
      claimSettings: settingsCollection,
      claimedNumbers: claimedCollection,
      announcements: announcementsCollection,
    };

    console.log("MongoDB connected successfully");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
}

export function getCollections(): DbCollections {
  if (!collections) {
    throw new Error("Collections not initialized. Call connectDB first.");
  }
  return collections;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    collections = null;
  }
}

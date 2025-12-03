import { MongoClient, Db, Collection } from "mongodb";

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
}

let collections: DbCollections | null = null;

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn(
      "MONGODB_URI environment variable is not set. Database features will not work.",
    );
    return {} as Db;
  }

  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db("taskflow");

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

    collections = {
      users: usersCollection,
      queuedLines: queuedCollection,
      history: historyCollection,
      chatMessages: chatCollection,
      chatGroups: groupCollection,
      claimSettings: settingsCollection,
      claimedNumbers: claimedCollection,
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

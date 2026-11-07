import nextEnv from "@next/env";
import { MongoClient } from "mongodb";
import { randomBytes,createHash } from "node:crypto";
import { mkdir,writeFile } from "node:fs/promises";
import { setServers } from "node:dns/promises";
nextEnv.loadEnvConfig(process.cwd());
const address=process.argv[process.argv.indexOf("--email")+1]?.toLowerCase();
if(!process.argv.includes("--email")||!address||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))throw new Error("Usage: node scripts/create-admin-invite.mjs --email you@example.com");
if(process.env.MONGODB_DNS_SERVERS)setServers(process.env.MONGODB_DNS_SERVERS.split(",").map(x=>x.trim()));
const client=new MongoClient(process.env.MONGODB_URI,{family:4,serverSelectionTimeoutMS:15000});
try {
 await client.connect();const db=client.db(process.env.MONGODB_DB||"theragurus");
 await db.collection("admin_accounts").createIndex({email:1},{unique:true});
 if(await db.collection("admin_accounts").findOne({email:address}))throw new Error("That administrator already exists.");
 const token=randomBytes(32).toString("hex");await db.collection("admin_invites").insertOne({_id:createHash("sha256").update(token).digest("hex"),email:address,expires_at:new Date(Date.now()+24*3600000),used:false});
 await mkdir(".data",{recursive:true});await writeFile(".data/admin-invitation.txt",`Administrator: ${address}\nExpires in 24 hours. Open this link and choose your own password:\n${process.env.APP_ORIGIN||"http://localhost:3000"}/admin/setup#token=${token}\n`,{mode:0o600});
 console.log("Invitation created. Open .data/admin-invitation.txt locally. The secret link is not printed in logs.");
} finally {await client.close();}

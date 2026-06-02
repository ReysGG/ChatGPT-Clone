// scripts/verify-prisma.ts
// Run: npx tsx scripts/verify-prisma.ts
// Prints "Connected." if the database is reachable and the conversation rows are readable.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.conversation.count();
  const sample = await prisma.conversation.findFirst({
    include: { messages: true, user: true },
  });
  // Surface the read, not the secrets
  console.log(
    `Connected. conversations=${count} sampleTitle=${sample?.title ?? "<none>"} messages=${sample?.messages.length ?? 0}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("verify-prisma failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

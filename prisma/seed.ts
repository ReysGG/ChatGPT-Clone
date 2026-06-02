import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: `${process.env.DATABASE_URL}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clean existing rows so the seed is idempotent
  await prisma.conversationTag.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  // User
  const user = await prisma.user.create({
    data: {
      email: "david@example.com",
      name: "David",
    },
  });

  // Settings for the user
  await prisma.setting.create({
    data: {
      userId: user.id,
      defaultModel: "gemini-2.5-flash",
      systemPrompt: "You are a helpful personal AI assistant.",
      temperature: 0.7,
      darkMode: true,
    },
  });

  // Tags
  const tagWork = await prisma.tag.create({
    data: { name: "work", userId: user.id },
  });
  const tagIdeas = await prisma.tag.create({
    data: { name: "ideas", userId: user.id },
  });

  // Conversation + messages
  const conversation = await prisma.conversation.create({
    data: {
      title: "Brainstorm: AI Chat App",
      userId: user.id,
      tags: {
        create: [
          { tag: { connect: { id: tagWork.id } } },
          { tag: { connect: { id: tagIdeas.id } } },
        ],
      },
      messages: {
        create: [
          { role: "user", content: "Help me brainstorm features for my AI chat app." },
          { role: "assistant", content: "Start with: streaming responses, chat history, markdown." },
        ],
      },
    },
  });

  // Templates, memory, notes, etc.
  await prisma.promptTemplate.create({
    data: { title: "Code review", body: "Review the following code for bugs and style:", category: "dev" },
  });
  await prisma.promptTemplate.create({
    data: { title: "Summarize", body: "Summarize the following text in 3 bullet points:", category: "writing" },
  });

  await prisma.memory.create({ data: { key: "favoriteModel", value: "gemini-2.5-flash" } });

  await prisma.note.create({ data: { title: "Project plan", body: "MVP: chat, history, settings, dark mode." } });

  await prisma.project.create({ data: { name: "AI Chat Pribadi", description: "Personal AI chat app" } });

  await prisma.bookmark.create({ data: { url: "https://www.prisma.io/docs", title: "Prisma docs" } });

  await prisma.upload.create({
    data: { filename: "readme.txt", mimeType: "text/plain", sizeBytes: 1024, storagePath: "/uploads/readme.txt" },
  });

  console.log(`Seeded conversation ${conversation.id} for user ${user.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

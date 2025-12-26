import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { aiChatMessages, aiChatSessions } from "../../db/schema";

export class AIChatService {
  async getSessions(userId: string, workflowId: string) {
    return await db.query.aiChatSessions.findMany({
      where: and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.workflowId, workflowId)
      ),
      orderBy: [desc(aiChatSessions.updatedAt)],
    });
  }

  async createSession(userId: string, workflowId: string, title: string = "New Conversation") {
    const [session] = await db.insert(aiChatSessions).values({
      userId,
      workflowId,
      title,
    }).returning();
    return session;
  }

  async getSession(sessionId: string) {
    return await db.query.aiChatSessions.findFirst({
      where: eq(aiChatSessions.id, sessionId),
      with: {
        messages: {
            orderBy: (messages, { asc }) => [asc(messages.createdAt)]
        }
      }
    });
  }

  async addMessage(sessionId: string, role: "user" | "assistant", content: string, metadata?: any) {
    // 1. Add Message
    const [message] = await db.insert(aiChatMessages).values({
      sessionId,
      role,
      content,
      metadata,
    }).returning();

    // 2. Update Session Timestamp
    await db.update(aiChatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(aiChatSessions.id, sessionId));

    return message;
  }

  async deleteSession(sessionId: string, userId: string) {
    // Ensure ownership
    const session = await db.query.aiChatSessions.findFirst({
        where: and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.userId, userId))
    });

    if (!session) {
        throw new Error("Session not found or access denied");
    }

    await db.delete(aiChatSessions).where(eq(aiChatSessions.id, sessionId));
    return true;
  }

  async updateSessionTitle(sessionId: string, userId: string, title: string) {
     await db.update(aiChatSessions)
        .set({ title })
        .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.userId, userId)));
     return true;
  }
}

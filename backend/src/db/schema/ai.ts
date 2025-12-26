import { relations, sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { workflows } from "./workflows";

export const aiChatSessions = pgTable("ai_chat_sessions", {
  id: text("id").primaryKey().default(sql`cuid()`),
  workflowId: text("workflow_id").references(() => workflows.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiChatMessages = pgTable("ai_chat_messages", {
  id: text("id").primaryKey().default(sql`cuid()`),
  sessionId: text("session_id").references(() => aiChatSessions.id, { onDelete: "cascade" }).notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  // Store metadata like linked workflow version, missing nodes, etc.
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [aiChatSessions.workflowId],
    references: [workflows.id],
  }),
  user: one(users, {
    fields: [aiChatSessions.userId],
    references: [users.id],
  }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, {
    fields: [aiChatMessages.sessionId],
    references: [aiChatSessions.id],
  }),
}));

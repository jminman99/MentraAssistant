import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal, varchar, time, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations, sql, eq, gte, lte, ne } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for fixed values
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "super_admin"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["ai-only", "individual", "council", "unlimited"]);
export const organizationTypeEnum = pgEnum("organization_type", ["church", "business", "city", "nonprofit"]);
export const sessionTypeEnum = pgEnum("session_type", ["individual", "council"]);
export const sessionStatusEnum = pgEnum("session_status", ["scheduled", "confirmed", "completed", "cancelled", "no_show"]);
export const meetingTypeEnum = pgEnum("meeting_type", ["video", "in_person", "calendly"]);
export const availabilityResponseEnum = pgEnum("availability_response", ["pending", "available", "unavailable", "tentative"]);
export const mentorApplicationStatusEnum = pgEnum("mentor_application_status", ["pending", "interview_scheduled", "approved", "rejected"]);
export const coordinationStatusEnum = pgEnum("coordination_status", ["pending", "coordinating", "confirmed", "failed"]);
export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  profileImage: text("profile_image"),
  role: userRoleEnum("role").notNull().default("user"),
  subscriptionPlan: subscriptionPlanEnum("subscription_plan").notNull().default("ai-only"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(100),
  sessionsUsed: integer("sessions_used").notNull().default(0),
  sessionsLimit: integer("sessions_limit").notNull().default(0),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").default(""),
  type: organizationTypeEnum("type").notNull().default("business"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiMentors = pgTable("ai_mentors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  personality: text("personality").notNull(),
  expertise: text("expertise").notNull(),
  avatar: text("avatar").notNull(),
  backstory: text("backstory").notNull(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const humanMentors = pgTable("human_mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  expertise: text("expertise").notNull(),
  bio: text("bio").notNull(),
  experience: text("experience").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalSessions: integer("total_sessions").notNull().default(0),
  availability: jsonb("availability").$type<any>().default({}),
  isActive: boolean("is_active").notNull().default(true),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Calendly Integration
  calendlyUrl: text("calendly_url"),
  calendlyApiKey: text("calendly_api_key"),
  calendlyEventTypes: jsonb("calendly_event_types").$type<any[]>().default([]),
  useCalendly: boolean("use_calendly").default(false),
  
  // Native Scheduling Settings
  defaultSessionDuration: integer("default_session_duration").default(30),
  bufferTime: integer("buffer_time").default(15),
  advanceBookingDays: integer("advance_booking_days").default(30),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  aiMentorId: integer("ai_mentor_id").notNull().references(() => aiMentors.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  role: chatRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mentoringSessions = pgTable("mentoring_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  humanMentorId: integer("human_mentor_id").references(() => humanMentors.id, { onDelete: 'set null' }),
  type: sessionTypeEnum("type").notNull(),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(),
  topic: text("topic"),
  notes: text("notes"),
  rating: integer("rating"),
  feedback: text("feedback"),
  jitsiRoomId: text("jitsi_room_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Removed duplicate - council sessions defined below

export const semanticConfigurations = pgTable("semantic_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  mentorName: text("mentor_name").notNull(), // Global config if organizationId is null
  customPrompt: text("custom_prompt"), // Custom AI prompt for the mentor
  communicationStyle: text("communication_style").notNull(),
  commonPhrases: jsonb("common_phrases").$type<string[]>().default([]),
  decisionMaking: text("decision_making").notNull(),
  mentoring: text("mentoring").notNull(),
  detailedBackground: text("detailed_background"),
  coreValues: jsonb("core_values").$type<string[]>().default([]),
  conversationStarters: jsonb("conversation_starters").$type<string[]>().default([]),
  advicePatterns: text("advice_patterns"),
  responseExamples: text("response_examples"),
  contextAwarenessRules: text("context_awareness_rules"),
  storySelectionLogic: text("story_selection_logic"),
  personalityConsistencyRules: text("personality_consistency_rules"),
  conversationFlowPatterns: text("conversation_flow_patterns"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentorLifeStories = pgTable("mentor_life_stories", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => aiMentors.id, { onDelete: 'cascade' }),
  organizationId: integer("organization_id").references(() => organizations.id),
  category: varchar("category", { length: 50 }).notNull(), // 'childhood', 'father', 'marriage', etc.
  title: varchar("title", { length: 200 }).notNull(),
  story: text("story").notNull(), // Full narrative in first person
  lesson: text("lesson").notNull(), // Key wisdom/principle learned
  keywords: jsonb("keywords").$type<string[]>().default([]),
  emotionalTone: varchar("emotional_tone", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentorPersonalities = pgTable("mentor_personalities", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  mentorName: text("mentor_name").notNull(),
  customBackstory: text("custom_backstory"),
  customExpertise: text("custom_expertise"),
  customPersonality: text("custom_personality"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandingConfigurations = pgTable("branding_configurations", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  targetAudience: text("target_audience").notNull(), // "men-20-55", "business-professionals", "women-entrepreneurs", etc.
  primaryTagline: text("primary_tagline").notNull(),
  secondaryTagline: text("secondary_tagline"),
  problemStatement: text("problem_statement").notNull(),
  visionStatement: text("vision_statement").notNull(),
  ctaText: text("cta_text").notNull(),
  colorScheme: text("color_scheme").notNull(), // "masculine-slate", "professional-blue", "warm-earth", etc.
  mentorTerminology: text("mentor_terminology").notNull(), // "guides", "mentors", "advisors", "coaches"
  tone: text("tone").notNull(), // "masculine-direct", "professional-warm", "inspiring-supportive"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mentorApplications = pgTable("mentor_applications", {
  id: serial("id").primaryKey(),
  applicantName: text("applicant_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  age: integer("age"),
  
  // Basic Information
  bio: text("bio").notNull(),
  expertise: text("expertise").notNull(),
  yearsExperience: integer("years_experience"),
  
  // Semantic Content for AI Training - Flexible JSON structure
  lifeStories: jsonb("life_stories").$type<any[]>().default([]),
  challenges: jsonb("challenges").$type<any[]>().default([]),
  quotes: jsonb("quotes").$type<any[]>().default([]),
  principles: jsonb("principles").$type<any[]>().default([]),
  
  // Topic-specific wisdom capture
  careerWisdom: text("career_wisdom"),
  relationshipAdvice: text("relationship_advice"),
  parentingInsights: text("parenting_insights"),
  addictionRecovery: text("addiction_recovery"),
  spiritualGuidance: text("spiritual_guidance"),
  financialWisdom: text("financial_wisdom"),
  mentalHealthSupport: text("mental_health_support"),
  purposeAndBelonging: text("purpose_and_belonging"),
  
  // Application workflow
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'set null' }),
  status: mentorApplicationStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  interviewDate: timestamp("interview_date"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: 'set null' }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Session Bookings - Enhanced mentoring sessions with scheduling
export const sessionBookings = pgTable("session_bookings", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  humanMentorId: integer("human_mentor_id").references(() => humanMentors.id, { onDelete: 'set null' }),
  sessionType: sessionTypeEnum("session_type").notNull(),
  duration: integer("duration").notNull().default(30),
  scheduledDate: timestamp("scheduled_date").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  
  // Meeting details
  meetingType: meetingTypeEnum("meeting_type").notNull(),
  location: text("location"),
  videoLink: text("video_link"),
  calendlyEventId: text("calendly_event_id"),
  calendlyEventUrl: text("calendly_event_url"),
  
  // Preparation and goals
  sessionGoals: text("session_goals"),
  preparationNotes: text("preparation_notes"),
  menteeQuestions: text("mentee_questions"),
  
  // Status and outcomes
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  sessionNotes: text("session_notes"),
  followUpActions: text("follow_up_actions"),
  mentorRating: integer("mentor_rating"),
  menteeRating: integer("mentee_rating"),
  feedback: text("feedback"),
  
  // Reminders and notifications
  reminderSent: boolean("reminder_sent").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Council Sessions - Group sessions with 3-5 mentors
export const councilSessions = pgTable("council_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").notNull().default(60),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  maxMentees: integer("max_mentees").notNull().default(5),
  currentMentees: integer("current_mentees").notNull().default(0),
  meetingType: meetingTypeEnum("meeting_type").notNull().default("video"),
  videoLink: text("video_link"),
  location: text("location"),
  status: sessionStatusEnum("status").notNull().default("scheduled"),
  organizationId: integer("organization_id").references(() => organizations.id, { onDelete: 'set null' }),
  // Enhanced calendar coordination fields
  proposedTimeSlots: jsonb("proposed_time_slots").$type<any[]>().default([]),
  mentorResponseDeadline: timestamp("mentor_response_deadline"),
  finalTimeConfirmed: boolean("final_time_confirmed").notNull().default(false),
  coordinatorNotes: text("coordinator_notes"),
  mentorMinimum: integer("mentor_minimum").notNull().default(3),
  mentorMaximum: integer("mentor_maximum").notNull().default(5),
  coordinationStatus: coordinationStatusEnum("coordination_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Council Session Mentors (3-5 mentors per council session)
export const councilMentors = pgTable("council_mentors", {
  id: serial("id").primaryKey(),
  councilSessionId: integer("council_session_id").notNull().references(() => councilSessions.id, { onDelete: 'cascade' }),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id, { onDelete: 'cascade' }),
  role: varchar("role", { length: 20 }).notNull().default("mentor"),
  confirmed: boolean("confirmed").default(false),
  // Enhanced availability tracking
  availabilityResponse: availabilityResponseEnum("availability_response").default("pending"),
  responseDate: timestamp("response_date"),
  availableTimeSlots: jsonb("available_time_slots").$type<any[]>().default([]),
  conflictNotes: text("conflict_notes"),
  alternativeProposals: jsonb("alternative_proposals").$type<any[]>().default([]),
  notificationSent: boolean("notification_sent").default(false),
  lastReminderSent: timestamp("last_reminder_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Council Session Participants (mentees who join council sessions)
export const councilParticipants = pgTable("council_participants", {
  id: serial("id").primaryKey(),
  councilSessionId: integer("council_session_id").notNull().references(() => councilSessions.id, { onDelete: 'cascade' }),
  menteeId: integer("mentee_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionGoals: text("session_goals"),
  questions: text("questions"),
  registrationDate: timestamp("registration_date").defaultNow(),
  status: varchar("status", { length: 20 }).default("registered"),
});

// Mentor Availability Slots (for native scheduling)
export const mentorAvailability = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id, { onDelete: 'cascade' }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mentor Unavailability (for blocking specific times)
export const mentorUnavailability = pgTable("mentor_unavailability", {
  id: serial("id").primaryKey(),
  humanMentorId: integer("human_mentor_id").notNull().references(() => humanMentors.id, { onDelete: 'cascade' }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason"),
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: varchar("recurring_pattern", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  chatMessages: many(chatMessages),
  sessions: many(mentoringSessions),
  humanMentorProfile: one(humanMentors, {
    fields: [users.id],
    references: [humanMentors.userId],
  }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  aiMentors: many(aiMentors),
  humanMentors: many(humanMentors),
  semanticConfigurations: many(semanticConfigurations),
  mentorPersonalities: many(mentorPersonalities),
  mentorApplications: many(mentorApplications),
}));

export const aiMentorsRelations = relations(aiMentors, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [aiMentors.organizationId],
    references: [organizations.id],
  }),
  chatMessages: many(chatMessages),
}));

export const humanMentorsRelations = relations(humanMentors, ({ one, many }) => ({
  user: one(users, {
    fields: [humanMentors.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [humanMentors.organizationId],
    references: [organizations.id],
  }),
  sessions: many(mentoringSessions),
  councilSessions: many(councilSessions),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  aiMentor: one(aiMentors, {
    fields: [chatMessages.aiMentorId],
    references: [aiMentors.id],
  }),
}));

export const mentoringSessionsRelations = relations(mentoringSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [mentoringSessions.userId],
    references: [users.id],
  }),
  humanMentor: one(humanMentors, {
    fields: [mentoringSessions.humanMentorId],
    references: [humanMentors.id],
  }),
  councilMembers: many(councilSessions),
}));

export const councilSessionsRelations = relations(councilSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [councilSessions.organizationId],
    references: [organizations.id],
  }),
  councilMentors: many(councilMentors),
  councilParticipants: many(councilParticipants),
}));

export const semanticConfigurationsRelations = relations(semanticConfigurations, ({ one }) => ({
  organization: one(organizations, {
    fields: [semanticConfigurations.organizationId],
    references: [organizations.id],
  }),
}));

export const mentorPersonalitiesRelations = relations(mentorPersonalities, ({ one }) => ({
  organization: one(organizations, {
    fields: [mentorPersonalities.organizationId],
    references: [organizations.id],
  }),
}));

export const brandingConfigurationsRelations = relations(brandingConfigurations, ({ one }) => ({
  organization: one(organizations, {
    fields: [brandingConfigurations.organizationId],
    references: [organizations.id],
  }),
}));

export const mentorApplicationsRelations = relations(mentorApplications, ({ one }) => ({
  organization: one(organizations, {
    fields: [mentorApplications.organizationId],
    references: [organizations.id],
  }),
}));

export const sessionBookingsRelations = relations(sessionBookings, ({ one, many }) => ({
  mentee: one(users, {
    fields: [sessionBookings.menteeId],
    references: [users.id],
  }),
  humanMentor: one(humanMentors, {
    fields: [sessionBookings.humanMentorId],
    references: [humanMentors.id],
  }),
  councilParticipants: many(councilParticipants),
}));

export const councilParticipantsRelations = relations(councilParticipants, ({ one }) => ({
  councilSession: one(councilSessions, {
    fields: [councilParticipants.councilSessionId],
    references: [councilSessions.id],
  }),
  mentee: one(users, {
    fields: [councilParticipants.menteeId],
    references: [users.id],
  }),
}));

export const mentorAvailabilityRelations = relations(mentorAvailability, ({ one }) => ({
  humanMentor: one(humanMentors, {
    fields: [mentorAvailability.humanMentorId],
    references: [humanMentors.id],
  }),
}));

export const mentorUnavailabilityRelations = relations(mentorUnavailability, ({ one }) => ({
  humanMentor: one(humanMentors, {
    fields: [mentorUnavailability.humanMentorId],
    references: [humanMentors.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertAiMentorSchema = createInsertSchema(aiMentors).omit({
  id: true,
  createdAt: true,
});

export const insertHumanMentorSchema = createInsertSchema(humanMentors).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertMentoringSessionSchema = createInsertSchema(mentoringSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSemanticConfigurationSchema = createInsertSchema(semanticConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorPersonalitySchema = createInsertSchema(mentorPersonalities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBrandingConfigurationSchema = createInsertSchema(brandingConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorApplicationSchema = createInsertSchema(mentorApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionBookingSchema = z.object({
  scheduledAt: z.string().transform(val => new Date(val)),
  humanMentorId: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]),
  sessionType: z.string().optional().default('individual'),
  duration: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional().default(60),
  sessionGoals: z.string().nullable().optional(),
  meetingType: z.string().optional().default('video'),
  timezone: z.string().optional().default('America/New_York'),
});

export const insertCouncilSessionSchema = createInsertSchema(councilSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouncilMentorSchema = createInsertSchema(councilMentors).omit({
  id: true,
  createdAt: true,
});

export const insertCouncilParticipantSchema = createInsertSchema(councilParticipants).omit({
  id: true,
});

export const insertMentorAvailabilitySchema = createInsertSchema(mentorAvailability).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorUnavailabilitySchema = createInsertSchema(mentorUnavailability).omit({
  id: true,
  createdAt: true,
});

export const insertMentorLifeStorySchema = createInsertSchema(mentorLifeStories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type AiMentor = typeof aiMentors.$inferSelect;
export type InsertAiMentor = z.infer<typeof insertAiMentorSchema>;
export type HumanMentor = typeof humanMentors.$inferSelect;
export type InsertHumanMentor = z.infer<typeof insertHumanMentorSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type MentoringSession = typeof mentoringSessions.$inferSelect;
export type InsertMentoringSession = z.infer<typeof insertMentoringSessionSchema>;
export type SemanticConfiguration = typeof semanticConfigurations.$inferSelect;
export type InsertSemanticConfiguration = z.infer<typeof insertSemanticConfigurationSchema>;
export type MentorPersonality = typeof mentorPersonalities.$inferSelect;
export type InsertMentorPersonality = z.infer<typeof insertMentorPersonalitySchema>;
export type BrandingConfiguration = typeof brandingConfigurations.$inferSelect;
export type InsertBrandingConfiguration = z.infer<typeof insertBrandingConfigurationSchema>;
export type MentorApplication = typeof mentorApplications.$inferSelect;
export type InsertMentorApplication = z.infer<typeof insertMentorApplicationSchema>;

export type MentorLifeStory = typeof mentorLifeStories.$inferSelect;
export type InsertMentorLifeStory = z.infer<typeof insertMentorLifeStorySchema>;
export type SessionBooking = typeof sessionBookings.$inferSelect;
export type InsertSessionBooking = z.infer<typeof insertSessionBookingSchema>;
export type CouncilSession = typeof councilSessions.$inferSelect;
export type InsertCouncilSession = z.infer<typeof insertCouncilSessionSchema>;
export type CouncilMentor = typeof councilMentors.$inferSelect;
export type InsertCouncilMentor = z.infer<typeof insertCouncilMentorSchema>;
export type CouncilParticipant = typeof councilParticipants.$inferSelect;
export type InsertCouncilParticipant = z.infer<typeof insertCouncilParticipantSchema>;
export type MentorAvailability = typeof mentorAvailability.$inferSelect;
export type InsertMentorAvailability = z.infer<typeof insertMentorAvailabilitySchema>;
export type MentorUnavailability = typeof mentorUnavailability.$inferSelect;
export type InsertMentorUnavailability = z.infer<typeof insertMentorUnavailabilitySchema>;

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

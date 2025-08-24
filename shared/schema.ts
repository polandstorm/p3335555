import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { uuid } from "drizzle-orm/pg-core"; // Import uuid

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'collaborator']);
export const patientClassificationEnum = pgEnum('patient_classification', ['bronze', 'silver', 'gold', 'diamond']);
export const patientStatusEnum = pgEnum('patient_status', ['active', 'followup', 'return', 'inactive']);
export const eventTypeEnum = pgEnum('event_type', ['consultation', 'procedure', 'followup', 'return']);
export const eventStatusEnum = pgEnum('event_status', ['scheduled', 'completed', 'missed', 'cancelled']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: userRoleEnum("role").notNull().default('collaborator'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cities table
export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  state: text("state").notNull(),
  description: text("description"),
  monthlyGoal: varchar("monthly_goal", { length: 20 }),
  quarterlyGoal: varchar("quarterly_goal", { length: 20 }),
  yearlyGoal: varchar("yearly_goal", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Collaborators table
export const collaborators = pgTable("collaborators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  cityId: varchar("city_id").notNull().references(() => cities.id),
  revenueGoal: decimal("revenue_goal", { precision: 10, scale: 2 }).notNull().default('0'),
  consultationGoal: integer("consultation_goal").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patients table
export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  photo: text("photo"),
  cityId: varchar("city_id").references(() => cities.id),
  classification: patientClassificationEnum("classification"),
  collaboratorId: varchar("collaborator_id").references(() => collaborators.id),
  currentStatus: text("current_status"),
  nextSteps: text("next_steps"),
  lastConsultationDate: timestamp("last_consultation_date"),
  isRegistrationComplete: boolean("is_registration_complete").notNull().default(false),

  // Novos campos para personalização
  clinicGoals: text("clinic_goals"), // Objetivos na clínica
  mainConcerns: text("main_concerns"), // Maiores dores/preocupações
  importantNotes: text("important_notes"), // Anotações importantes

  // Campos para desativação e follow-up
  status: text("status").notNull().default("active"), // active, inactive, deactivated
  followupStatus: text("followup_status"), // 'no_closure', 'missed', 'active'
  deactivatedAt: timestamp("deactivated_at"),
  deactivationReason: text("deactivation_reason"), // Justificativa obrigatória
  deactivatedBy: varchar("deactivated_by").references(() => collaborators.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Patient Notes table
export const patientNotes = pgTable("patient_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("note"), // note, procedure, appointment, missed, payment
  title: varchar("title", { length: 255 }),
  amount: varchar("amount", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Templates de procedimentos (independentes de paciente)
export const procedureTemplates = pgTable("procedure_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  defaultPrice: decimal("default_price", { precision: 10, scale: 2 }).notNull(),
  validityDays: integer("validity_days").default(365),
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Procedures table (procedimentos realizados vinculados ao paciente)
export const procedures = pgTable("procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => procedureTemplates.id), // Referência opcional ao template
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  validityDate: timestamp("validity_date"),
  performedDate: timestamp("performed_date").notNull(),
  closedDate: timestamp("closed_date"), // Data quando foi fechado na consulta
  status: text("status").default('active'), // 'active', 'closed', 'expired'
  collaboratorId: varchar("collaborator_id").notNull().references(() => collaborators.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").references(() => patients.id, { onDelete: 'cascade' }),
  collaboratorId: varchar("collaborator_id").notNull().references(() => collaborators.id),
  procedureId: varchar("procedure_id").references(() => procedures.id),
  type: text("type").notNull(), // 'consultation', 'procedure', 'followup', 'return', 'task'
  title: text("title").notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").notNull().default('pending'), // 'pending', 'confirmed', 'completed', 'cancelled'
  notes: text("notes"),
  // Campos para conclusão de consultas
  completionType: text("completion_type"), // 'closed_procedure', 'no_closure', 'missed'
  closedProcedureId: varchar("closed_procedure_id").references(() => procedures.id),

  // Sistema de Feedback Obrigatório
  requiresFeedback: boolean("requires_feedback").notNull().default(false), // Se requer feedback
  feedbackCompleted: boolean("feedback_completed").notNull().default(false), // Se foi completado
  feedbackQuestion: text("feedback_question"), // O que foi perguntado
  feedbackResponse: text("feedback_response"), // Resposta do paciente
  feedbackDate: timestamp("feedback_date"), // Quando foi coletado
  patientResponded: boolean("patient_responded").default(false), // Se paciente respondeu

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Oportunidades de procedimentos (procedimentos oferecidos mas não fechados)
export const procedureOpportunities = pgTable("procedure_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  collaboratorId: varchar("collaborator_id").notNull().references(() => collaborators.id),
  templateId: varchar("template_id").references(() => procedureTemplates.id),
  procedureName: text("procedure_name").notNull(),
  proposedValue: decimal("proposed_value", { precision: 10, scale: 2 }),
  status: text("status").notNull().default("open"), // open, closed, lost
  notes: text("notes"),
  closedDate: timestamp("closed_date"),
  lostReason: text("lost_reason"), // Motivo se perdeu a oportunidade
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Administrative Tasks table (tarefas atribuídas pelo admin)
export const adminTasks = pgTable("admin_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to").notNull().references(() => collaborators.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'cancelled'
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completionNotes: text("completion_notes"),
  patientId: varchar("patient_id").references(() => patients.id), // opcional, se relacionado a um paciente
  category: text("category").default("general"), // 'general', 'patient_follow_up', 'sales', 'administrative'
  isRecurring: boolean("is_recurring").default(false),
  recurringPattern: text("recurring_pattern"), // 'daily', 'weekly', 'monthly'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Performance Metrics table (métricas de performance dos colaboradores)
export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  collaboratorId: varchar("collaborator_id").notNull().references(() => collaborators.id),
  metricDate: date("metric_date").notNull(),
  patientsContacted: integer("patients_contacted").default(0),
  appointmentsScheduled: integer("appointments_scheduled").default(0),
  proceduresCompleted: integer("procedures_completed").default(0),
  revenueGenerated: decimal("revenue_generated", { precision: 10, scale: 2 }).default("0"),
  feedbacksCompleted: integer("feedbacks_completed").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  averageResponseTime: integer("average_response_time"), // em minutos
  patientSatisfactionScore: decimal("patient_satisfaction_score", { precision: 3, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Patient Progress Tracking (rastreamento de progresso dos pacientes)
export const patientProgress = pgTable("patient_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id),
  collaboratorId: varchar("collaborator_id").notNull().references(() => collaborators.id),
  progressType: text("progress_type").notNull(), // 'contact_made', 'appointment_scheduled', 'procedure_completed', 'follow_up_done'
  description: text("description").notNull(),
  statusBefore: text("status_before"),
  statusAfter: text("status_after"),
  daysSinceLastContact: integer("days_since_last_contact"),
  isStalled: boolean("is_stalled").default(false),
  stallReason: text("stall_reason"),
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  description: text("description").notNull(),
  entityId: varchar("entity_id"),
  entityType: text("entity_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  collaborator: one(collaborators, {
    fields: [users.id],
    references: [collaborators.userId],
  }),
  activityLogs: many(activityLog),
}));

export const citiesRelations = relations(cities, ({ many }) => ({
  collaborators: many(collaborators),
  patients: many(patients),
}));

export const collaboratorsRelations = relations(collaborators, ({ one, many }) => ({
  user: one(users, {
    fields: [collaborators.userId],
    references: [users.id],
  }),
  city: one(cities, {
    fields: [collaborators.cityId],
    references: [cities.id],
  }),
  patients: many(patients),
  procedures: many(procedures),
  events: many(events),
  procedureOpportunities: many(procedureOpportunities),
  assignedTasks: many(adminTasks),
  performanceMetrics: many(performanceMetrics),
  patientProgress: many(patientProgress),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  city: one(cities, {
    fields: [patients.cityId],
    references: [cities.id],
  }),
  collaborator: one(collaborators, {
    fields: [patients.collaboratorId],
    references: [collaborators.id],
  }),
  deactivatedByCollaborator: one(collaborators, {
    fields: [patients.deactivatedBy],
    references: [collaborators.id],
  }),
  procedures: many(procedures),
  events: many(events),
  procedureOpportunities: many(procedureOpportunities),
}));

export const procedureTemplatesRelations = relations(procedureTemplates, ({ many }) => ({
  procedures: many(procedures),
}));

export const proceduresRelations = relations(procedures, ({ one, many }) => ({
  template: one(procedureTemplates, {
    fields: [procedures.templateId],
    references: [procedureTemplates.id],
  }),
  patient: one(patients, {
    fields: [procedures.patientId],
    references: [patients.id],
  }),
  collaborator: one(collaborators, {
    fields: [procedures.collaboratorId],
    references: [collaborators.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  patient: one(patients, {
    fields: [events.patientId],
    references: [patients.id],
  }),
  collaborator: one(collaborators, {
    fields: [events.collaboratorId],
    references: [collaborators.id],
  }),
  procedure: one(procedures, {
    fields: [events.procedureId],
    references: [procedures.id],
  }),
}));

export const procedureOpportunitiesRelations = relations(procedureOpportunities, ({ one }) => ({
  patient: one(patients, {
    fields: [procedureOpportunities.patientId],
    references: [patients.id],
  }),
  collaborator: one(collaborators, {
    fields: [procedureOpportunities.collaboratorId],
    references: [collaborators.id],
  }),
  template: one(procedureTemplates, {
    fields: [procedureOpportunities.templateId],
    references: [procedureTemplates.id],
  }),
}));

export const adminTasksRelations = relations(adminTasks, ({ one }) => ({
  assignedToCollaborator: one(collaborators, {
    fields: [adminTasks.assignedTo],
    references: [collaborators.id],
  }),
  assignedByUser: one(users, {
    fields: [adminTasks.assignedBy],
    references: [users.id],
  }),
  patient: one(patients, {
    fields: [adminTasks.patientId],
    references: [patients.id],
  }),
}));

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  collaborator: one(collaborators, {
    fields: [performanceMetrics.collaboratorId],
    references: [collaborators.id],
  }),
}));

export const patientProgressRelations = relations(patientProgress, ({ one }) => ({
  patient: one(patients, {
    fields: [patientProgress.patientId],
    references: [patients.id],
  }),
  collaborator: one(collaborators, {
    fields: [patientProgress.collaboratorId],
    references: [collaborators.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCitySchema = createInsertSchema(cities).omit({
  id: true,
  createdAt: true,
});

export const insertCollaboratorSchema = createInsertSchema(collaborators).omit({
  id: true,
  createdAt: true,
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcedureTemplateSchema = createInsertSchema(procedureTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcedureSchema = createInsertSchema(procedures).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export const insertPatientNoteSchema = createInsertSchema(patientNotes).omit({
  id: true,
  createdAt: true,
});

export const insertProcedureOpportunitySchema = createInsertSchema(procedureOpportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdminTaskSchema = createInsertSchema(adminTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
});

export const insertPatientProgressSchema = createInsertSchema(patientProgress).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;

export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type ProcedureTemplate = typeof procedureTemplates.$inferSelect;
export type InsertProcedureTemplate = z.infer<typeof insertProcedureTemplateSchema>;

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type PatientNote = typeof patientNotes.$inferSelect;
export type InsertPatientNote = z.infer<typeof insertPatientNoteSchema>;

export type ProcedureOpportunity = typeof procedureOpportunities.$inferSelect;
export type InsertProcedureOpportunity = z.infer<typeof insertProcedureOpportunitySchema>;

export type AdminTask = typeof adminTasks.$inferSelect;
export type InsertAdminTask = z.infer<typeof insertAdminTaskSchema>;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = z.infer<typeof insertPerformanceMetricSchema>;

export type PatientProgress = typeof patientProgress.$inferSelect;
export type InsertPatientProgress = z.infer<typeof insertPatientProgressSchema>;

// Extended types with relations
export type PatientWithRelations = Patient & {
  city?: City;
  collaborator?: Collaborator & { user: User; city: City };
  procedures?: Procedure[];
  events?: Event[];
};

export type CollaboratorWithRelations = Collaborator & {
  user: User;
  city: City;
  patients?: Patient[];
};

export type EventWithRelations = Event & {
  patient: Patient;
  collaborator: Collaborator & { user: User };
  procedure?: Procedure;
};

export type AdminTaskWithRelations = AdminTask & {
  assignedToCollaborator: Collaborator & { user: User };
  assignedByUser: User;
  patient?: Patient;
};

export type PerformanceMetricWithRelations = PerformanceMetric & {
  collaborator: Collaborator & { user: User };
};

export type PatientProgressWithRelations = PatientProgress & {
  patient: Patient;
  collaborator: Collaborator & { user: User };
};
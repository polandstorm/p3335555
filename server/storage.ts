import { 
  users, collaborators, patients, procedures, procedureTemplates, events, activityLog, cities, patientNotes,
  adminTasks, performanceMetrics, patientProgress,
  type User, type InsertUser, type City, type InsertCity,
  type Collaborator, type InsertCollaborator, type CollaboratorWithRelations,
  type Patient, type InsertPatient, type PatientWithRelations,
  type Procedure, type InsertProcedure,
  type ProcedureTemplate, type InsertProcedureTemplate,
  type Event, type InsertEvent, type EventWithRelations,
  type ActivityLog, type InsertActivityLog,
  type PatientNote, type InsertPatientNote,
  type AdminTask, type InsertAdminTask, type AdminTaskWithRelations,
  type PerformanceMetric, type InsertPerformanceMetric,
  type PatientProgress, type InsertPatientProgress
} from "@shared/schema";
import { nanoid } from 'nanoid';
import { db } from "./db";
import { eq, desc, and, gte, lte, count, sql, SQL } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // City methods
  getCities(): Promise<City[]>;
  createCity(city: InsertCity): Promise<City>;
  updateCity(id: string, updates: Partial<City>): Promise<City>;
  deleteCity(id: string): Promise<void>;
  getCityMetrics(): Promise<any[]>;

  // Collaborator methods
  getCollaborators(): Promise<CollaboratorWithRelations[]>;
  getCollaborator(id: string): Promise<CollaboratorWithRelations | undefined>;
  getCollaboratorByUserId(userId: string): Promise<CollaboratorWithRelations | undefined>;
  createCollaborator(collaborator: InsertCollaborator): Promise<Collaborator>;
  updateCollaborator(id: string, updates: Partial<Collaborator>): Promise<Collaborator>;
  deleteCollaborator(id: string): Promise<void>;
  getCollaboratorsByCity(cityId: string): Promise<CollaboratorWithRelations[]>;
  getPatientsByCollaborator(collaboratorId: string): Promise<PatientWithRelations[]>;

  // Patient methods
  getPatients(collaboratorId?: string): Promise<PatientWithRelations[]>;
  getPatient(id: string): Promise<PatientWithRelations | undefined>;
  getIncompletePatients(): Promise<PatientWithRelations[]>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient>;
  deletePatient(id: string): Promise<void>;

  // Procedure template methods
  getProcedureTemplates(): Promise<ProcedureTemplate[]>;
  createProcedureTemplate(template: InsertProcedureTemplate): Promise<ProcedureTemplate>;
  updateProcedureTemplate(id: string, updates: Partial<ProcedureTemplate>): Promise<ProcedureTemplate>;
  deleteProcedureTemplate(id: string): Promise<void>;

  // Patients deactivation methods
  getDeactivatedPatients(): Promise<PatientWithRelations[]>;

  // Procedure methods
  getProcedures(patientId?: string): Promise<Procedure[]>;
  createProcedure(procedure: InsertProcedure): Promise<Procedure>;
  updateProcedure(id: string, updates: Partial<Procedure>): Promise<Procedure>;
  deleteProcedure(id: string): Promise<void>;

  // Event methods
  getEvents(collaboratorId?: string, startDate?: Date, endDate?: Date, status?: string): Promise<EventWithRelations[]>;
  getUpcomingEvents(collaboratorId?: string, limit?: number): Promise<EventWithRelations[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, updates: Partial<Event>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;

  // Activity log methods
  getRecentActivity(limit?: number): Promise<ActivityLog[]>;
  createActivityLog(activity: InsertActivityLog): Promise<ActivityLog>;

  // Patient notes methods
  getPatientNotes(patientId: string): Promise<PatientNote[]>;
  createPatientNote(note: InsertPatientNote): Promise<PatientNote>;

  // Admin task methods
  getAdminTasks(assignedTo?: string, status?: string): Promise<AdminTaskWithRelations[]>;
  createAdminTask(task: InsertAdminTask): Promise<AdminTask>;
  updateAdminTask(id: string, updates: Partial<AdminTask>): Promise<AdminTask>;
  deleteAdminTask(id: string): Promise<void>;
  getCollaboratorPendingTasks(collaboratorId: string): Promise<AdminTaskWithRelations[]>;

  // Performance metrics methods
  getPerformanceMetrics(collaboratorId?: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetric[]>;
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getCollaboratorDashboardStats(collaboratorId: string): Promise<{
    totalPatients: number;
    stalledPatients: number;
    completedTasks: number;
    pendingTasks: number;
    monthlyRevenue: number;
    weeklyProgress: any;
  }>;

  // Patient progress methods
  getPatientProgress(patientId?: string, collaboratorId?: string): Promise<PatientProgress[]>;
  createPatientProgress(progress: InsertPatientProgress): Promise<PatientProgress>;
  getStalledPatients(): Promise<any[]>;

  // Global company statistics
  getGlobalStats(startDate?: Date, endDate?: Date): Promise<{
    totalPatients: number;
    activePatients: number;
    stalledPatients: number;
    totalRevenue: number;
    monthlyGrowth: number;
    weeklyGrowth: number;
    topPerformers: any[];
  }>;

  // Dashboard metrics
  getDashboardMetrics(collaboratorId?: string): Promise<{
    totalPatients: number;
    activeProcedures: number;
    pendingFollowups: number;
    monthlyRevenue: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getCities(): Promise<City[]> {
    return await db.select().from(cities).orderBy(cities.name);
  }

  async getCity(id: string): Promise<City | undefined> {
    const [city] = await db.select().from(cities).where(eq(cities.id, id));
    return city;
  }

  async createCity(insertCity: InsertCity): Promise<City> {
    const [city] = await db.insert(cities).values(insertCity).returning();
    return city;
  }

  async getCollaborators(): Promise<CollaboratorWithRelations[]> {
    const rows = await db.select().from(collaborators)
      .leftJoin(users, eq(collaborators.userId, users.id))
      .leftJoin(cities, eq(collaborators.cityId, cities.id))
      .orderBy(desc(collaborators.createdAt));

    return rows.map(row => ({
      ...row.collaborators,
      user: row.users!,
      city: row.cities!,
    }));
  }

  async getCollaborator(id: string): Promise<CollaboratorWithRelations | undefined> {
    const rows = await db.select()
      .from(collaborators)
      .leftJoin(users, eq(collaborators.userId, users.id))
      .leftJoin(cities, eq(collaborators.cityId, cities.id))
      .where(eq(collaborators.id, id));

    const row = rows[0];
    if (!row) return undefined;

    return {
      ...row.collaborators,
      user: row.users!,
      city: row.cities!,
    };
  }

  async getCollaboratorByUserId(userId: string): Promise<CollaboratorWithRelations | undefined> {
    const rows = await db.select().from(collaborators)
      .leftJoin(users, eq(collaborators.userId, users.id))
      .leftJoin(cities, eq(collaborators.cityId, cities.id))
      .where(eq(collaborators.userId, userId));

    const row = rows[0];
    if (!row) return undefined;

    return {
      ...row.collaborators,
      user: row.users!,
      city: row.cities!,
    };
  }

  async createCollaborator(data: InsertCollaborator): Promise<Collaborator> {
    const [collaborator] = await db.insert(collaborators).values(data).returning();

    // Return collaborator with relations
    const result = await db.select()
      .from(collaborators)
      .leftJoin(users, eq(collaborators.userId, users.id))
      .leftJoin(cities, eq(collaborators.cityId, cities.id))
      .where(eq(collaborators.id, collaborator.id));

    const row = result[0];
    return {
      ...row.collaborators,
      user: row.users!,
      city: row.cities!,
    };
  }

  async updateCollaborator(id: string, updates: Partial<Collaborator>): Promise<Collaborator> {
    const [collaborator] = await db.update(collaborators)
      .set({ ...updates, updatedAt: new Date() } as any)
      .where(eq(collaborators.id, id))
      .returning();
    return collaborator;
  }

  async getPatients(collaboratorId?: string): Promise<PatientWithRelations[]> {
    const baseQuery = db.select().from(patients)
      .leftJoin(cities, eq(patients.cityId, cities.id))
      .leftJoin(collaborators, eq(patients.collaboratorId, collaborators.id))
      .leftJoin(users, eq(collaborators.userId, users.id));

    const query = collaboratorId 
      ? baseQuery.where(eq(patients.collaboratorId, collaboratorId))
      : baseQuery;

    const rows = await query.orderBy(desc(patients.updatedAt));

    return rows.map(row => ({
      ...row.patients,
      city: row.cities || undefined,
      collaborator: row.collaborators && row.users ? {
        ...row.collaborators,
        user: row.users,
        city: row.cities!,
      } : undefined,
    }));
  }

  async getPatient(id: string): Promise<PatientWithRelations | undefined> {
    const rows = await db.select().from(patients)
      .leftJoin(cities, eq(patients.cityId, cities.id))
      .leftJoin(collaborators, eq(patients.collaboratorId, collaborators.id))
      .leftJoin(users, eq(collaborators.userId, users.id))
      .where(eq(patients.id, id));

    const row = rows[0];
    if (!row) return undefined;

    return {
      ...row.patients,
      city: row.cities || undefined,
      collaborator: row.collaborators && row.users ? {
        ...row.collaborators,
        user: row.users,
        city: row.cities!,
      } : undefined,
    };
  }

  async getIncompletePatients(): Promise<PatientWithRelations[]> {
    const rows = await db.select().from(patients)
      .leftJoin(cities, eq(patients.cityId, cities.id))
      .leftJoin(collaborators, eq(patients.collaboratorId, collaborators.id))
      .leftJoin(users, eq(collaborators.userId, users.id))
      .where(eq(patients.isRegistrationComplete, false))
      .orderBy(desc(patients.createdAt));

    return rows.map(row => ({
      ...row.patients,
      city: row.cities || undefined,
      collaborator: row.collaborators && row.users ? {
        ...row.collaborators,
        user: row.users,
        city: row.cities!,
      } : undefined,
    }));
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const [patient] = await db.update(patients)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  async deletePatient(id: string): Promise<void> {
    await db.delete(patients).where(eq(patients.id, id));
  }

  async getProcedures(patientId?: string): Promise<Procedure[]> {
    const baseQuery = db.select().from(procedures);

    const query = patientId 
      ? baseQuery.where(eq(procedures.patientId, patientId))
      : baseQuery;

    return await query.orderBy(desc(procedures.performedDate));
  }

  async createProcedure(insertProcedure: InsertProcedure): Promise<Procedure> {
    const [procedure] = await db.insert(procedures).values(insertProcedure).returning();
    return procedure;
  }

  async updateProcedure(id: string, updates: Partial<Procedure>): Promise<Procedure> {
    const [procedure] = await db.update(procedures)
      .set(updates)
      .where(eq(procedures.id, id))
      .returning();
    return procedure;
  }

  async deleteProcedure(id: string): Promise<void> {
    await db.delete(procedures).where(eq(procedures.id, id));
  }

  async getEvents(collaboratorId?: string, startDate?: Date, endDate?: Date, status?: string): Promise<EventWithRelations[]> {
    const baseQuery = db.select().from(events)
      .leftJoin(patients, eq(events.patientId, patients.id))
      .leftJoin(collaborators, eq(events.collaboratorId, collaborators.id))
      .leftJoin(users, eq(collaborators.userId, users.id))
      .leftJoin(procedures, eq(events.procedureId, procedures.id));

    const conditions = [];
    if (collaboratorId) {
      conditions.push(eq(events.collaboratorId, collaboratorId));
    }
    if (startDate) {
      conditions.push(gte(events.scheduledDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.scheduledDate, endDate));
    }

    if (status) {
      conditions.push(eq(events.status, status));
    }

    const query = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    const rows = await query.orderBy(events.scheduledDate);

    return rows.map(row => ({
      ...row.events,
      patient: row.patients!,
      collaborator: {
        ...row.collaborators!,
        user: row.users!,
      } as any,
      procedure: row.procedures || undefined,
    }));
  }

  async getUpcomingEvents(collaboratorId?: string, limit = 10): Promise<EventWithRelations[]> {
    const baseQuery = db.select().from(events)
      .leftJoin(patients, eq(events.patientId, patients.id))
      .leftJoin(collaborators, eq(events.collaboratorId, collaborators.id))
      .leftJoin(users, eq(collaborators.userId, users.id))
      .leftJoin(procedures, eq(events.procedureId, procedures.id));

    const query = collaboratorId 
      ? baseQuery.where(and(
          eq(events.collaboratorId, collaboratorId),
          gte(events.scheduledDate, new Date())
        ))
      : baseQuery.where(gte(events.scheduledDate, new Date()));

    const rows = await query
      .orderBy(events.scheduledDate)
      .limit(limit);

    return rows.map(row => ({
      ...row.events,
      patient: row.patients!,
      collaborator: {
        ...row.collaborators!,
        user: row.users!,
      } as any,
      procedure: row.procedures || undefined,
    }));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(insertEvent).returning();
    return event;
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const [event] = await db.update(events)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getRecentActivity(limit = 10): Promise<ActivityLog[]> {
    return await db.select().from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async createActivityLog(insertActivity: InsertActivityLog): Promise<ActivityLog> {
    const [activity] = await db.insert(activityLog).values(insertActivity).returning();
    return activity;
  }

  async getDashboardMetrics(collaboratorId?: string): Promise<{
    totalPatients: number;
    activeProcedures: number;
    pendingFollowups: number;
    monthlyRevenue: number;
  }> {
    // Get total patients
    const patientsBaseQuery = db.select({ count: count() }).from(patients);
    const patientsQuery = collaboratorId 
      ? patientsBaseQuery.where(eq(patients.collaboratorId, collaboratorId))
      : patientsBaseQuery;
    const [{ count: totalPatients }] = await patientsQuery;

    // Get active procedures (with valid dates)
    const proceduresBaseQuery = db.select({ count: count() }).from(procedures);
    const activeProcConditions = [gte(procedures.validityDate, new Date())];
    if (collaboratorId) {
      activeProcConditions.push(eq(procedures.collaboratorId, collaboratorId));
    }
    const proceduresQuery = proceduresBaseQuery.where(and(...activeProcConditions));
    const [{ count: activeProcedures }] = await proceduresQuery;

    // Get pending followups
    const followupsBaseQuery = db.select({ count: count() }).from(events);
    const followupConditions = [
      eq(events.type, 'followup'),
      eq(events.status, 'scheduled'),
      lte(events.scheduledDate, new Date())
    ];
    if (collaboratorId) {
      followupConditions.push(eq(events.collaboratorId, collaboratorId));
    }
    const followupsQuery = followupsBaseQuery.where(and(...followupConditions));
    const [{ count: pendingFollowups }] = await followupsQuery;

    // Get monthly revenue (current month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const revenueBaseQuery = db.select({ 
      sum: sql<number>`COALESCE(SUM(${procedures.value}), 0)::numeric`
    }).from(procedures);

    const revenueConditions = [
      gte(procedures.performedDate, startOfMonth),
      lte(procedures.performedDate, endOfMonth)
    ];
    if (collaboratorId) {
      revenueConditions.push(eq(procedures.collaboratorId, collaboratorId));
    }

    const revenueQuery = revenueBaseQuery.where(and(...revenueConditions));
    const [{ sum: monthlyRevenue }] = await revenueQuery;

    return {
      totalPatients,
      activeProcedures,
      pendingFollowups,
      monthlyRevenue: Number(monthlyRevenue) || 0,
    };
  }

  // City management methods
  async updateCity(id: string, updates: Partial<City>): Promise<City> {
    const [city] = await db.update(cities)
      .set(updates)
      .where(eq(cities.id, id))
      .returning();
    return city;
  }

  async deleteCity(id: string): Promise<void> {
    await db.delete(cities).where(eq(cities.id, id));
  }

  async getCityMetrics(): Promise<any[]> {
    try {
      const citiesList = await this.getCities();
      const collaborators = await this.getCollaborators();
      const patients = await this.getPatients();

      return citiesList.map(city => {
        const cityCollaborators = collaborators.filter(c => c.cityId === city.id);
        const cityPatients = patients.filter(p => p.cityId === city.id);

        return {
          cityId: city.id,
          totalPatients: cityPatients.length,
          totalCollaborators: cityCollaborators.length,
          monthlyRevenue: 0,
          goalProgress: 0
        };
      });
    } catch (error) {
      console.error('Error fetching city metrics:', error);
      return [];
    }
  }

  async deleteCollaborator(id: string): Promise<void> {
    await db.delete(collaborators).where(eq(collaborators.id, id));
  }

  async getCollaboratorsByCity(cityId: string): Promise<CollaboratorWithRelations[]> {
    return await db
      .select({
        id: collaborators.id,
        userId: collaborators.userId,
        cityId: collaborators.cityId,
        revenueGoal: collaborators.revenueGoal,
        consultationGoal: collaborators.consultationGoal,
        isActive: collaborators.isActive,
        createdAt: collaborators.createdAt,
        user: {
          id: users.id,
          username: users.username,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        },
        city: {
          id: cities.id,
          name: cities.name,
          state: cities.state,
          description: cities.description,
          monthlyGoal: cities.monthlyGoal,
          quarterlyGoal: cities.quarterlyGoal,
          yearlyGoal: cities.yearlyGoal,
          createdAt: cities.createdAt,
        },
      })
      .from(collaborators)
      .innerJoin(users, eq(collaborators.userId, users.id))
      .innerJoin(cities, eq(collaborators.cityId, cities.id))
      .where(eq(collaborators.cityId, cityId))
      .orderBy(desc(collaborators.createdAt));
  }

  async getPatientsByCollaborator(collaboratorId: string): Promise<PatientWithRelations[]> {
    return await db
      .select({
        id: patients.id,
        name: patients.name,
        phone: patients.phone,
        email: patients.email,
        photo: patients.photo,
        cityId: patients.cityId,
        classification: patients.classification,
        collaboratorId: patients.collaboratorId,
        currentStatus: patients.currentStatus,
        nextSteps: patients.nextSteps,
        lastConsultationDate: patients.lastConsultationDate,
        isRegistrationComplete: patients.isRegistrationComplete,
        clinicGoals: patients.clinicGoals,
        mainConcerns: patients.mainConcerns,
        importantNotes: patients.importantNotes,
        status: patients.status,
        followupStatus: patients.followupStatus,
        deactivatedAt: patients.deactivatedAt,
        deactivationReason: patients.deactivationReason,
        deactivatedBy: patients.deactivatedBy,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
        city: {
          id: cities.id,
          name: cities.name,
          state: cities.state,
          description: cities.description,
          monthlyGoal: cities.monthlyGoal,
          quarterlyGoal: cities.quarterlyGoal,
          yearlyGoal: cities.yearlyGoal,
          createdAt: cities.createdAt,
        },
        collaborator: {
          id: collaborators.id,
          userId: collaborators.userId,
          cityId: collaborators.cityId,
          revenueGoal: collaborators.revenueGoal,
          consultationGoal: collaborators.consultationGoal,
          isActive: collaborators.isActive,
          createdAt: collaborators.createdAt,
        },
      })
      .from(patients)
      .leftJoin(cities, eq(patients.cityId, cities.id))
      .leftJoin(collaborators, eq(patients.collaboratorId, collaborators.id))
      .where(eq(patients.collaboratorId, collaboratorId))
      .orderBy(desc(patients.createdAt));
  }

  // Patient notes methods
  async getPatientNotes(patientId: string): Promise<PatientNote[]> {
    return await db.select().from(patientNotes)
      .where(eq(patientNotes.patientId, patientId))
      .orderBy(desc(patientNotes.createdAt));
  }

  async createPatientNote(insertNote: InsertPatientNote): Promise<PatientNote> {
    const [note] = await db.insert(patientNotes).values(insertNote).returning();
    return note;
  }

  // Procedure template methods implementation
  async getProcedureTemplates(): Promise<any[]> {
    try {
      // Return empty array for now since procedure templates table doesn't exist
      return [];
    } catch (error) {
      console.error('Error fetching procedure templates:', error);
      return [];
    }
  }

  async createProcedureTemplate(data: any): Promise<any> {
    // Return mock data for now
    return { id: '1', ...data, createdAt: new Date() };
  }

  async updateProcedureTemplate(id: string, updates: any): Promise<any> {
    // Return mock data for now
    return { id, ...updates, updatedAt: new Date() };
  }

  async deleteProcedureTemplate(id: string): Promise<void> {
    // Mock delete for now
    console.log('Deleting procedure template:', id);
  }

  // Patients deactivation methods implementation
  async getDeactivatedPatients(): Promise<PatientWithRelations[]> {
    try {
      const result = await db.query.patients.findMany({
        where: eq(patients.status, 'deactivated'),
        with: {
          city: true,
          collaborator: {
            with: {
              user: true
            }
          }
        },
        orderBy: desc(patients.updatedAt)
      });
      return result as PatientWithRelations[];
    } catch (error) {
      console.error('Error fetching deactivated patients:', error);
      return [];
    }
  }

  async getCollaboratorMetrics(collaboratorId: string): Promise<any> {
    try {
      // Buscar dados básicos
      const totalPatientsResult = await db.select().from(patients).where(eq(patients.collaboratorId, collaboratorId));
      const activePatientsResult = await db.select().from(patients).where(and(eq(patients.collaboratorId, collaboratorId), eq(patients.status, 'active')));
      const allProcedures = await db.select().from(procedures).where(eq(procedures.collaboratorId, collaboratorId));
      const allEvents = await db.select().from(events).where(eq(events.collaboratorId, collaboratorId));

      // Calcular receitas por período
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const currentYear = new Date(now.getFullYear(), 0, 1);

      const monthlyRevenue = allProcedures
        .filter(p => new Date(p.performedDate) >= currentMonth)
        .reduce((sum, p) => sum + parseFloat(p.value || '0'), 0);

      const quarterlyRevenue = allProcedures
        .filter(p => new Date(p.performedDate) >= currentQuarter)
        .reduce((sum, p) => sum + parseFloat(p.value || '0'), 0);

      const yearlyRevenue = allProcedures
        .filter(p => new Date(p.performedDate) >= currentYear)
        .reduce((sum, p) => sum + parseFloat(p.value || '0'), 0);

      const consultationsThisMonth = allEvents
        .filter(e => e.type === 'consultation' && new Date(e.scheduledDate) >= currentMonth)
        .length;

      // Buscar metas do colaborador
      const collaborator = await db.query.collaborators.findFirst({
        where: eq(collaborators.id, collaboratorId)
      });

      return {
        totalPatients: totalPatientsResult.length,
        activePatients: activePatientsResult.length,
        totalProcedures: allProcedures.length,
        monthlyRevenue: monthlyRevenue,
        quarterlyRevenue: quarterlyRevenue,
        yearlyRevenue: yearlyRevenue,
        consultationsThisMonth: consultationsThisMonth,
        goalProgress: {
          monthly: collaborator?.revenueGoal ? (monthlyRevenue / parseFloat(collaborator.revenueGoal)) * 100 : 0,
          quarterly: collaborator?.revenueGoal ? (quarterlyRevenue / (parseFloat(collaborator.revenueGoal) * 3)) * 100 : 0,
          yearly: collaborator?.revenueGoal ? (yearlyRevenue / (parseFloat(collaborator.revenueGoal) * 12)) * 100 : 0,
          sales: collaborator?.revenueGoal ? (monthlyRevenue / parseFloat(collaborator.revenueGoal)) * 100 : 0,
          consultations: collaborator?.consultationGoal ? (consultationsThisMonth / collaborator.consultationGoal) * 100 : 0,
        }
      };
    } catch (error) {
      console.error('Error calculating collaborator metrics:', error);
      return {
        totalPatients: 0,
        activePatients: 0,
        totalProcedures: 0,
        monthlyRevenue: 0,
        quarterlyRevenue: 0,
        yearlyRevenue: 0,
        consultationsThisMonth: 0,
        goalProgress: {
          monthly: 0,
          quarterly: 0,
          yearly: 0,
          sales: 0,
          consultations: 0,
        }
      };
    }
  }

  // Método para criar tarefa administrativa que vira evento
  async createAdminTaskAsEvent(taskData: {
    title: string;
    description: string;
    assignedTo: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    type: 'task';
  }): Promise<any> {
    try {
      // Criar o evento que representa a tarefa
      const [event] = await db.insert(events).values({
        id: nanoid(),
        title: `[TAREFA] ${taskData.title}`,
        type: 'task',
        scheduledDate: taskData.dueDate,
        status: 'pending',
        collaboratorId: taskData.assignedTo,
        notes: taskData.description,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return event;
    } catch (error) {
      console.error('Error creating admin task as event:', error);
      throw error;
    }
  }

  // Completar consulta com resultado obrigatório
  async completeConsultation(eventId: string, completionData: {
    completionType: 'closed_procedure' | 'no_closure' | 'missed';
    notes?: string;
    closedProcedureTemplateId?: string;
    collaboratorId?: string;
  }): Promise<any> {
    try {
      // Buscar o evento
      const event = await db.query.events.findFirst({
        where: eq(events.id, eventId),
        with: {
          patient: true
        }
      });

      if (!event) {
        throw new Error('Evento não encontrado');
      }

      let result: any = {};

      // Atualizar o evento com a conclusão
      const [updatedEvent] = await db.update(events)
        .set({
          status: 'completed',
          completionType: completionData.completionType,
          notes: completionData.notes,
          updatedAt: new Date()
        })
        .where(eq(events.id, eventId))
        .returning();

      result.event = updatedEvent;

      // Se fechou procedimento, criar o procedimento
      if (completionData.completionType === 'closed_procedure' && completionData.closedProcedureTemplateId) {
        const template = await db.query.procedureTemplates.findFirst({
          where: eq(procedureTemplates.id, completionData.closedProcedureTemplateId)
        });

        if (template) {
          const validityDate = new Date();
          validityDate.setDate(validityDate.getDate() + template.validityDays);

          const [procedure] = await db.insert(procedures).values({
            id: nanoid(),
            templateId: template.id,
            patientId: event.patientId!,
            name: template.name,
            value: template.approximateValue,
            validityDate: validityDate,
            performedDate: new Date(),
            closedDate: new Date(), // Data de fechamento na consulta
            status: 'active',
            collaboratorId: completionData.collaboratorId || event.collaboratorId,
            notes: `Procedimento fechado na consulta: ${event.title}`,
            createdAt: new Date()
          }).returning();

          result.procedure = procedure;

          // Atualizar status do paciente
          await db.update(patients)
            .set({
              followupStatus: 'active',
              updatedAt: new Date()
            })
            .where(eq(patients.id, event.patientId!));
        }
      } else {
        // Atualizar status do paciente baseado no tipo
        const followupStatus = completionData.completionType === 'no_closure' ? 'no_closure' : 'missed';

        await db.update(patients)
          .set({
            followupStatus: followupStatus,
            updatedAt: new Date()
          })
          .where(eq(patients.id, event.patientId!));
      }

      return result;
    } catch (error) {
      console.error('Error completing consultation:', error);
      throw error;
    }
  }

  // Buscar pacientes por status de follow-up
  async getPatientsByFollowupStatus(status: 'no_closure' | 'missed' | 'active', collaboratorId?: string): Promise<any[]> {
    try {
      let whereConditions = [eq(patients.followupStatus, status)];

      if (collaboratorId) {
        whereConditions.push(eq(patients.collaboratorId, collaboratorId));
      }

      const result = await db.query.patients.findMany({
        where: and(...whereConditions),
        with: {
          collaborator: {
            with: {
              user: true,
              city: true
            }
          },
          procedures: true,
          city: true
        },
        orderBy: [desc(patients.updatedAt)]
      });

      return result;
    } catch (error) {
      console.error('Error fetching patients by followup status:', error);
      return [];
    }
  }

  // Admin task methods implementation
  async getAdminTasks(assignedTo?: string, status?: string): Promise<AdminTaskWithRelations[]> {
    let whereConditions = [];
    if (assignedTo) whereConditions.push(eq(adminTasks.assignedTo, assignedTo));
    if (status) whereConditions.push(eq(adminTasks.status, status));

    const result = await db.query.adminTasks.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        assignedToCollaborator: {
          with: {
            user: true
          }
        },
        assignedByUser: true,
        patient: true
      },
      orderBy: desc(adminTasks.createdAt)
    });

    return result as AdminTaskWithRelations[];
  }

  async createAdminTask(insertTask: InsertAdminTask): Promise<AdminTask> {
    const [task] = await db.insert(adminTasks).values(insertTask).returning();
    return task;
  }

  async updateAdminTask(id: string, updates: Partial<AdminTask>): Promise<AdminTask> {
    const [task] = await db.update(adminTasks)
      .set(updates)
      .where(eq(adminTasks.id, id))
      .returning();
    return task;
  }

  async deleteAdminTask(id: string): Promise<void> {
    await db.delete(adminTasks).where(eq(adminTasks.id, id));
  }

  async getCollaboratorPendingTasks(collaboratorId: string): Promise<AdminTaskWithRelations[]> {
    const result = await db.query.adminTasks.findMany({
      where: and(
        eq(adminTasks.assignedTo, collaboratorId),
        eq(adminTasks.status, 'pending')
      ),
      with: {
        assignedToCollaborator: {
          with: {
            user: true
          }
        },
        assignedByUser: true,
        patient: true
      },
      orderBy: desc(adminTasks.dueDate)
    });

    return result as AdminTaskWithRelations[];
  }

  // Performance metrics methods implementation
    async getPerformanceMetrics(collaboratorId?: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetric[]> {
      const whereConditions: SQL<unknown>[] = [];
      if (collaboratorId) whereConditions.push(eq(performanceMetrics.collaboratorId, collaboratorId));
      if (startDate) {
        const start = startDate.toISOString().slice(0, 10);
        whereConditions.push(gte(performanceMetrics.metricDate, start));
      }
      if (endDate) {
        const end = endDate.toISOString().slice(0, 10);
        whereConditions.push(lte(performanceMetrics.metricDate, end));
      }

    return await db.select().from(performanceMetrics)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(performanceMetrics.metricDate));
  }

  async createPerformanceMetric(insertMetric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [metric] = await db.insert(performanceMetrics).values(insertMetric).returning();
    return metric;
  }

  async getCollaboratorDashboardStats(collaboratorId: string): Promise<{
    totalPatients: number;
    stalledPatients: number;
    completedTasks: number;
    pendingTasks: number;
    monthlyRevenue: number;
    weeklyProgress: any;
  }> {
    // Get total patients assigned to collaborator
    const [totalPatientsResult] = await db.select({ count: count() })
      .from(patients)
      .where(and(
        eq(patients.collaboratorId, collaboratorId),
        eq(patients.status, 'active')
      ));

    // Get stalled patients (no contact in last 30 days)
    const [stalledPatientsResult] = await db.select({ count: count() })
      .from(patientProgress)
      .where(and(
        eq(patientProgress.collaboratorId, collaboratorId),
        eq(patientProgress.isStalled, true)
      ));

    // Get completed tasks this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const [completedTasksResult] = await db.select({ count: count() })
      .from(adminTasks)
      .where(and(
        eq(adminTasks.assignedTo, collaboratorId),
        eq(adminTasks.status, 'completed'),
        gte(adminTasks.completedAt, thisMonth)
      ));

    // Get pending tasks
    const [pendingTasksResult] = await db.select({ count: count() })
      .from(adminTasks)
      .where(and(
        eq(adminTasks.assignedTo, collaboratorId),
        eq(adminTasks.status, 'pending')
      ));

    // Get monthly revenue (simplified for now)
    const [monthlyRevenueResult] = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${procedures.value} AS DECIMAL)), 0)` 
    })
      .from(procedures)
      .where(and(
        eq(procedures.collaboratorId, collaboratorId),
        gte(procedures.createdAt, thisMonth)
      ));

    return {
      totalPatients: totalPatientsResult.count,
      stalledPatients: stalledPatientsResult.count,
      completedTasks: completedTasksResult.count,
      pendingTasks: pendingTasksResult.count,
      monthlyRevenue: Number(monthlyRevenueResult.total) || 0,
      weeklyProgress: {} // Can be enhanced later
    };
  }

  // Patient progress methods implementation
  async getPatientProgress(patientId?: string, collaboratorId?: string): Promise<PatientProgress[]> {
    let whereConditions = [];
    if (patientId) whereConditions.push(eq(patientProgress.patientId, patientId));
    if (collaboratorId) whereConditions.push(eq(patientProgress.collaboratorId, collaboratorId));

    return await db.select().from(patientProgress)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(patientProgress.createdAt));
  }

  async createPatientProgress(insertProgress: InsertPatientProgress): Promise<PatientProgress> {
    const [progress] = await db.insert(patientProgress).values(insertProgress).returning();
    return progress;
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async getProcedureTemplate(id: string): Promise<any | undefined> {
    // Return mock data for now
    return undefined;
  }

  async getProcedureTemplates(): Promise<any[]> {
    try {
      // Return empty array for now since procedure templates table doesn't exist
      return [];
    } catch (error) {
      console.error('Error fetching procedure templates:', error);
      return [];
    }
  }

  async createProcedureTemplate(data: any): Promise<any> {
    // Return mock data for now
    return { id: '1', ...data, createdAt: new Date() };
  }

  async updateProcedureTemplate(id: string, updates: any): Promise<any> {
    // Return mock data for now
    return { id, ...updates, updatedAt: new Date() };
  }

  async deleteProcedureTemplate(id: string): Promise<void> {
    // Mock delete for now
    console.log('Deleting procedure template:', id);
  }

  async getStalledPatients(): Promise<any[]> {
    const result = await db.query.patientProgress.findMany({
      where: eq(patientProgress.isStalled, true),
      with: {
        patient: true,
        collaborator: {
          with: {
            user: true
          }
        }
      },
      orderBy: desc(patientProgress.daysSinceLastContact)
    });

    return result;
  }

  // Global company statistics implementation
  async getGlobalStats(startDate?: Date, endDate?: Date): Promise<{
    totalPatients: number;
    activePatients: number;
    stalledPatients: number;
    totalRevenue: number;
    monthlyGrowth: number;
    weeklyGrowth: number;
    topPerformers: any[];
  }> {
    // Get total patients
    const [totalPatientsResult] = await db.select({ count: count() })
      .from(patients);

    // Get active patients
    const [activePatientsResult] = await db.select({ count: count() })
      .from(patients)
      .where(eq(patients.status, 'active'));

    // Get stalled patients
    const [stalledPatientsResult] = await db.select({ count: count() })
      .from(patientProgress)
      .where(eq(patientProgress.isStalled, true));

    // Get total revenue
    let revenueConditions = [];
    if (startDate) revenueConditions.push(gte(procedures.createdAt, startDate));
    if (endDate) revenueConditions.push(lte(procedures.createdAt, endDate));

    const [totalRevenueResult] = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(${procedures.value} AS DECIMAL)), 0)` 
    })
      .from(procedures)
      .where(revenueConditions.length > 0 ? and(...revenueConditions) : undefined);

    // Calculate growth metrics (simplified)
    const monthlyGrowth = 5.2; // Can be calculated based on historical data
    const weeklyGrowth = 1.3;

    // Get top performers
    const topPerformers = await db.select({
      collaboratorId: procedures.collaboratorId,
      totalRevenue: sql<number>`COALESCE(SUM(CAST(${procedures.value} AS DECIMAL)), 0)`,
      totalProcedures: count()
    })
      .from(procedures)
      .leftJoin(collaborators, eq(procedures.collaboratorId, collaborators.id))
      .leftJoin(users, eq(collaborators.userId, users.id))
      .where(revenueConditions.length > 0 ? and(...revenueConditions) : undefined)
      .groupBy(procedures.collaboratorId)
      .orderBy(sql`COALESCE(SUM(CAST(${procedures.value} AS DECIMAL)), 0) DESC`)
      .limit(5);

    return {
      totalPatients: totalPatientsResult.count,
      activePatients: activePatientsResult.count,
      stalledPatients: stalledPatientsResult.count,
      totalRevenue: Number(totalRevenueResult.total) || 0,
      monthlyGrowth,
      weeklyGrowth,
      topPerformers
    };
  }
}

export const storage = new DatabaseStorage();
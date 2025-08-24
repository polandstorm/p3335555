import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { 
  insertUserSchema, insertCollaboratorSchema, insertPatientSchema, 
  insertProcedureSchema, insertEventSchema, insertCitySchema 
} from "@shared/schema";

// Extend session data type
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(req.session.userId!);
    if (user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      // Get collaborator info if user is a collaborator
      let collaborator = null;
      if (user.role === 'collaborator') {
        collaborator = await storage.getCollaboratorByUserId(user.id);
      }

      res.json({ 
        user: { id: user.id, username: user.username, name: user.name, role: user.role },
        collaborator 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let collaborator = null;
      if (user.role === 'collaborator') {
        collaborator = await storage.getCollaboratorByUserId(user.id);
      }

      res.json({ 
        user: { id: user.id, username: user.username, name: user.name, role: user.role },
        collaborator 
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cities routes
  app.get("/api/cities", requireAuth, async (req, res) => {
    try {
      const cities = await storage.getCities();
      res.json(cities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  app.post("/api/cities", requireAdmin, async (req, res) => {
    try {
      const result = insertCitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid city data", errors: result.error.issues });
      }

      const city = await storage.createCity(result.data);
      res.status(201).json(city);
    } catch (error) {
      res.status(500).json({ message: "Failed to create city" });
    }
  });

  app.delete("/api/cities/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if city exists
      const city = await storage.getCity(id);
      if (!city) {
        return res.status(404).json({ message: "Cidade não encontrada" });
      }
      
      // Check if city has collaborators
      const collaborators = await storage.getCollaborators();
      const cityCollaborators = collaborators.filter(c => c.cityId === id);
      
      if (cityCollaborators.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir uma cidade com colaboradores ativos",
          details: `Esta cidade possui ${cityCollaborators.length} colaborador(es) vinculado(s). Remova ou transfira os colaboradores antes de excluir a cidade.`
        });
      }
      
      // Check if city has patients
      const patients = await storage.getPatients();
      const cityPatients = patients.filter(p => p.cityId === id);
      
      if (cityPatients.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir uma cidade com pacientes cadastrados",
          details: `Esta cidade possui ${cityPatients.length} paciente(s) cadastrado(s). Remova ou transfira os pacientes antes de excluir a cidade.`
        });
      }
      
      await storage.deleteCity(id);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'city_deleted',
        description: `Deleted city: ${city.name}`,
        entityId: id,
        entityType: 'city',
      });
      
      res.json({ message: "Cidade excluída com sucesso" });
    } catch (error) {
      console.error('Delete city error:', error);
      res.status(500).json({ message: "Falha ao excluir cidade" });
    }
  });

  // Users routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users.map(user => ({ 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        role: user.role 
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid user data", errors: result.error.issues });
      }

      const hashedPassword = await bcrypt.hash(result.data.password, 10);
      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword,
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'user_created',
        description: `Created user: ${user.name}`,
        entityId: user.id,
        entityType: 'user',
      });

      res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
    } catch (error) {
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/users/:id/promote", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === 'admin') {
        return res.status(400).json({ message: "User is already an admin" });
      }

      const updated = await storage.updateUser(user.id, { role: 'admin' });

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'user_promoted',
        description: `Promoted user: ${updated.name} to admin`,
        entityId: updated.id,
        entityType: 'user',
      });

      res.json({ id: updated.id, username: updated.username, name: updated.name, role: updated.role });
    } catch (error) {
      res.status(500).json({ message: "Failed to promote user" });
    }
  });

  // Collaborators routes
  app.get("/api/collaborators", requireAuth, async (req, res) => {
    try {
      const collaborators = await storage.getCollaborators();
      res.json(collaborators);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  app.get("/api/collaborators/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First try to get collaborator by ID
      let collaborator = await storage.getCollaborator(id);
      
      // If not found by ID, try to find by user ID (for collaborator users)
      if (!collaborator) {
        collaborator = await storage.getCollaboratorByUserId(id);
      }
      
      if (!collaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }

      // Get additional metrics and data for the collaborator
      const metrics = await storage.getCollaboratorMetrics(collaborator.id);
      const pendingTasks = await storage.getCollaboratorPendingTasks(collaborator.id);
      const activePatients = await storage.getPatientsByCollaborator(collaborator.id);

      res.json({
        ...collaborator,
        metrics,
        pendingTasks,
        activePatients: activePatients.filter(p => p.status === 'active'),
      });
    } catch (error) {
      console.error('Error fetching collaborator:', error);
      res.status(500).json({ message: "Failed to fetch collaborator" });
    }
  });

  app.post("/api/collaborators", requireAdmin, async (req, res) => {
    try {
      const result = insertCollaboratorSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid collaborator data", errors: result.error.issues });
      }

      // Check if user exists and is not already a collaborator
      const user = await storage.getUser(result.data.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      const existingCollaborator = await storage.getCollaboratorByUserId(result.data.userId);
      if (existingCollaborator) {
        return res.status(400).json({ message: "User is already a collaborator" });
      }

      const collaborator = await storage.createCollaborator(result.data);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'collaborator_created',
        description: `Created collaborator for user: ${user.name}`,
        entityId: collaborator.id,
        entityType: 'collaborator',
      });

      res.status(201).json(collaborator);
    } catch (error) {
      console.error('Error creating collaborator:', error);
      res.status(500).json({ message: "Failed to create collaborator" });
    }
  });

  app.put("/api/collaborators/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const updates = req.body;
      
      // Validate and sanitize updates
      const validFields = ['cityId', 'revenueGoal', 'consultationGoal', 'isActive'];
      const sanitizedUpdates: any = {};
      
      for (const field of validFields) {
        if (updates[field] !== undefined) {
          sanitizedUpdates[field] = updates[field];
        }
      }
      
      // Convert numeric fields
      if (sanitizedUpdates.revenueGoal) {
        sanitizedUpdates.revenueGoal = parseFloat(sanitizedUpdates.revenueGoal);
      }
      if (sanitizedUpdates.consultationGoal) {
        sanitizedUpdates.consultationGoal = parseInt(sanitizedUpdates.consultationGoal);
      }

      const collaborator = await storage.updateCollaborator(id, sanitizedUpdates);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'collaborator_updated',
        description: `Updated collaborator`,
        entityId: collaborator.id,
        entityType: 'collaborator',
      });

      res.json(collaborator);
    } catch (error) {
      console.error('Update collaborator error:', error);
      res.status(500).json({ message: "Failed to update collaborator" });
    }
  });

  app.delete("/api/collaborators/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if collaborator has active patients
      const patients = await storage.getPatientsByCollaborator(id);
      if (patients.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete collaborator with active patients",
          details: `This collaborator has ${patients.length} patient(s) assigned`
        });
      }
      
      await storage.deleteCollaborator(id);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'collaborator_deleted',
        description: `Deleted collaborator`,
        entityId: id,
        entityType: 'collaborator',
      });
      
      res.json({ message: "Collaborator deleted successfully" });
    } catch (error) {
      console.error('Delete collaborator error:', error);
      res.status(500).json({ message: "Failed to delete collaborator" });
    }
  });

  // Patients routes
  app.get("/api/patients", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      const patients = await storage.getPatients(collaboratorId);
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  app.get("/api/patients/incomplete", requireAuth, async (req, res) => {
    try {
      const patients = await storage.getIncompletePatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch incomplete patients" });
    }
  });

  app.get("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const patient = await storage.getPatient(id);
      
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  app.post("/api/patients", requireAuth, async (req, res) => {
    try {
      const result = insertPatientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid patient data", 
          errors: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`)
        });
      }

      // Verify city exists
      if (result.data.cityId) {
        const city = await storage.getCity(result.data.cityId);
        if (!city) {
          return res.status(400).json({ message: "Selected city does not exist" });
        }
      }

      // Verify collaborator exists if provided
      if (result.data.collaboratorId) {
        const collaborator = await storage.getCollaborator(result.data.collaboratorId);
        if (!collaborator) {
          return res.status(400).json({ message: "Selected collaborator does not exist" });
        }
      }

      const patient = await storage.createPatient(result.data);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_created',
        description: `Created patient: ${patient.name}`,
        entityId: patient.id,
        entityType: 'patient',
      });

      res.status(201).json(patient);
    } catch (error) {
      console.error('Error creating patient:', error);
      res.status(500).json({ 
        message: "Failed to create patient", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('Updating patient:', id, 'with updates:', updates);
      const patient = await storage.updatePatient(id, updates);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_updated',
        description: `Updated patient: ${patient.name}`,
        entityId: patient.id,
        entityType: 'patient',
      });

      res.json(patient);
    } catch (error) {
      console.error('Error updating patient:', error);
      res.status(500).json({ message: "Failed to update patient", error: (error as Error).message });
    }
  });

  app.delete("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePatient(id);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_deleted',
        description: `Deleted patient`,
        entityId: id,
        entityType: 'patient',
      });

      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patient" });
    }
  });

  // Procedures routes
  app.get("/api/procedures", requireAuth, async (req, res) => {
    try {
      const { patientId } = req.query;
      const procedures = await storage.getProcedures(patientId as string);
      res.json(procedures);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch procedures" });
    }
  });

  app.post("/api/procedures", requireAuth, async (req, res) => {
    try {
      const result = insertProcedureSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid procedure data", errors: result.error.issues });
      }

      const procedure = await storage.createProcedure(result.data);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'procedure_created',
        description: `Created procedure: ${procedure.name}`,
        entityId: procedure.id,
        entityType: 'procedure',
      });

      res.status(201).json(procedure);
    } catch (error) {
      res.status(500).json({ message: "Failed to create procedure" });
    }
  });

  // Criar tarefa administrativa que vira evento
  app.post('/api/admin/tasks', requireAdmin, async (req, res) => {
    try {
      const { title, description, assignedTo, dueDate, priority, patientId } = req.body;

      if (!title || !assignedTo || !dueDate) {
        return res.status(400).json({ 
          message: "Title, assignedTo and dueDate are required" 
        });
      }

      // Verify collaborator exists
      const collaborator = await storage.getCollaborator(assignedTo);
      if (!collaborator) {
        return res.status(400).json({ message: "Collaborator not found" });
      }

      // Create event for the task
      const event = await storage.createEvent({
        title: `[TAREFA] ${title}`,
        description: description || '',
        scheduledDate: new Date(dueDate),
        collaboratorId: assignedTo,
        patientId: patientId || null,
        type: 'task',
        status: 'pending',
        priority: priority || 'medium'
      });

      // Also create admin task record
      const task = await storage.createAdminTask({
        title,
        description: description || '',
        assignedTo,
        assignedBy: req.session.userId!,
        dueDate: new Date(dueDate),
        priority: priority || 'medium',
        patientId: patientId || null,
        status: 'pending'
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'admin_task_created',
        description: `Created task for collaborator: ${title}`,
        entityId: task.id,
        entityType: 'admin_task',
      });

      res.json({ task, event });
    } catch (error) {
      console.error('Error creating admin task:', error);
      res.status(500).json({ message: 'Failed to create task' });
    }
  });

  // Buscar eventos pendentes para dashboard do colaborador
  app.get('/api/events/pending', requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }
      
      if (!collaboratorId) {
        return res.status(400).json({ error: 'Colaborador não encontrado' });
      }

      const events = await storage.getEvents(
        collaboratorId,
        undefined,
        undefined,
        status as string || 'pending'
      );

      res.json(events);
    } catch (error) {
      console.error('Error fetching pending events:', error);
      res.status(500).json({ error: 'Erro ao buscar eventos pendentes' });
    }
  });

  // Buscar pacientes ativos para dashboard do colaborador
  app.get('/api/patients/active', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }
      
      if (!collaboratorId) {
        return res.status(400).json({ error: 'Colaborador não encontrado' });
      }

      const patients = await storage.getPatientsByCollaborator(collaboratorId);
      
      // Filtrar apenas pacientes ativos e incluir procedimentos
      const activePatients = patients.filter(p => p.status === 'active');
      
      res.json(activePatients);
    } catch (error) {
      console.error('Error fetching active patients:', error);
      res.status(500).json({ error: 'Erro ao buscar pacientes ativos' });
    }
  });

  // Completar consulta com resultado obrigatório
  app.patch('/api/events/:id/complete', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { completionType, notes, closedProcedureTemplateId } = req.body;
      
      if (!completionType) {
        return res.status(400).json({ message: 'Completion type is required' });
      }

      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      // Get the event
      const event = await storage.getEvent(id);
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Update event status
      const updatedEvent = await storage.updateEvent(id, {
        status: 'completed',
        completionNotes: notes,
        completedAt: new Date()
      });

      // Update patient follow-up status based on completion type
      if (event.patientId) {
        let followupStatus = 'active';
        
        switch (completionType) {
          case 'procedure_closed':
            followupStatus = 'procedure_closed';
            
            // If a procedure template was selected, create the procedure
            if (closedProcedureTemplateId) {
              const template = await storage.getProcedureTemplate(closedProcedureTemplateId);
              if (template) {
                await storage.createProcedure({
                  name: template.name,
                  description: template.description,
                  value: template.defaultPrice,
                  patientId: event.patientId,
                  collaboratorId: collaboratorId!,
                  performedDate: new Date(),
                  status: 'completed',
                  validUntil: new Date(Date.now() + (template.validityDays * 24 * 60 * 60 * 1000))
                });
              }
            }
            break;
          case 'no_closure':
            followupStatus = 'no_closure';
            break;
          case 'missed':
            followupStatus = 'missed';
            break;
        }

        await storage.updatePatient(event.patientId, { 
          followupStatus,
          lastConsultationDate: new Date()
        });
      }

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'consultation_completed',
        description: `Completed consultation: ${completionType}`,
        entityId: id,
        entityType: 'event',
      });

      res.json({ event: updatedEvent, completionType });
    } catch (error) {
      console.error('Error completing consultation:', error);
      res.status(500).json({ message: 'Failed to complete consultation' });
    }
  });

  // Buscar pacientes sem fechamento
  app.get('/api/patients/no-closure', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      const patients = await storage.getPatientsByFollowupStatus('no_closure', collaboratorId);
      res.json(patients);
    } catch (error) {
      console.error('Error fetching patients with no closure:', error);
      res.status(500).json({ error: 'Erro ao buscar pacientes sem fechamento' });
    }
  });

  // Buscar pacientes desistentes
  app.get('/api/patients/missed', requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      const patients = await storage.getPatientsByFollowupStatus('missed', collaboratorId);
      res.json(patients);
    } catch (error) {
      console.error('Error fetching missed patients:', error);
      res.status(500).json({ error: 'Erro ao buscar pacientes desistentes' });
    }
  });

  // Events routes
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      const { startDate, endDate } = req.query;
      const events = await storage.getEvents(
        collaboratorId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/upcoming", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      const { limit } = req.query;
      const events = await storage.getUpcomingEvents(
        collaboratorId,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming events" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const result = insertEventSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid event data", errors: result.error.issues });
      }

      const event = await storage.createEvent(result.data);

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'event_created',
        description: `Created event: ${event.title}`,
        entityId: event.id,
        entityType: 'event',
      });

      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  const updateEventHandler = async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const event = await storage.updateEvent(id, req.body);

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'event_updated',
        description: `Updated event: ${event.title}`,
        entityId: event.id,
        entityType: 'event',
      });

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to update event" });
    }
  };

  app.put("/api/events/:id", requireAuth, updateEventHandler);

  // Dashboard routes
  app.get("/api/dashboard/metrics", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      let collaboratorId: string | undefined;

      if (user?.role === 'collaborator') {
        const collaborator = await storage.getCollaboratorByUserId(user.id);
        collaboratorId = collaborator?.id;
      }

      const metrics = await storage.getDashboardMetrics(collaboratorId);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/dashboard/activity", requireAuth, async (req, res) => {
    try {
      const { limit } = req.query;
      const activities = await storage.getRecentActivity(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Collaborator performance and metrics routes
  app.get("/api/collaborators/user/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const collaborator = await storage.getCollaboratorByUserId(userId);
      
      if (!collaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }
      
      res.json(collaborator);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborator" });
    }
  });

  app.get("/api/collaborators/:id/metrics", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const metrics = await storage.getCollaboratorMetrics(id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborator metrics" });
    }
  });

  app.get("/api/events/collaborator/:collaboratorId", requireAuth, async (req, res) => {
    try {
      const { collaboratorId } = req.params;
      const events = await storage.getEvents(collaboratorId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborator events" });
    }
  });

  app.get("/api/collaborators/:id/metrics", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get basic metrics for the collaborator
      const metrics = {
        currentRevenue: "0.00",
        currentConsultations: "0",
        activePatients: 0,
        completedProcedures: 0,
        pendingFollowups: 0,
        conversionRate: 0
      };
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collaborator metrics" });
    }
  });

  app.get("/api/collaborators/performance", requireAdmin, async (req, res) => {
    try {
      const collaborators = await storage.getCollaborators();
      
      // Add performance data to each collaborator
      const performanceData = collaborators.map(collaborator => ({
        ...collaborator,
        currentRevenue: "0.00",
        currentConsultations: 0,
        activePatients: 0
      }));
      
      res.json(performanceData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.get("/api/metrics/overview", requireAdmin, async (req, res) => {
    try {
      const metrics = {
        activeCollaborators: 0,
        totalRevenue: "0.00",
        totalConsultations: 0,
        overallGoalProgress: 0
      };
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch overview metrics" });
    }
  });

  // Patient update endpoint with PATCH method
  app.patch("/api/patients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log('Patching patient:', id, 'with updates:', updates);
      const patient = await storage.updatePatient(id, updates);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_updated',
        description: `Updated patient: ${patient.name}`,
        entityId: patient.id,
        entityType: 'patient',
      });

      res.json(patient);
    } catch (error) {
      console.error('Error patching patient:', error);
      res.status(500).json({ message: "Failed to update patient", error: (error as Error).message });
    }
  });

  // Patient notes endpoints
  app.get("/api/patients/:id/notes", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const notes = await storage.getPatientNotes(id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient notes" });
    }
  });

  app.post("/api/patients/:id/notes", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const noteData = { ...req.body, patientId: id };
      
      const note = await storage.createPatientNote(noteData);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_note_created',
        description: `Added note to patient`,
        entityId: id,
        entityType: 'patient',
      });

      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to create patient note" });
    }
  });

  app.post("/api/patients/:id/photo", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      // For now, we'll just store a placeholder URL
      // In production, you'd integrate with a file storage service
      const photoUrl = `/uploads/patients/${id}.jpg`;
      
      const patient = await storage.updatePatient(id, { photo: photoUrl });
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_photo_updated',
        description: `Updated patient photo`,
        entityId: id,
        entityType: 'patient',
      });

      res.json({ photo: photoUrl });
    } catch (error) {
      res.status(500).json({ message: "Failed to update patient photo" });
    }
  });

  app.post("/api/patients/:id/files", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      
      // For now, we'll create a note with file reference
      // In production, you'd integrate with a file storage service
      const noteData = {
        patientId: id,
        content: "Arquivo anexado ao prontuário",
        type: 'file',
        title: title || "Arquivo anexado",
      };
      
      const note = await storage.createPatientNote(noteData);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_file_uploaded',
        description: `Uploaded file to patient`,
        entityId: id,
        entityType: 'patient',
      });

      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // City management endpoints
  app.put("/api/cities/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const city = await storage.updateCity(id, updates);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'city_updated',
        description: `Updated city: ${city.name}`,
        entityId: city.id,
        entityType: 'city',
      });

      res.json(city);
    } catch (error) {
      res.status(500).json({ message: "Failed to update city" });
    }
  });

  app.delete("/api/cities/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      await storage.deleteCity(id);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'city_deleted',
        description: `Deleted city`,
        entityId: id,
        entityType: 'city',
      });

      res.json({ message: "City deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete city" });
    }
  });

  app.get("/api/cities/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getCityMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch city metrics" });
    }
  });

  // Procedure Template endpoints
  app.get("/api/procedure-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getProcedureTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch procedure templates" });
    }
  });

  app.post("/api/procedure-templates", requireAdmin, async (req, res) => {
    try {
      const template = await storage.createProcedureTemplate(req.body);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'procedure_template_created',
        description: `Created procedure template: ${template.name}`,
        entityId: template.id,
        entityType: 'procedure_template',
      });

      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to create procedure template" });
    }
  });

  app.put("/api/procedure-templates/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateProcedureTemplate(id, req.body);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'procedure_template_updated',
        description: `Updated procedure template: ${template.name}`,
        entityId: template.id,
        entityType: 'procedure_template',
      });

      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to update procedure template" });
    }
  });

  app.delete("/api/procedure-templates/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteProcedureTemplate(id);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'procedure_template_deleted',
        description: `Deleted procedure template`,
        entityId: id,
        entityType: 'procedure_template',
      });

      res.json({ message: "Procedure template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete procedure template" });
    }
  });

  // Rotas para desativação de pacientes
  app.put("/api/patients/:id/deactivate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params as { id: string };
      const { reason } = req.body as { reason: string };

      if (!reason || reason.trim() === '') {
        return res.status(400).json({ message: "Justificativa é obrigatória para desativar paciente" });
      }

      const collaborator = await storage.getCollaboratorByUserId(req.session.userId!);
      if (!collaborator) {
        return res.status(400).json({ message: "Colaborador não encontrado" });
      }

      const patient = await storage.updatePatient(id, {
        status: 'deactivated',
        deactivatedAt: new Date(),
        deactivationReason: reason,
        deactivatedBy: collaborator.id,
      });

      await storage.createPatientNote({
        patientId: id,
        content: reason,
        type: 'status',
        title: 'Paciente desativado',
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_deactivated',
        description: `Deactivated patient: ${patient.name}. Reason: ${reason}`,
        entityId: patient.id as string,
        entityType: 'patient',
      });

      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate patient" });
    }
  });

  app.put("/api/patients/:id/reactivate", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const patient = await storage.updatePatient(id, {
        status: 'active',
        deactivatedAt: null,
        deactivationReason: reason ? `Reativado: ${reason}` : null,
        deactivatedBy: null,
      });

      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_reactivated',
        description: `Reactivated patient: ${patient.name}`,
        entityId: patient.id,
        entityType: 'patient',
      });

      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to reactivate patient" });
    }
  });

  // Buscar pacientes desativados
  app.get("/api/patients/deactivated", requireAuth, async (req, res) => {
    try {
      const patients = await storage.getDeactivatedPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch deactivated patients" });
    }
  });

  // ========== ADMIN TASKS ROUTES ==========

  // Get admin tasks
  app.get("/api/admin/tasks", requireAdmin, async (req, res) => {
    try {
      const { assignedTo, status } = req.query;
      const tasks = await storage.getAdminTasks(
        assignedTo as string | undefined,
        status as string | undefined
      );
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching admin tasks:", error);
      res.status(500).json({ message: "Failed to fetch admin tasks" });
    }
  });

  // Create admin task
  app.post("/api/admin/tasks", requireAdmin, async (req, res) => {
    try {
      const { title, description, assignedTo, priority, dueDate, patientId, category, isRecurring, recurringPattern } = req.body;

      if (!title || !assignedTo) {
        return res.status(400).json({ message: "Title and assignedTo are required" });
      }

      const taskData = {
        title,
        description,
        assignedTo,
        assignedBy: req.session.userId!,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        patientId,
        category: category || 'general',
        isRecurring: isRecurring || false,
        recurringPattern
      };

      const task = await storage.createAdminTask(taskData);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'admin_task_created',
        description: `Created admin task: ${task.title}`,
        entityId: task.id,
        entityType: 'admin_task',
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating admin task:", error);
      res.status(500).json({ message: "Failed to create admin task" });
    }
  });

  // Update admin task
  app.patch("/api/admin/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { status, completionNotes } = req.body;
      
      const updateData: any = {};
      if (status) updateData.status = status;
      if (completionNotes) updateData.completionNotes = completionNotes;
      if (status === 'completed') updateData.completedAt = new Date();

      const task = await storage.updateAdminTask(req.params.id, updateData);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'admin_task_updated',
        description: `Updated admin task: ${task.title}`,
        entityId: task.id,
        entityType: 'admin_task',
      });

      res.json(task);
    } catch (error) {
      console.error("Error updating admin task:", error);
      res.status(500).json({ message: "Failed to update admin task" });
    }
  });

  // Get collaborator pending tasks
  app.get("/api/collaborators/:id/tasks/pending", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getCollaboratorPendingTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching collaborator pending tasks:", error);
      res.status(500).json({ message: "Failed to fetch pending tasks" });
    }
  });

  // ========== PERFORMANCE METRICS ROUTES ==========

  // Get performance metrics
  app.get("/api/admin/metrics", requireAdmin, async (req, res) => {
    try {
      const { collaboratorId, startDate, endDate } = req.query;
      const metrics = await storage.getPerformanceMetrics(
        collaboratorId as string | undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Get collaborator dashboard stats
  app.get("/api/collaborators/:id/dashboard", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getCollaboratorDashboardStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching collaborator dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // ========== GLOBAL STATISTICS ROUTES ==========

  // Get global company statistics
  app.get("/api/admin/global-stats", requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await storage.getGlobalStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(stats);
    } catch (error) {
      console.error("Error fetching global statistics:", error);
      res.status(500).json({ message: "Failed to fetch global statistics" });
    }
  });

  // Get stalled patients
  app.get("/api/admin/stalled-patients", requireAdmin, async (req, res) => {
    try {
      const stalledPatients = await storage.getStalledPatients();
      res.json(stalledPatients);
    } catch (error) {
      console.error("Error fetching stalled patients:", error);
      res.status(500).json({ message: "Failed to fetch stalled patients" });
    }
  });

  // ========== PATIENT PROGRESS ROUTES ==========

  // Create patient progress entry
  app.post("/api/patient-progress", requireAuth, async (req, res) => {
    try {
      const { patientId, progressType, description, statusBefore, statusAfter, daysSinceLastContact, isStalled, stallReason, nextAction, nextActionDate } = req.body;

      if (!patientId || !progressType || !description) {
        return res.status(400).json({ message: "Patient ID, progress type and description are required" });
      }

      // Get collaborator ID from user session (already validated by requireAuth)
      const collaborator = await storage.getCollaboratorByUserId(req.session.userId!);
      if (!collaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }

      const progressData = {
        patientId,
        collaboratorId: collaborator.id,
        progressType,
        description,
        statusBefore,
        statusAfter,
        daysSinceLastContact,
        isStalled: isStalled || false,
        stallReason,
        nextAction,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : undefined
      };

      const progress = await storage.createPatientProgress(progressData);
      
      await storage.createActivityLog({
        userId: req.session.userId!,
        type: 'patient_progress_created',
        description: `Added progress for patient: ${description}`,
        entityId: patientId,
        entityType: 'patient',
      });

      res.status(201).json(progress);
    } catch (error) {
      console.error("Error creating patient progress:", error);
      res.status(500).json({ message: "Failed to create patient progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

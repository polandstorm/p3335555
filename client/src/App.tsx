
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Patients from "@/pages/patients";
import PatientDetails from "@/pages/patient-details";
import Cities from "@/pages/cities";
import Collaborators from "@/pages/collaborators";
import CollaboratorProfile from "@/pages/collaborator-profile";
import CollaboratorDashboard from "@/pages/collaborator-dashboard";
import Procedures from "@/pages/procedures";
import Events from "@/pages/events";
import DeactivatedPatients from "@/pages/deactivated-patients";
import PendingRegistrations from "@/pages/pending-registrations";
import PatientsNoClosure from "@/pages/patients-no-closure";
import PatientsMissed from "@/pages/patients-missed";
import CollaboratorDetails from "@/pages/collaborator-details";
import MyPatients from "@/pages/my-patients";
import MySchedule from "@/pages/my-schedule";
import MyGoals from "@/pages/my-goals";
import Monitoring from "@/pages/monitoring";
import AdminDashboard from "@/pages/admin-dashboard";
import ProtectedRoute from "@/components/protected-route";
import Header from "@/components/layout/header";
import AppSidebar from "@/components/layout/sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 flex flex-col p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        <ProtectedRoute>
          <AppLayout>
            <Dashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Admin Dashboard */}
      <Route path="/admin-dashboard">
        <ProtectedRoute>
          <AppLayout>
            <AdminDashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Collaborator Dashboard */}
      <Route path="/collaborator-dashboard">
        <ProtectedRoute>
          <AppLayout>
            <CollaboratorDashboard />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Patient Management */}
      <Route path="/patients">
        <ProtectedRoute>
          <AppLayout>
            <Patients />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/patients/:id">
        <ProtectedRoute>
          <AppLayout>
            <PatientDetails />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/deactivated-patients">
        <ProtectedRoute>
          <AppLayout>
            <DeactivatedPatients />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/patients-no-closure">
        <ProtectedRoute>
          <AppLayout>
            <PatientsNoClosure />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/patients-missed">
        <ProtectedRoute>
          <AppLayout>
            <PatientsMissed />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Collaborator Management */}
      <Route path="/collaborators">
        <ProtectedRoute>
          <AppLayout>
            <Collaborators />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/collaborators/:id">
        <ProtectedRoute>
          <AppLayout>
            <CollaboratorDetails />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/collaborator-profile">
        <ProtectedRoute>
          <AppLayout>
            <CollaboratorProfile />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Collaborator Area */}
      <Route path="/my-schedule">
        <ProtectedRoute>
          <AppLayout>
            <MySchedule />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/my-patients">
        <ProtectedRoute>
          <AppLayout>
            <MyPatients />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/my-goals">
        <ProtectedRoute>
          <AppLayout>
            <MyGoals />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Data Management */}
      <Route path="/procedures">
        <ProtectedRoute>
          <AppLayout>
            <Procedures />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/events">
        <ProtectedRoute>
          <AppLayout>
            <Events />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/cities">
        <ProtectedRoute>
          <AppLayout>
            <Cities />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Shared Routes */}
      <Route path="/pending">
        <ProtectedRoute>
          <AppLayout>
            <PendingRegistrations />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/monitoring">
        <ProtectedRoute>
          <AppLayout>
            <Monitoring />
          </AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import KPISection from "@/components/dashboard/kpi-section";
import RecentPatients from "@/components/dashboard/recent-patients";
import QuickActions from "@/components/dashboard/quick-actions";
import CollaboratorPerformance from "@/components/dashboard/collaborator-performance";
import RecentActivity from "@/components/dashboard/recent-activity";
import UpcomingEvents from "@/components/dashboard/upcoming-events";
import { useAuth } from "@/hooks/use-auth";

export default function Dashboard() {
  const { authState } = useAuth();

  if (authState.user?.role !== 'admin') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
            <p className="text-gray-600 mt-2">Apenas administradores podem acessar esta página.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />

      <main className="flex-1 ml-64">
        <Header
          title="Dashboard"
          description="Visão geral do sistema de pós-venda"
          showAddPatient={true}
        />

        <div className="p-8">
          <KPISection />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <RecentPatients />
            </div>

            <div className="space-y-6">
              <QuickActions />
              <CollaboratorPerformance />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            <RecentActivity />
            <UpcomingEvents />
          </div>
        </div>
      </main>
    </div>
  );
}

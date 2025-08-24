import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function CollaboratorPerformance() {
  const { data: collaborators, isLoading } = useQuery({
    queryKey: ["/api/collaborators"],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  // Mock progress calculation - in real app, would come from metrics
  const calculateProgress = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const topCollaborators = collaborators?.slice(0, 3) || [];

  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Performance Colaboradores
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-300 rounded-full w-8 h-8"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-gray-300 rounded w-20 mb-1"></div>
                    <div className="h-2 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : topCollaborators.length > 0 ? (
          <div className="space-y-4">
            {topCollaborators.map((collaborator, index) => {
              const colors = ["green", "blue", "purple"];
              const color = colors[index % colors.length];
              const mockRevenue = 25000 + (index * 3500); // Mock current revenue
              const goalProgress = calculateProgress(mockRevenue, parseFloat(collaborator.revenueGoal));

              return (
                <div key={collaborator.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`bg-${color}-100 rounded-full w-8 h-8 flex items-center justify-center`}>
                      <Users className={`text-${color}-600 w-4 h-4`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{collaborator.user.name}</p>
                      <p className="text-xs text-gray-500">{collaborator.city.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(mockRevenue)}
                    </p>
                    <Progress value={goalProgress} className="w-16 h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum colaborador encontrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

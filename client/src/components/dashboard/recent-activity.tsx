import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Calendar, Mail, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["/api/dashboard/activity"],
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "procedure_created":
      case "procedure_completed":
        return { icon: Check, color: "green" };
      case "event_created":
        return { icon: Calendar, color: "blue" };
      case "followup_sent":
        return { icon: Mail, color: "purple" };
      case "patient_created":
        return { icon: UserPlus, color: "orange" };
      default:
        return { icon: Check, color: "gray" };
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Atividade Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="bg-gray-300 rounded-full w-6 h-6 mt-1"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const { icon: Icon, color } = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`bg-${color}-100 rounded-full p-1 mt-1`}>
                    <Icon className={`text-${color}-600 w-3 h-3`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhuma atividade recente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RecentPatients() {
  const { data: patients, isLoading } = useQuery<any[]>({
    queryKey: ["/api/patients"],
  });

  const getClassificationColor = (classification?: string) => {
    switch (classification) {
      case "bronze":
        return "classification-bronze";
      case "silver":
        return "classification-silver";
      case "gold":
        return "classification-gold";
      case "diamond":
        return "classification-diamond";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case "Ativo":
        return "default";
      case "Follow-up":
        return "secondary";
      case "Retorno":
        return "outline";
      default:
        return "default";
    }
  };

  const recentPatients = Array.isArray(patients) ? patients.slice(0, 5) : [];

  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Pacientes Recentes
          </CardTitle>
          <Link href="/patients" className="text-primary hover:text-primary-dark font-medium text-sm">
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-3 h-3 bg-gray-300 rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentPatients.length > 0 ? (
          <div className="space-y-4">
            {recentPatients.map((patient) => (
              <Link href={`/patients/${patient.id}`} key={patient.id}>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`${getClassificationColor(
                        patient.classification
                      )} rounded-lg w-3 h-3`}
                    ></div>
                    <div>
                      <p className="font-medium text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-500">
                        {patient.city?.name || "Cidade não definida"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {patient.procedures?.[0]?.name || "Nenhum procedimento"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {patient.lastConsultationDate
                        ? formatDistanceToNow(new Date(patient.lastConsultationDate), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "Data não informada"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusVariant(patient.currentStatus)}>
                      {patient.currentStatus || "Indefinido"}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum paciente cadastrado ainda</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Users, ClipboardCheck, Clock, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function KPISection() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const kpis = [
    {
      title: "Total de Pacientes",
      value: isLoading ? "..." : formatNumber(metrics?.totalPatients || 0),
      icon: Users,
      bgColor: "bg-blue-100",
      iconColor: "text-primary",
      change: "+12%",
      changeText: "vs mês anterior",
    },
    {
      title: "Procedimentos Ativos",
      value: isLoading ? "..." : formatNumber(metrics?.activeProcedures || 0),
      icon: ClipboardCheck,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      change: "+8%",
      changeText: "vs mês anterior",
    },
    {
      title: "Follow-ups Pendentes",
      value: isLoading ? "..." : formatNumber(metrics?.pendingFollowups || 0),
      icon: Clock,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      change: "Requer atenção",
      changeText: "",
      isWarning: true,
    },
    {
      title: "Faturamento Mensal",
      value: isLoading ? "..." : formatCurrency(metrics?.monthlyRevenue || 0),
      icon: TrendingUp,
      bgColor: "bg-emerald-100",
      iconColor: "text-emerald-600",
      change: "+18%",
      changeText: "vs mês anterior",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpis.map((kpi, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
              </div>
              <div className={`${kpi.bgColor} rounded-lg p-3`}>
                <kpi.icon className={`${kpi.iconColor} text-xl w-6 h-6`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span
                className={`text-sm font-medium ${
                  kpi.isWarning ? "text-orange-600" : "text-green-600"
                }`}
              >
                {kpi.change}
              </span>
              {kpi.changeText && (
                <span className="text-gray-500 text-sm ml-2">{kpi.changeText}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

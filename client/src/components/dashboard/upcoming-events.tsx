import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Phone, ClipboardCheck, AlertTriangle } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

export default function UpcomingEvents() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events/upcoming"],
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case "consultation":
        return CalendarDays;
      case "followup":
        return Phone;
      case "procedure":
        return ClipboardCheck;
      default:
        return CalendarDays;
    }
  };

  const getEventColor = (type: string, scheduledDate: Date) => {
    if (isPast(scheduledDate)) {
      return { bg: "bg-red-50", border: "border-red-200", badge: "destructive" };
    }

    switch (type) {
      case "consultation":
        return { bg: "bg-blue-50", border: "border-blue-200", badge: "default" };
      case "followup":
        return { bg: "bg-purple-50", border: "border-purple-200", badge: "secondary" };
      case "procedure":
        return { bg: "bg-green-50", border: "border-green-200", badge: "outline" };
      default:
        return { bg: "bg-gray-50", border: "border-gray-200", badge: "outline" };
    }
  };

  const formatEventDate = (date: Date) => {
    if (isToday(date)) {
      return `Hoje às ${format(date, "HH:mm")}`;
    } else if (isTomorrow(date)) {
      return `Amanhã às ${format(date, "HH:mm")}`;
    } else if (isPast(date)) {
      return `Venceu ${format(date, "dd/MM 'às' HH:mm")}`;
    } else {
      return format(date, "EEEE 'às' HH:mm", { locale: ptBR });
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case "consultation":
        return "Consulta";
      case "followup":
        return "Follow-up";
      case "procedure":
        return "Procedimento";
      case "return":
        return "Retorno";
      default:
        return "Evento";
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Próximos Eventos
          </CardTitle>
          <Link href="/events">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
              Ver agenda
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-300 rounded-lg w-8 h-8"></div>
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
        ) : events && events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event) => {
              const scheduledDate = new Date(event.scheduledDate);
              const Icon = getEventIcon(event.type);
              const colors = getEventColor(event.type, scheduledDate);
              const isOverdue = isPast(scheduledDate);

              return (
                <div
                  key={event.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${isOverdue ? 'bg-red-600' : 'bg-primary'} rounded-lg p-2`}>
                      {isOverdue ? (
                        <AlertTriangle className="text-white w-4 h-4" />
                      ) : (
                        <Icon className="text-white w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {getEventTypeName(event.type)} - {event.patient.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatEventDate(scheduledDate)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isOverdue ? "destructive" : colors.badge}>
                    {isOverdue ? "Atrasado" : getEventTypeName(event.type)}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Nenhum evento próximo</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

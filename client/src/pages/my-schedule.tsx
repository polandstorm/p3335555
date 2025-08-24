import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Stethoscope, 
  AlertCircle,
  CheckCircle,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isToday, isTomorrow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

export default function MySchedule() {
  const { authState } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Check if user is collaborator
  if (authState.user?.role !== 'collaborator') {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
            <p className="text-gray-600 mt-2">Apenas colaboradores podem acessar esta página.</p>
          </div>
        </main>
      </div>
    );
  }

  // Get collaborator's events/appointments
  const { data: events, isLoading } = useQuery({
    queryKey: ["/api/events", "my-schedule", authState.collaborator?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/events?collaboratorId=${authState.collaborator?.id}`);
      return response.json();
    },
    enabled: !!authState.collaborator?.id,
  });

  // Get upcoming events (next 7 days)
  const { data: upcomingEvents } = useQuery({
    queryKey: ["/api/events", "upcoming", authState.collaborator?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/events/upcoming?collaboratorId=${authState.collaborator?.id}&limit=20`);
      return response.json();
    },
    enabled: !!authState.collaborator?.id,
  });

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'bg-blue-100 text-blue-800';
      case 'procedure': return 'bg-green-100 text-green-800';
      case 'followup': return 'bg-yellow-100 text-yellow-800';
      case 'return': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <Stethoscope className="h-4 w-4" />;
      case 'procedure': return <CheckCircle className="h-4 w-4" />;
      case 'followup': return <Clock className="h-4 w-4" />;
      case 'return': return <Calendar className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation': return 'Consulta';
      case 'procedure': return 'Procedimento';
      case 'followup': return 'Acompanhamento';
      case 'return': return 'Retorno';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'missed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getDateLabel = (date: string) => {
    const eventDate = parseISO(date);
    if (isToday(eventDate)) return 'Hoje';
    if (isTomorrow(eventDate)) return 'Amanhã';
    return format(eventDate, 'dd/MM/yyyy', { locale: ptBR });
  };

  // Group events by date
  const groupedEvents = upcomingEvents?.reduce((acc: any, event: any) => {
    const date = format(parseISO(event.scheduledDate), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {}) || {};

  // Today's events
  const todayEvents = groupedEvents[format(new Date(), 'yyyy-MM-dd')] || [];

  // This week's events
  const weekStart = startOfWeek(new Date(), { locale: ptBR });
  const weekEnd = endOfWeek(new Date(), { locale: ptBR });
  const weekEvents = upcomingEvents?.filter((event: any) => {
    const eventDate = parseISO(event.scheduledDate);
    return eventDate >= weekStart && eventDate <= weekEnd;
  }) || [];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="h-8 w-8" />
              Minha Agenda
            </h1>
            <p className="text-gray-600 mt-2">
              Acompanhe seus agendamentos, consultas e follow-ups.
            </p>
          </div>

          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today">Hoje</TabsTrigger>
              <TabsTrigger value="week">Esta Semana</TabsTrigger>
              <TabsTrigger value="upcoming">Próximos</TabsTrigger>
              <TabsTrigger value="calendar">Calendário</TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Agendamentos de Hoje</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <p className="text-center py-8">Carregando agendamentos...</p>
                      ) : todayEvents.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">Nenhum agendamento para hoje.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {todayEvents.map((event: any) => (
                            <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {getEventTypeIcon(event.type)}
                                    <Badge className={getEventTypeColor(event.type)}>
                                      {getEventTypeLabel(event.type)}
                                    </Badge>
                                    <Badge variant="outline" className={getStatusColor(event.status)}>
                                      {event.status}
                                    </Badge>
                                  </div>
                                  <h3 className="font-semibold text-lg">{event.title}</h3>
                                  <p className="text-gray-600 mb-2">{event.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(parseISO(event.scheduledDate), 'HH:mm')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {event.patient.name}
                                    </div>
                                    {event.patient.phone && (
                                      <div className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {event.patient.phone}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button variant="outline" size="sm">
                                  Ver Detalhes
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo de Hoje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{todayEvents.length}</div>
                        <div className="text-sm text-blue-600">Agendamentos</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {todayEvents.filter((e: any) => e.status === 'completed').length}
                        </div>
                        <div className="text-sm text-green-600">Concluídos</div>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {todayEvents.filter((e: any) => e.type === 'followup').length}
                        </div>
                        <div className="text-sm text-yellow-600">Follow-ups</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="week" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agendamentos da Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8">Carregando agendamentos...</p>
                  ) : weekEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Nenhum agendamento para esta semana.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedEvents).map(([date, dayEvents]: [string, any]) => {
                        const eventDate = parseISO(date);
                        if (eventDate < weekStart || eventDate > weekEnd) return null;
                        
                        return (
                          <div key={date}>
                            <h3 className="font-semibold text-lg mb-3 text-gray-900">
                              {format(eventDate, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                            </h3>
                            <div className="grid gap-3">
                              {dayEvents.map((event: any) => (
                                <div key={event.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge className={getEventTypeColor(event.type)}>
                                          {getEventTypeLabel(event.type)}
                                        </Badge>
                                        <span className="text-sm text-gray-500">
                                          {format(parseISO(event.scheduledDate), 'HH:mm')}
                                        </span>
                                      </div>
                                      <p className="font-medium">{event.title}</p>
                                      <p className="text-sm text-gray-600">{event.patient.name}</p>
                                    </div>
                                    <Badge variant="outline" className={getStatusColor(event.status)}>
                                      {event.status}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Próximos Agendamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <p className="text-center py-8">Carregando agendamentos...</p>
                  ) : !upcomingEvents || upcomingEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Nenhum agendamento próximo.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {upcomingEvents.map((event: any) => (
                        <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {getEventTypeIcon(event.type)}
                                <Badge className={getEventTypeColor(event.type)}>
                                  {getEventTypeLabel(event.type)}
                                </Badge>
                                <Badge variant="outline">
                                  {getDateLabel(event.scheduledDate)}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {format(parseISO(event.scheduledDate), 'HH:mm')}
                                </span>
                              </div>
                              <h3 className="font-semibold">{event.title}</h3>
                              <p className="text-gray-600 mb-2">{event.description}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {event.patient.name}
                                </div>
                                {event.patient.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {event.patient.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className={getStatusColor(event.status)}>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visualização de Calendário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Visualização de calendário será implementada em breve.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, PlusCircle, Mail, BarChart } from "lucide-react";
import { useState } from "react";
import AddPatientModal from "@/components/modals/add-patient-modal";
import AddProcedureModal from "@/components/modals/add-procedure-modal";
import ScheduleEventModal from "@/components/modals/schedule-event-modal";

export default function QuickActions() {
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isAddProcedureOpen, setIsAddProcedureOpen] = useState(false);
  const [isScheduleEventOpen, setIsScheduleEventOpen] = useState(false);

  const actions = [
    {
      name: "Agendar Consulta",
      icon: CalendarPlus,
      bgColor: "bg-blue-100",
      iconColor: "text-primary",
      action: () => setIsScheduleEventOpen(true),
    },
    {
      name: "Novo Procedimento",
      icon: PlusCircle,
      bgColor: "bg-green-100",
      iconColor: "text-green-600",
      action: () => setIsAddProcedureOpen(true),
    },
    {
      name: "Enviar Follow-up",
      icon: Mail,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600",
      action: () => console.log("Send follow-up"),
    },
    {
      name: "Gerar Relatório",
      icon: BarChart,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
      action: () => console.log("Generate report"),
    },
  ];

  return (
    <>
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start p-3 h-auto"
                onClick={action.action}
              >
                <div className={`${action.bgColor} rounded-lg p-2 mr-3`}>
                  <action.icon className={`${action.iconColor} w-4 h-4`} />
                </div>
                <span className="font-medium text-gray-700">{action.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => setIsAddPatientOpen(false)} 
      />
      <AddProcedureModal 
        isOpen={isAddProcedureOpen} 
        onClose={() => setIsAddProcedureOpen(false)} 
      />
      <ScheduleEventModal 
        isOpen={isScheduleEventOpen} 
        onClose={() => setIsScheduleEventOpen(false)} 
      />
    </>
  );
}

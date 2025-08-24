import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Phone, User, Calendar, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

export default function PatientsNoClosure() {
  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['/api/patients/no-closure'],
  });

  const getClassificationColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'diamond': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getClassificationIcon = (classification: string) => {
    const priority = {
      'diamond': 4, 'gold': 3, 'silver': 2, 'bronze': 1
    }[classification?.toLowerCase()] || 0;
    
    return Array.from({ length: priority }, (_, i) => (
      <Star key={i} className="h-3 w-3 fill-current" />
    ));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Pacientes sem Fechamento" 
          description="Pacientes que compareceram mas não fecharam procedimentos"
        />

        <div className="p-8">
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Estes pacientes compareceram às consultas mas não fecharam nenhum procedimento. 
              É importante fazer follow-up para entender os motivos e tentar reconverter.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span>Pacientes sem Fechamento</span>
                </CardTitle>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                  {patients.length} paciente(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando pacientes...</div>
              ) : patients.length > 0 ? (
                <div className="space-y-4">
                  {patients.map((patient: any) => (
                    <div key={patient.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium text-lg">{patient.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Phone className="h-3 w-3" />
                              <span>{patient.phone}</span>
                            </div>
                          </div>
                          <div className={`flex items-center space-x-1 ${getClassificationColor(patient.classification)} px-3 py-1 rounded-full`}>
                            {getClassificationIcon(patient.classification)}
                            <span className="font-medium text-xs">{patient.classification?.toUpperCase()}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge className="bg-yellow-100 text-yellow-800 mb-2">
                            Não fechou procedimento
                          </Badge>
                          {patient.updatedAt && (
                            <p className="text-xs text-gray-500">
                              Última atualização: {formatDistanceToNow(new Date(patient.updatedAt), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Informações do Colaborador */}
                      {patient.collaborator && (
                        <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
                          <User className="h-3 w-3" />
                          <span>Colaborador: {patient.collaborator.user.name}</span>
                          {patient.collaborator.city && (
                            <span className="text-gray-400">• {patient.collaborator.city.name}</span>
                          )}
                        </div>
                      )}

                      {/* Status Atual e Próximo Passo */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {patient.currentStatus && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">Status Atual</p>
                            <p className="text-sm bg-gray-50 p-2 rounded">{patient.currentStatus}</p>
                          </div>
                        )}
                        {patient.nextSteps && (
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">Próximos Passos</p>
                            <p className="text-sm bg-blue-50 p-2 rounded">{patient.nextSteps}</p>
                          </div>
                        )}
                      </div>

                      {/* Última Consulta */}
                      {patient.lastConsultationDate && (
                        <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Última consulta: {formatDistanceToNow(new Date(patient.lastConsultationDate), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex justify-end space-x-2">
                        <Link href={`/patients/${patient.id}`}>
                          <Button size="sm" variant="outline">
                            Ver Detalhes
                          </Button>
                        </Link>
                        <Button size="sm">
                          Fazer Follow-up
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum paciente sem fechamento encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Todos os pacientes que compareceram às consultas fecharam procedimentos
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
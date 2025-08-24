import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Users, Target, Edit2, Trash2 } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

interface City {
  id: string;
  name: string;
  state: string;
  description?: string;
  monthlyGoal?: string;
  quarterlyGoal?: string;
  yearlyGoal?: string;
  createdAt: string;
}

export default function Cities() {
  const [isAddCityOpen, setIsAddCityOpen] = useState(false);
  const [isEditCityOpen, setIsEditCityOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [cityData, setCityData] = useState({
    name: "",
    state: "",
    description: "",
    monthlyGoal: "",
    quarterlyGoal: "",
    yearlyGoal: "",
  });
  const queryClient = useQueryClient();

  const { data: cities, isLoading } = useQuery<any[]>({
    queryKey: ['/api/cities'],
  });

  const { data: cityMetrics } = useQuery<any[]>({
    queryKey: ['/api/cities/metrics'],
  });

  const createCityMutation = useMutation({
    mutationFn: (cityData: any) => apiRequest('POST', '/api/cities', cityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cities'] });
      setIsAddCityOpen(false);
      resetCityData();
    },
  });

  const updateCityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest('PUT', `/api/cities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cities'] });
      setIsEditCityOpen(false);
      setEditingCity(null);
      resetCityData();
    },
  });

  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/cities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cities'] });
    },
  });

  const resetCityData = () => {
    setCityData({
      name: "",
      state: "",
      description: "",
      monthlyGoal: "",
      quarterlyGoal: "",
      yearlyGoal: "",
    });
  };

  const handleCreateCity = () => {
    createCityMutation.mutate(cityData);
  };

  const handleUpdateCity = () => {
    if (editingCity) {
      updateCityMutation.mutate({ id: editingCity.id, data: cityData });
    }
  };

  const openEditCity = (city: City) => {
    setEditingCity(city);
    setCityData({
      name: city.name,
      state: city.state,
      description: city.description || "",
      monthlyGoal: city.monthlyGoal || "",
      quarterlyGoal: city.quarterlyGoal || "",
      yearlyGoal: city.yearlyGoal || "",
    });
    setIsEditCityOpen(true);
  };

  const handleDeleteCity = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta cidade?')) {
      deleteCityMutation.mutate(id, {
        onError: (error: any) => {
          console.error('Delete city error:', error);
          alert(error.response?.data?.message || 'Erro ao excluir cidade');
        }
      });
    }
  };

  const getCityStats = (cityId: string) => {
    return Array.isArray(cityMetrics) ? cityMetrics.find((metric: any) => metric.cityId === cityId) || {
      totalPatients: 0,
      totalCollaborators: 0,
      monthlyRevenue: 0,
      goalProgress: 0,
    } : {
      totalPatients: 0,
      totalCollaborators: 0,
      monthlyRevenue: 0,
      goalProgress: 0,
    };
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header 
          title="Gerenciar Cidades" 
          description="Configure cidades, metas e monitore o desempenho por região"
        />

        <div className="p-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Cidades</p>
                    <p className="text-2xl font-bold">{Array.isArray(cities) ? cities.length : 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total de Pacientes</p>
                    <p className="text-2xl font-bold">
                      {cityMetrics?.reduce((sum: number, metric: any) => sum + metric.totalPatients, 0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Meta Mensal Total</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        cities?.reduce((sum: number, city: City) => 
                          sum + (parseFloat(city.monthlyGoal || '0')), 0) || 0
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-gradient-to-r from-green-400 to-blue-500 rounded" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Progresso Médio</p>
                    <p className="text-2xl font-bold">
                      {cityMetrics?.length > 0 
                        ? Math.round(cityMetrics.reduce((sum: number, metric: any) => sum + metric.goalProgress, 0) / cityMetrics.length)
                        : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cities List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">Cidades Cadastradas</CardTitle>
                <Dialog open={isAddCityOpen} onOpenChange={setIsAddCityOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Cidade
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar Nova Cidade</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nome da Cidade</Label>
                          <Input
                            value={cityData.name}
                            onChange={(e) => setCityData({ ...cityData, name: e.target.value })}
                            placeholder="Ex: São Paulo"
                          />
                        </div>
                        <div>
                          <Label>Estado (UF)</Label>
                          <Input
                            value={cityData.state}
                            onChange={(e) => setCityData({ ...cityData, state: e.target.value.toUpperCase() })}
                            placeholder="Ex: SP"
                            maxLength={2}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label>Descrição (Opcional)</Label>
                        <Textarea
                          value={cityData.description}
                          onChange={(e) => setCityData({ ...cityData, description: e.target.value })}
                          placeholder="Informações adicionais sobre a cidade..."
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">Metas Financeiras</Label>
                        <div>
                          <Label className="text-xs">Meta Mensal (R$)</Label>
                          <Input
                            type="number"
                            value={cityData.monthlyGoal}
                            onChange={(e) => setCityData({ ...cityData, monthlyGoal: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Meta Trimestral (R$)</Label>
                          <Input
                            type="number"
                            value={cityData.quarterlyGoal}
                            onChange={(e) => setCityData({ ...cityData, quarterlyGoal: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Meta Anual (R$)</Label>
                          <Input
                            type="number"
                            value={cityData.yearlyGoal}
                            onChange={(e) => setCityData({ ...cityData, yearlyGoal: e.target.value })}
                            placeholder="0.00"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={handleCreateCity} 
                        disabled={!cityData.name || !cityData.state || createCityMutation.isPending}
                        className="w-full"
                      >
                        {createCityMutation.isPending ? 'Criando...' : 'Criar Cidade'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Carregando cidades...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.isArray(cities) ? cities.map((city: City) => {
                    const stats = getCityStats(city.id);
                    return (
                      <Card key={city.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{city.name}</h3>
                              <Badge variant="outline" className="text-xs">{city.state}</Badge>
                            </div>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditCity(city)}>
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteCity(city.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {city.description && (
                            <p className="text-sm text-gray-600 mt-2">{city.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Pacientes:</span>
                              <span className="font-medium ml-1">{stats.totalPatients}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Colaboradores:</span>
                              <span className="font-medium ml-1">{stats.totalCollaborators}</span>
                            </div>
                          </div>
                          
                          {city.monthlyGoal && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Meta Mensal</span>
                                <span className="font-medium">{formatCurrency(parseFloat(city.monthlyGoal))}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${Math.min(stats.goalProgress, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {stats.goalProgress}% do objetivo
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit City Dialog */}
          <Dialog open={isEditCityOpen} onOpenChange={setIsEditCityOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Cidade</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Cidade</Label>
                    <Input
                      value={cityData.name}
                      onChange={(e) => setCityData({ ...cityData, name: e.target.value })}
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <div>
                    <Label>Estado (UF)</Label>
                    <Input
                      value={cityData.state}
                      onChange={(e) => setCityData({ ...cityData, state: e.target.value.toUpperCase() })}
                      placeholder="Ex: SP"
                      maxLength={2}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Descrição (Opcional)</Label>
                  <Textarea
                    value={cityData.description}
                    onChange={(e) => setCityData({ ...cityData, description: e.target.value })}
                    placeholder="Informações adicionais sobre a cidade..."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Metas Financeiras</Label>
                  <div>
                    <Label className="text-xs">Meta Mensal (R$)</Label>
                    <Input
                      type="number"
                      value={cityData.monthlyGoal}
                      onChange={(e) => setCityData({ ...cityData, monthlyGoal: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Meta Trimestral (R$)</Label>
                    <Input
                      type="number"
                      value={cityData.quarterlyGoal}
                      onChange={(e) => setCityData({ ...cityData, quarterlyGoal: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Meta Anual (R$)</Label>
                    <Input
                      type="number"
                      value={cityData.yearlyGoal}
                      onChange={(e) => setCityData({ ...cityData, yearlyGoal: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpdateCity} 
                  disabled={!cityData.name || !cityData.state || updateCityMutation.isPending}
                  className="w-full"
                >
                  {updateCityMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
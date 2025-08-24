
import { Bell, Search, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface HeaderProps {
  title?: string;
  description?: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { authState, logout } = useAuth();
  const [location] = useLocation();

  // Get notifications/pending items count
  const { data: pendingPatients = [] } = useQuery({
    queryKey: ["/api/patients/incomplete"],
    enabled: !!authState.user,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ["/api/events/upcoming"],
    enabled: !!authState.user,
  });

  const notificationCount = pendingPatients.length + upcomingEvents.length;

  const getBreadcrumbs = () => {
    const pathSegments = location.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Início', href: '/' }];

    const pathMap: Record<string, string> = {
      'admin-dashboard': 'Dashboard Admin',
      'collaborator-dashboard': 'Dashboard Colaborador',
      'patients': 'Pacientes',
      'collaborators': 'Colaboradores',
      'cities': 'Cidades',
      'procedures': 'Procedimentos',
      'events': 'Eventos',
      'deactivated-patients': 'Pacientes Desativados',
      'pending': 'Cadastros Pendentes',
      'patients-no-closure': 'Sem Fechamento',
      'patients-missed': 'Desistentes',
      'monitoring': 'Monitoramento',
      'collaborator-profile': 'Meu Perfil',
      'my-schedule': 'Minha Agenda',
      'my-patients': 'Meus Pacientes',
      'my-goals': 'Minhas Metas',
    };

    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const name = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({ name, href: path });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((breadcrumb, index) => (
              <BreadcrumbItem key={breadcrumb.href}>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {breadcrumb.name}
                  </BreadcrumbPage>
                ) : (
                  <>
                    <BreadcrumbLink href={breadcrumb.href} className="transition-colors hover:text-foreground">
                      {breadcrumb.name}
                    </BreadcrumbLink>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </>
                )}
              </BreadcrumbItem>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2 px-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-64 pl-8 bg-background"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -right-1 -top-1 h-5 w-5 p-0 text-xs"
            >
              {notificationCount}
            </Badge>
          )}
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {authState.user?.name || authState.user?.username}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {authState.user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

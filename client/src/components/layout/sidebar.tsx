
import { 
  Home, Users, UserCheck, Calendar, FileText, 
  MapPin, Settings, LogOut, Star, UserX, 
  AlertTriangle, CheckCircle, Clock, User,
  BarChart3, Target, TrendingUp, Activity,
  Stethoscope, Building2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarRail
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

export default function AppSidebar() {
  const [location] = useLocation();
  const { authState, logout } = useAuth();

  // Fetch pending registrations count
  const { data: pendingPatients = [] } = useQuery({
    queryKey: ["/api/patients/incomplete"],
    enabled: !!authState.user,
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const pendingCount = pendingPatients.length;

  // Admin menu items
  const adminMenuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
      href: "/admin-dashboard",
    },
    {
      title: "Gestão de Dados",
      icon: Settings,
      items: [
        { title: "Pacientes", href: "/patients", icon: Users },
        { title: "Colaboradores", href: "/collaborators", icon: UserCheck },
        { title: "Cidades", href: "/cities", icon: MapPin },
        { title: "Procedimentos", href: "/procedures", icon: Stethoscope },
      ]
    },
    {
      title: "Acompanhamento",
      icon: Activity,
      items: [
        { 
          title: "Cadastros Pendentes", 
          href: "/pending", 
          icon: Clock,
          badge: pendingCount > 0 ? pendingCount : undefined 
        },
        { title: "Pacientes Desativados", href: "/deactivated-patients", icon: UserX },
        { title: "Sem Fechamento", href: "/patients-no-closure", icon: AlertTriangle },
        { title: "Desistentes", href: "/patients-missed", icon: UserX },
      ]
    },
    {
      title: "Monitoramento",
      icon: TrendingUp,
      href: "/monitoring",
    }
  ];

  // Collaborator menu items
  const collaboratorMenuItems = [
    {
      title: "Dashboard",
      icon: Home,
      href: "/collaborator-dashboard",
    },
    {
      title: "Minha Área",
      icon: User,
      items: [
        { title: "Meu Perfil", href: "/collaborator-profile", icon: User },
        { title: "Minha Agenda", href: "/my-schedule", icon: Calendar },
        { title: "Meus Pacientes", href: "/my-patients", icon: Users },
        { title: "Minhas Metas", href: "/my-goals", icon: Target },
      ]
    },
    {
      title: "Acompanhamento",
      icon: Activity,
      items: [
        { 
          title: "Cadastros Pendentes", 
          href: "/pending", 
          icon: Clock,
          badge: pendingCount > 0 ? pendingCount : undefined 
        },
        { title: "Sem Fechamento", href: "/patients-no-closure", icon: AlertTriangle },
        { title: "Desistentes", href: "/patients-missed", icon: UserX },
      ]
    }
  ];

  const menuItems = authState.user?.role === 'admin' ? adminMenuItems : collaboratorMenuItems;

  return (
    <Sidebar variant="sidebar" className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Instituto Melo</span>
            <span className="text-xs text-muted-foreground">
              {authState.user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.items ? (
                <SidebarGroup>
                  <SidebarGroupLabel className="flex items-center space-x-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <SidebarMenuSubButton 
                            asChild 
                            isActive={isActive(subItem.href)}
                            className="group relative"
                          >
                            <Link href={subItem.href}>
                              <subItem.icon className="h-4 w-4" />
                              <span>{subItem.title}</span>
                              {subItem.badge && (
                                <Badge 
                                  variant="secondary" 
                                  className="ml-auto h-5 w-5 p-0 text-xs bg-primary text-primary-foreground"
                                >
                                  {subItem.badge}
                                </Badge>
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </SidebarGroupContent>
                </SidebarGroup>
              ) : (
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive(item.href!)}
                  className="group relative"
                >
                  <Link href={item.href!}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <User className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">
                {authState.user?.name || authState.user?.username}
              </span>
              <span className="text-xs text-muted-foreground">
                {authState.user?.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </span>
            </div>
          </div>
          
          <Separator />
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}

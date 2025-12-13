import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Menu, 
  X,
  LogOut,
  ChevronDown,
  Settings,
  ShoppingCart,
  DollarSign,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from 'react-hot-toast';

export default function Layout({ children, currentPageName }) {
  // Não renderizar layout para página de embed
  if (currentPageName === 'FormEmbed') {
    return <>{children}</>;
  }

  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [client, setClient] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    // Primeiro tenta buscar na tabela TeamMember
    const teamMembers = await base44.entities.TeamMember.filter({ email: currentUser.email });
    if (teamMembers.length > 0) {
      const member = teamMembers[0];
      // Converte TeamMember para formato UserProfile para compatibilidade
      const profile = {
        client_id: member.client_id,
        role: member.role,
        full_name: member.name,
        phone: member.phone,
        status: member.status,
        created_by: member.email,
      };
      setUserProfile(profile);
      const clients = await base44.entities.Client.filter({ id: profile.client_id });
      if (clients.length > 0) {
        setClient(clients[0]);
      }
    } else {
      // Se não encontrar, tenta na UserProfile (legado)
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
        const clients = await base44.entities.Client.filter({ id: profiles[0].client_id });
        if (clients.length > 0) {
          setClient(clients[0]);
        }
      }
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
    { name: 'Marketplace', icon: ShoppingCart, path: 'LeadMarketplace' },
    { name: 'Pedidos', icon: Package, path: 'Orders' },
    { name: 'Leads', icon: Users, path: 'Leads' },
    { name: 'Produtos', icon: Package, path: 'Products' },
    { name: 'Precificação', icon: DollarSign, path: 'ProductPricing' },
    { name: 'Equipe', icon: Users, path: 'Team' },
    { name: 'Formulários', icon: FileText, path: 'FormTemplates' },
  ];

  const adminMenuItems = [
    { name: 'Gerenciar Clientes', icon: Building2, path: 'AdminClients' },
    { name: 'Gerenciar Usuários', icon: Users, path: 'AdminUsers' },
    { name: 'Gerenciar Pedidos', icon: Package, path: 'AdminOrders' },
  ];

  const settingsItem = { name: 'Configurações', icon: Settings, path: 'Settings' };

  return (
    <>
      <Toaster position="top-center" />
      <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">LeadManager</h1>
          {client && <p className="text-sm text-gray-500 mt-1">{client.name}</p>}
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={createPageUrl(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPageName === item.path
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2 px-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">Administração</div>
              </div>
              {adminMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={createPageUrl(item.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentPageName === item.path
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </>
          )}

          <Link
            to={createPageUrl(settingsItem.path)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentPageName === settingsItem.path
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <settingsItem.icon className="w-5 h-5" />
            <span>{settingsItem.name}</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Conectado como</div>
          <div className="font-medium text-sm text-gray-900">{user?.full_name}</div>
          {userProfile && (
            <div className="text-xs text-gray-500 capitalize">{userProfile.role}</div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          <div className="flex items-center gap-4 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
      </div>
      </>
      );
      }
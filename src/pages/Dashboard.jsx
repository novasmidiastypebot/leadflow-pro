import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAccessibleUsers } from '../components/AccessControl';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accessibleEmails, setAccessibleEmails] = useState([]);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
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
      const emails = await getAccessibleUsers(currentUser, profile);
      setAccessibleEmails(emails);
    } else {
      // Se não encontrar, tenta na UserProfile (legado) - ordenar por data de criação
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email }, 'created_date');
      if (profiles.length > 0) {
        // Usar o perfil mais antigo (criado primeiro)
        const oldestProfile = profiles[0];
        setUserProfile(oldestProfile);
        const emails = await getAccessibleUsers(currentUser, oldestProfile);
        setAccessibleEmails(emails);
      }
    }
  };

  const { data: allLeads = [], isLoading } = useQuery({
    queryKey: ['leads', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Lead.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  // Filtrar leads baseado em hierarquia
  const leads = allLeads.filter(lead => {
    if (user?.role === 'admin') return true;
    if (!lead.assigned_to) return true;
    return accessibleEmails.includes(lead.assigned_to);
  });

  const stats = [
    {
      title: 'Total de Leads',
      value: leads.length,
      icon: Users,
      color: 'bg-blue-600',
    },
    {
      title: 'Leads Novos',
      value: leads.filter(l => l.status === 'new').length,
      icon: Clock,
      color: 'bg-yellow-600',
    },
    {
      title: 'Em Negociação',
      value: leads.filter(l => l.status === 'negotiation').length,
      icon: TrendingUp,
      color: 'bg-orange-600',
    },
    {
      title: 'Convertidos',
      value: leads.filter(l => l.status === 'won').length,
      icon: CheckCircle,
      color: 'bg-green-600',
    },
  ];

  const statusData = [
    { name: 'Novos', value: leads.filter(l => l.status === 'new').length },
    { name: 'Contatados', value: leads.filter(l => l.status === 'contacted').length },
    { name: 'Qualificados', value: leads.filter(l => l.status === 'qualified').length },
    { name: 'Negociação', value: leads.filter(l => l.status === 'negotiation').length },
    { name: 'Ganhos', value: leads.filter(l => l.status === 'won').length },
    { name: 'Perdidos', value: leads.filter(l => l.status === 'lost').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Visão geral dos seus leads</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leads por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#1e40af" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {lead.form_data?.Nome || lead.form_data?.nome || lead.form_data?.name || 'Sem nome'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {lead.form_data?.['E-mail'] || lead.form_data?.email || 'Sem email'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    lead.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                    lead.status === 'won' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {lead.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
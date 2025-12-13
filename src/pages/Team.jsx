import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserCog, Award } from 'lucide-react';

export default function Team() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

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
    } else {
      // Se não encontrar, tenta na UserProfile (legado)
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
      }
    }
  };

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-members'],
    queryFn: async () => {
      return await base44.entities.TeamMember.list();
    },
  });

  const { data: teamProfiles = [] } = useQuery({
    queryKey: ['team', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      const members = await base44.entities.TeamMember.filter({ client_id: userProfile.client_id });
      // Converte para formato UserProfile para compatibilidade
      return members.map(member => ({
        id: member.id,
        client_id: member.client_id,
        role: member.role,
        full_name: member.name,
        phone: member.phone,
        status: member.status,
        created_by: member.email,
      }));
    },
    enabled: !!userProfile,
  });

  const roleIcons = {
    master: Award,
    manager: UserCog,
    supervisor: UserCheck,
    producer: Users,
  };

  const roleColors = {
    master: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    supervisor: 'bg-green-100 text-green-800',
    producer: 'bg-gray-100 text-gray-800',
  };

  const roleLabels = {
    master: 'Master',
    manager: 'Gerente',
    supervisor: 'Supervisor',
    producer: 'Produtor',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Equipe</h1>
        <p className="text-gray-600 mt-1">Visualize a hierarquia da equipe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamProfiles.map((profile) => {
          const RoleIcon = roleIcons[profile.role] || Users;
          
          return (
            <Card key={profile.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${roleColors[profile.role]}`}>
                    <RoleIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {profile.full_name || 'Usuário'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{profile.created_by}</p>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={roleColors[profile.role]}>
                        {roleLabels[profile.role]}
                      </Badge>
                      <Badge variant="outline" className={
                        profile.status === 'active' ? 'border-green-500 text-green-700' : 'border-gray-500 text-gray-700'
                      }>
                        {profile.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    {profile.phone && (
                      <p className="text-sm text-gray-600">
                        📱 {profile.phone}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {teamProfiles.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum membro da equipe encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
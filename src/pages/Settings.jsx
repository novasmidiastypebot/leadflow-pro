import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, User, Save } from 'lucide-react';
import { canManageUsers, isSuperAdmin } from '../components/AccessControl';
import toast from 'react-hot-toast';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    
    const teamMembers = await base44.entities.TeamMember.filter({ email: currentUser.email });
    if (teamMembers.length > 0) {
      const member = teamMembers[0];
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
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
      }
    }
  };

  const { data: client } = useQuery({
    queryKey: ['client', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return null;
      const clients = await base44.entities.Client.filter({ id: userProfile.client_id });
      return clients[0];
    },
    enabled: !!userProfile,
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client']);
      toast.success('Dados da empresa salvos com sucesso!');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['profiles']);
      toast.success('Perfil atualizado com sucesso!');
    },
  });

  const handleClientUpdate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateClientMutation.mutate({
      id: client.id,
      data: {
        name: formData.get('name'),
        document: formData.get('document'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        city: formData.get('city'),
        state: formData.get('state'),
      }
    });
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    updateProfileMutation.mutate({
      id: userProfile.id,
      data: {
        phone: formData.get('phone'),
      }
    });
  };

  const canEditClient = canManageUsers(userProfile) || isSuperAdmin(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie suas informações</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Settings - Only for Master */}
        {canEditClient && client && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleClientUpdate} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={client.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="document">CNPJ/CPF</Label>
                  <Input
                    id="document"
                    name="document"
                    defaultValue={client.document}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={client.email}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={client.phone}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={client.address}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      defaultValue={client.city}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      name="state"
                      defaultValue={client.state}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateClientMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* User Profile */}
        {userProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Meu Perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={user?.full_name} disabled />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email} disabled />
                </div>
                <div>
                  <Label>Função</Label>
                  <Input value={userProfile.role} disabled className="capitalize" />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={userProfile.phone}
                  />
                </div>
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
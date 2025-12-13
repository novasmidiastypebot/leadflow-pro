import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      return await base44.entities.User.list();
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      return await base44.entities.UserProfile.list('-created_date');
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data) => {
      const { user_email, full_name, ...profileData } = data;
      
      // Check if user exists
      const existingUsers = await base44.entities.User.filter({ email: user_email });
      
      // If user doesn't exist, send invitation email
      if (existingUsers.length === 0) {
        const client = clients.find(c => c.id === data.client_id);
        const inviteLink = `${window.location.origin}`;
        
        await base44.integrations.Core.SendEmail({
          to: user_email,
          subject: 'Convite para acessar o LeadManager',
          body: `
            <h2>Bem-vindo ao LeadManager!</h2>
            <p>Olá${full_name ? ' ' + full_name : ''},</p>
            <p>Você foi convidado para fazer parte da equipe ${client?.name || 'da empresa'}.</p>
            <p>Acesse o sistema através do link: <a href="${inviteLink}">${inviteLink}</a></p>
            <p>Use este e-mail (${user_email}) para fazer login.</p>
          `
        });
      }
      
      // Create profile (will be associated when user logs in)
      return base44.entities.UserProfile.create({
        ...profileData,
        full_name: full_name || null,
        created_by: user_email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-profiles']);
      setShowDialog(false);
      setEditingProfile(null);
      toast.success('Perfil criado e convite enviado por e-mail!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao criar perfil');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-profiles']);
      setShowDialog(false);
      setEditingProfile(null);
      toast.success('Perfil atualizado com sucesso!');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userEmail = formData.get('user_email');
    const data = {
      client_id: formData.get('client_id'),
      role: formData.get('role'),
      phone: formData.get('phone'),
      status: formData.get('status'),
      parent_user_id: formData.get('parent_user_id') || null,
      full_name: formData.get('full_name') || null,
    };

    if (editingProfile) {
      updateProfileMutation.mutate({ id: editingProfile.id, data });
    } else {
      createProfileMutation.mutate({ ...data, user_email: userEmail, full_name: data.full_name });
    }
  };

  const roleLabels = {
    master: 'Master',
    manager: 'Gerente',
    supervisor: 'Supervisor',
    producer: 'Produtor',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-gray-600 mt-1">Gerencie perfis de usuários do sistema</p>
        </div>
        <Button onClick={() => { setEditingProfile(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const user = users.find(u => u.email === profile.created_by);
                const client = clients.find(c => c.id === profile.client_id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{profile.full_name || user?.full_name || profile.created_by}</div>
                        <div className="text-sm text-gray-500">{profile.created_by}</div>
                      </div>
                    </TableCell>
                    <TableCell>{client?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[profile.role]}</Badge>
                    </TableCell>
                    <TableCell>{profile.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge className={profile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {profile.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingProfile(profile); setShowDialog(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {profiles.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum perfil cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="user_email">Email do Usuário *</Label>
              <Input
                id="user_email"
                name="user_email"
                type="email"
                placeholder="usuario@exemplo.com"
                defaultValue={editingProfile?.created_by || ''}
                disabled={!!editingProfile}
                required
              />
              {editingProfile && (
                <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado após o cadastro</p>
              )}
            </div>
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={editingProfile?.full_name || ''}
                placeholder="Nome do usuário"
              />
            </div>
            <div>
              <Label htmlFor="client_id">Cliente *</Label>
              <Select name="client_id" defaultValue={editingProfile?.client_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Função *</Label>
              <Select name="role" defaultValue={editingProfile?.role || 'producer'} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="master">Master</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="producer">Produtor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={editingProfile?.phone}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={editingProfile?.status || 'active'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProfileMutation.isPending || updateProfileMutation.isPending}>
                {editingProfile ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
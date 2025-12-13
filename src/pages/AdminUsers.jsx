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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [showMasterDialog, setShowMasterDialog] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
  });

  const { data: allProfiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      return await base44.entities.UserProfile.list('-created_date');
    },
  });

  const profiles = allProfiles.filter(p => p.role === 'master');

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      return await base44.entities.TeamMember.list('-created_date');
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TeamMember.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['team-members']);
      setShowDialog(false);
      setEditingMember(null);
      toast.success('Membro cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao cadastrar membro');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-members']);
      setShowDialog(false);
      setEditingMember(null);
      toast.success('Membro atualizado com sucesso!');
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['team-members']);
      toast.success('Membro removido com sucesso!');
    },
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data) => {
      const { user_email, full_name, ...profileData } = data;
      return base44.entities.UserProfile.create({
        ...profileData,
        full_name: full_name || null,
        created_by: user_email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['all-profiles']);
      setShowMasterDialog(false);
      setEditingProfile(null);
      toast.success('Master cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao cadastrar master');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserProfile.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-profiles']);
      setShowMasterDialog(false);
      setEditingProfile(null);
      toast.success('Master atualizado com sucesso!');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      client_id: formData.get('client_id'),
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      role: formData.get('role'),
      status: formData.get('status'),
      parent_member_id: formData.get('parent_member_id') || null,
    };

    if (editingMember) {
      const updateData = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMemberMutation.mutate({ id: editingMember.id, data: updateData });
    } else {
      createMemberMutation.mutate(data);
    }
  };

  const handleMasterSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userEmail = formData.get('user_email');
    const data = {
      client_id: formData.get('client_id'),
      role: 'master',
      phone: formData.get('phone'),
      status: formData.get('status'),
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
          <p className="text-gray-600 mt-1">Gerencie usuários masters e membros da equipe</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setEditingProfile(null); setShowMasterDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Master
          </Button>
          <Button onClick={() => { setEditingMember(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Masters Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Usuários Master</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const client = clients.find(c => c.id === profile.client_id);
                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.full_name || profile.created_by}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{profile.created_by}</TableCell>
                    <TableCell>{client?.name || '-'}</TableCell>
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
                        onClick={() => { setEditingProfile(profile); setShowMasterDialog(true); }}
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
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum master cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Membros da Equipe</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => {
                const client = clients.find(c => c.id === member.client_id);
                return (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{member.email}</TableCell>
                    <TableCell>{client?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[member.role]}</Badge>
                    </TableCell>
                    <TableCell>{member.phone || '-'}</TableCell>
                    <TableCell>
                      <Badge className={member.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {member.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingMember(member); setShowDialog(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja remover este membro?')) {
                              deleteMemberMutation.mutate(member.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {teamMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum membro cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Member Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Editar Membro' : 'Novo Membro'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'Edite as informações do membro da equipe' : 'Cadastre um novo membro da equipe'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingMember?.name || ''}
                placeholder="Nome completo"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editingMember?.email || ''}
                placeholder="email@exemplo.com"
                disabled={!!editingMember}
                required
              />
              {editingMember && (
                <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Senha {!editingMember && '*'}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={editingMember ? 'Deixe em branco para manter a senha atual' : 'Senha de acesso'}
                required={!editingMember}
              />
            </div>
            <div>
              <Label htmlFor="client_id">Cliente *</Label>
              <Select name="client_id" defaultValue={editingMember?.client_id} required>
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
              <Select name="role" defaultValue={editingMember?.role || 'producer'} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                defaultValue={editingMember?.phone}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={editingMember?.status || 'active'}>
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
              <Button type="submit" disabled={createMemberMutation.isPending || updateMemberMutation.isPending}>
                {editingMember ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Master Dialog */}
      <Dialog open={showMasterDialog} onOpenChange={setShowMasterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Master' : 'Novo Master'}</DialogTitle>
            <DialogDescription>
              {editingProfile ? 'Edite as informações do usuário master' : 'Cadastre um novo usuário master'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMasterSubmit} className="space-y-4">
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
                <p className="text-xs text-gray-500 mt-1">O e-mail não pode ser alterado</p>
              )}
            </div>
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={editingProfile?.full_name || ''}
                placeholder="Nome completo"
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
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={editingProfile?.phone}
                placeholder="(00) 00000-0000"
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
              <Button type="button" variant="outline" onClick={() => setShowMasterDialog(false)}>
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
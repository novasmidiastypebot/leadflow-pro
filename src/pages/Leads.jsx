import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { getAccessibleUsers } from '../components/AccessControl';
import LeadAssignment from '../components/LeadAssignment';

export default function Leads() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [accessibleEmails, setAccessibleEmails] = useState([]);
  const queryClient = useQueryClient();

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
      return await base44.entities.Lead.filter({ client_id: userProfile.client_id }, '-created_date');
    },
    enabled: !!userProfile,
  });

  // Filtrar leads baseado em hierarquia
  const leads = allLeads.filter(lead => {
    if (user?.role === 'admin') return true;
    if (!lead.assigned_to) return true;
    return accessibleEmails.includes(lead.assigned_to);
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
    },
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.form_data?.Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.form_data?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.form_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.form_data?.['E-mail']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.form_data?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    new: 'bg-yellow-100 text-yellow-800',
    contacted: 'bg-blue-100 text-blue-800',
    qualified: 'bg-purple-100 text-purple-800',
    negotiation: 'bg-orange-100 text-orange-800',
    won: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os seus leads</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="contacted">Contatado</SelectItem>
                <SelectItem value="qualified">Qualificado</SelectItem>
                <SelectItem value="negotiation">Negociação</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Carregando leads...
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nenhuma lead encontrada
                    </TableCell>
                  </TableRow>
                ) : filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.form_data?.Nome || lead.form_data?.nome || lead.form_data?.name || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{lead.form_data?.['E-mail'] || lead.form_data?.email || '-'}</div>
                        <div className="text-gray-500">{lead.form_data?.Telefone || lead.form_data?.telefone || lead.form_data?.phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status]}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        lead.priority === 'high' ? 'border-red-500 text-red-700' :
                        lead.priority === 'medium' ? 'border-yellow-500 text-yellow-700' :
                        'border-blue-500 text-blue-700'
                      }>
                        {lead.priority || 'medium'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(lead.created_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Select
                    value={selectedLead.status}
                    onValueChange={(value) => {
                      updateLeadMutation.mutate({
                        id: selectedLead.id,
                        data: { status: value }
                      });
                      setSelectedLead({ ...selectedLead, status: value });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="contacted">Contatado</SelectItem>
                      <SelectItem value="qualified">Qualificado</SelectItem>
                      <SelectItem value="negotiation">Negociação</SelectItem>
                      <SelectItem value="won">Ganho</SelectItem>
                      <SelectItem value="lost">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Prioridade</label>
                  <Select
                    value={selectedLead.priority || 'medium'}
                    onValueChange={(value) => {
                      updateLeadMutation.mutate({
                        id: selectedLead.id,
                        data: { priority: value }
                      });
                      setSelectedLead({ ...selectedLead, priority: value });
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LeadAssignment
                currentUser={user}
                currentUserProfile={userProfile}
                selectedLead={selectedLead}
                onAssign={(assignedTo) => {
                  updateLeadMutation.mutate({
                    id: selectedLead.id,
                    data: { assigned_to: assignedTo }
                  });
                  setSelectedLead({ ...selectedLead, assigned_to: assignedTo });
                }}
              />

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Dados do Formulário</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  {Object.entries(selectedLead.form_data || {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-sm font-medium text-gray-600 capitalize">{key}: </span>
                      <span className="text-sm text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
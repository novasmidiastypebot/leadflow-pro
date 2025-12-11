import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Plus, Pencil, Code, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function FormTemplates() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
    if (profiles.length > 0) {
      setUserProfile(profiles[0]);
    }
  };

  const { data: forms = [] } = useQuery({
    queryKey: ['forms', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.FormTemplate.filter({ client_id: userProfile.client_id }, '-created_date');
    },
    enabled: !!userProfile,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Product.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  const embedCode = selectedForm 
    ? `<iframe src="${window.location.origin}${createPageUrl('FormEmbed')}?id=${selectedForm.embed_id}" width="100%" height="600" frameborder="0"></iframe>`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Formulários</h1>
          <p className="text-gray-600 mt-1">Gerencie seus formulários de captura</p>
        </div>
        <Link to={createPageUrl('FormBuilder')}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Formulário
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => {
                const product = products.find(p => p.id === form.product_id);
                return (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>
                      {product ? (
                        <Badge variant="outline">{product.name}</Badge>
                      ) : (
                        <span className="text-gray-400">Nenhum</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={form.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {form.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(form.created_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={`${createPageUrl('FormBuilder')}?id=${form.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedForm(form);
                            setShowEmbedDialog(true);
                          }}
                        >
                          <Code className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {forms.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">Nenhum formulário criado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de Incorporação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Copie o código abaixo e cole no HTML da sua página onde deseja exibir o formulário:
            </p>
            <div className="relative">
              <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
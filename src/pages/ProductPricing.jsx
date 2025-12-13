import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

export default function ProductPricing() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
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
      const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email }, 'created_date');
      if (profiles.length > 0) {
        setUserProfile(profiles[0]);
      }
    }
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Product.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  const { data: pricings = [] } = useQuery({
    queryKey: ['pricings'],
    queryFn: async () => {
      return await base44.entities.ProductPricing.list();
    },
  });

  const createPricingMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductPricing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pricings']);
      setShowDialog(false);
      setEditingPricing(null);
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductPricing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['pricings']);
      setShowDialog(false);
      setEditingPricing(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      product_id: formData.get('product_id'),
      lead_type: formData.get('lead_type'),
      state: formData.get('state'),
      ddd: formData.get('ddd') || null,
      price: parseFloat(formData.get('price')),
      is_active: true,
    };

    if (editingPricing) {
      updatePricingMutation.mutate({ id: editingPricing.id, data });
    } else {
      createPricingMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Precificação de Produtos</h1>
          <p className="text-gray-600 mt-1">Configure os preços por estado/DDD/tipo</p>
        </div>
        <Button onClick={() => { setEditingPricing(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Precificação
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>DDD</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricings.map((pricing) => {
                const product = products.find(p => p.id === pricing.product_id);
                return (
                  <TableRow key={pricing.id}>
                    <TableCell className="font-medium">
                      {product?.name || 'Produto não encontrado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {pricing.lead_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{pricing.state}</TableCell>
                    <TableCell>{pricing.ddd || '-'}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        R$ {pricing.price.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={pricing.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {pricing.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingPricing(pricing); setShowDialog(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {pricings.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma precificação configurada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing ? 'Editar Precificação' : 'Nova Precificação'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="product_id">Produto *</Label>
              <Select name="product_id" defaultValue={editingPricing?.product_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lead_type">Tipo de Lead *</Label>
                <Select name="lead_type" defaultValue={editingPricing?.lead_type || 'juridica'} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="juridica">Jurídica (PJ)</SelectItem>
                    <SelectItem value="fisica">Física (PF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="state">Estado *</Label>
                <Select name="state" defaultValue={editingPricing?.state} required>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ddd">DDD (opcional)</Label>
                <Input
                  id="ddd"
                  name="ddd"
                  defaultValue={editingPricing?.ddd}
                  placeholder="Ex: 11"
                  maxLength={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Deixe vazio para aplicar a todo o estado
                </p>
              </div>

              <div>
                <Label htmlFor="price">Preço *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  defaultValue={editingPricing?.price}
                  placeholder="Ex: 40.00"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
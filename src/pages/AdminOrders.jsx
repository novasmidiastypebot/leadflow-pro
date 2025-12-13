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
import { Plus, Pencil, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminOrders() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      return await base44.entities.Order.list('-created_date');
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      return await base44.entities.Product.filter({ client_id: selectedClientId });
    },
    enabled: !!selectedClientId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      return await base44.entities.ProductCategory.filter({ client_id: selectedClientId });
    },
    enabled: !!selectedClientId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      return await base44.entities.User.list();
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      return await base44.entities.UserProfile.filter({ client_id: selectedClientId });
    },
    enabled: !!selectedClientId,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      setShowDialog(false);
      setEditingOrder(null);
      toast.success('Pedido criado com sucesso!');
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-orders']);
      setShowDialog(false);
      setEditingOrder(null);
      toast.success('Pedido atualizado com sucesso!');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const totalQuantity = parseInt(formData.get('total_quantity'));
    const dailyQuantity = parseInt(formData.get('daily_quantity'));
    const unitPrice = parseFloat(formData.get('unit_price'));
    const totalAmount = totalQuantity * unitPrice;

    const data = {
      client_id: formData.get('client_id'),
      product_id: formData.get('product_id'),
      category_id: formData.get('category_id') || null,
      lead_type: formData.get('lead_type') || null,
      state: formData.get('state') || null,
      ddd: formData.get('ddd') || null,
      total_quantity: totalQuantity,
      daily_quantity: dailyQuantity,
      delivered_quantity: parseInt(formData.get('delivered_quantity')) || 0,
      unit_price: unitPrice,
      total_amount: totalAmount,
      paid_amount: parseFloat(formData.get('paid_amount')) || 0,
      status: formData.get('status'),
      distribution_mode: formData.get('distribution_mode'),
      assigned_to: formData.get('assigned_to') || null,
    };

    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data });
    } else {
      createOrderMutation.mutate(data);
    }
  };

  const statusColors = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending_payment: 'Pendente',
    active: 'Ativo',
    paused: 'Pausado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Pedidos</h1>
          <p className="text-gray-600 mt-1">Cadastre e gerencie pedidos por equipes</p>
        </div>
        <Button onClick={() => { setEditingOrder(null); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const client = clients.find(c => c.id === order.client_id);
                const product = products.find(p => p.id === order.product_id);
                const progress = order.total_quantity > 0 
                  ? Math.round((order.delivered_quantity / order.total_quantity) * 100) 
                  : 0;
                
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{client?.name || '-'}</TableCell>
                    <TableCell>{product?.name || '-'}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{order.delivered_quantity}/{order.total_quantity}</div>
                        <div className="text-gray-500">{order.daily_quantity}/dia</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          R$ {order.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-gray-500">
                          R$ {order.unit_price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/lead
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { 
                          setEditingOrder(order); 
                          setSelectedClientId(order.client_id);
                          setShowDialog(true); 
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {orders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum pedido cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Pedido' : 'Novo Pedido'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="client_id">Cliente *</Label>
              <Select 
                name="client_id" 
                defaultValue={editingOrder?.client_id}
                onValueChange={setSelectedClientId}
                required
              >
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_id">Produto *</Label>
                <Select name="product_id" defaultValue={editingOrder?.product_id} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
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
              <div>
                <Label htmlFor="category_id">Categoria</Label>
                <Select name="category_id" defaultValue={editingOrder?.category_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="lead_type">Tipo de Lead</Label>
                <Select name="lead_type" defaultValue={editingOrder?.lead_type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="juridica">Jurídica</SelectItem>
                    <SelectItem value="fisica">Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={editingOrder?.state}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
              <div>
                <Label htmlFor="ddd">DDD</Label>
                <Input
                  id="ddd"
                  name="ddd"
                  defaultValue={editingOrder?.ddd}
                  maxLength={2}
                  placeholder="11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_quantity">Quantidade Total *</Label>
                <Input
                  id="total_quantity"
                  name="total_quantity"
                  type="number"
                  defaultValue={editingOrder?.total_quantity}
                  required
                />
              </div>
              <div>
                <Label htmlFor="daily_quantity">Quantidade Diária *</Label>
                <Input
                  id="daily_quantity"
                  name="daily_quantity"
                  type="number"
                  defaultValue={editingOrder?.daily_quantity}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="unit_price">Preço Unitário (R$) *</Label>
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  step="0.01"
                  defaultValue={editingOrder?.unit_price}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paid_amount">Valor Pago (R$)</Label>
                <Input
                  id="paid_amount"
                  name="paid_amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingOrder?.paid_amount || 0}
                />
              </div>
            </div>

            {editingOrder && (
              <div>
                <Label htmlFor="delivered_quantity">Quantidade Entregue</Label>
                <Input
                  id="delivered_quantity"
                  name="delivered_quantity"
                  type="number"
                  defaultValue={editingOrder?.delivered_quantity || 0}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select name="status" defaultValue={editingOrder?.status || 'pending_payment'} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_payment">Pendente</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="distribution_mode">Modo de Distribuição *</Label>
                <Select name="distribution_mode" defaultValue={editingOrder?.distribution_mode || 'manual'} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="auto_client">Auto (Cliente)</SelectItem>
                    <SelectItem value="auto_team">Auto (Equipe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="assigned_to">Responsável</Label>
              <Select name="assigned_to" defaultValue={editingOrder?.assigned_to}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => {
                    const user = users.find(u => u.email === profile.created_by);
                    return (
                      <SelectItem key={profile.id} value={profile.created_by}>
                        {user?.full_name || profile.created_by}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createOrderMutation.isPending || updateOrderMutation.isPending}>
                {editingOrder ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
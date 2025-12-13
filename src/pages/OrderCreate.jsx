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
import { Save, Calculator } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import toast from 'react-hot-toast';

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

export default function OrderCreate() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [leadType, setLeadType] = useState('juridica');
  const [selectedStates, setSelectedStates] = useState([]);
  const [dddMode, setDddMode] = useState('all'); // 'all', 'specific', 'except'
  const [excludedDdds, setExcludedDdds] = useState('');
  const [specificDdds, setSpecificDdds] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [dailyQuantity, setDailyQuantity] = useState('');
  const [distributionMode, setDistributionMode] = useState('manual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  
  const navigate = useNavigate();
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



  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      if (user?.role !== 'admin') return [];
      return await base44.entities.Client.filter({ status: 'active' });
    },
    enabled: user?.role === 'admin',
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await base44.entities.Product.filter({ status: 'active' });
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      return await base44.entities.ProductCategory.filter({ status: 'active' });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (order) => {
      console.log('Criando pedido com dados:', order);
      const result = await base44.entities.Order.create(order);
      console.log('Pedido criado com sucesso:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('onSuccess chamado, pedido:', data);
      toast.success('Pedido criado com sucesso!');
      queryClient.invalidateQueries(['orders']);
      setTimeout(() => {
        navigate(createPageUrl('Orders'));
      }, 500);
    },
    onError: (error) => {
      console.error('Erro completo ao criar pedido:', error);
      console.error('Error stack:', error.stack);
      toast.error('Erro ao criar pedido: ' + (error.message || JSON.stringify(error)));
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const clientId = user?.role === 'admin' ? selectedClientId : userProfile?.client_id;
    
    if (!clientId) {
      alert('Cliente não identificado. Recarregue a página.');
      return;
    }
    
    const quantity = parseInt(totalQuantity);
    const dailyQty = parseInt(dailyQuantity);
    const amount = user?.role === 'admin' ? (totalAmount ? parseFloat(totalAmount) : 0) : 0;
    
    // Montar string de DDDs
    let dddsString = 'all';
    if (dddMode === 'specific' && specificDdds) {
      dddsString = specificDdds;
    } else if (dddMode === 'except' && excludedDdds) {
      dddsString = `except:${excludedDdds}`;
    }
    
    const order = {
      client_id: clientId,
      product_id: selectedProduct,
      lead_types: leadType,
      states: selectedStates.join(','),
      ddds: dddsString,
      total_quantity: quantity,
      daily_quantity: dailyQty,
      delivered_quantity: 0,
      total_amount: amount,
      consumed_amount: 0,
      status: amount > 0 ? 'active' : 'pending_payment',
      distribution_mode: distributionMode,
      notification_90_sent: false,
    };
    
    if (selectedCategory) {
      order.category_id = selectedCategory;
    }
    
    if (distributionMode !== 'manual') {
      order.assigned_to = user.email;
    }
    
    console.log('Submetendo pedido:', order);
    createOrderMutation.mutate(order);
  };

  const toggleState = (state) => {
    setSelectedStates(prev =>
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };

  const toggleAllStates = () => {
    if (selectedStates.length === ESTADOS.length) {
      setSelectedStates([]);
    } else {
      setSelectedStates([...ESTADOS]);
    }
  };



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Novo Pedido</h1>
        <p className="text-gray-600 mt-1">Configure seu pedido de leads</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.role === 'admin' && (
                  <div>
                    <Label>Cliente *</Label>
                    <Select value={selectedClientId} onValueChange={setSelectedClientId} required>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o cliente" />
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
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Produto *</Label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
                      <SelectTrigger className="mt-1">
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

                  <div>
                    <Label>Categoria</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Nenhuma</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Tipo de Lead *</Label>
                  <Select value={leadType} onValueChange={setLeadType} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juridica">Jurídica (PJ)</SelectItem>
                      <SelectItem value="fisica">Física (PF)</SelectItem>
                      <SelectItem value="ambos">Ambos (PJ e PF)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Estados *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={toggleAllStates}>
                      {selectedStates.length === ESTADOS.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-4 gap-2">
                      {ESTADOS.map((uf) => (
                        <div key={uf} className="flex items-center gap-2">
                          <Checkbox
                            checked={selectedStates.includes(uf)}
                            onCheckedChange={() => toggleState(uf)}
                          />
                          <Label className="cursor-pointer">{uf}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedStates.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedStates.map((state) => (
                        <Badge key={state} variant="secondary">
                          {state}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>DDDs</Label>
                  <Select value={dddMode} onValueChange={setDddMode}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os DDDs</SelectItem>
                      <SelectItem value="specific">DDDs Específicos</SelectItem>
                      <SelectItem value="except">Todos Exceto</SelectItem>
                    </SelectContent>
                  </Select>

                  {dddMode === 'specific' && (
                    <Input
                      type="text"
                      value={specificDdds}
                      onChange={(e) => setSpecificDdds(e.target.value)}
                      placeholder="Ex: 11,21,31"
                      className="mt-2"
                    />
                  )}

                  {dddMode === 'except' && (
                    <Input
                      type="text"
                      value={excludedDdds}
                      onChange={(e) => setExcludedDdds(e.target.value)}
                      placeholder="Ex: 13,21,22,24"
                      className="mt-2"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Separe os DDDs por vírgula
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade Total do Pedido *</Label>
                    <Input
                      type="number"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      placeholder="Ex: 1000"
                      required
                      min="1"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total de leads do pedido
                    </p>
                  </div>

                  <div>
                    <Label>Quantidade Diária *</Label>
                    <Input
                      type="number"
                      value={dailyQuantity}
                      onChange={(e) => setDailyQuantity(e.target.value)}
                      placeholder="Ex: 10"
                      required
                      min="1"
                      className="mt-1"
                    />
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <div>
                    <Label>Saldo/Crédito do Pedido *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="Ex: 10000.00"
                      className="mt-1"
                      required={user?.role === 'admin'}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Valor total creditado para o pedido
                    </p>
                  </div>
                )}

                <div>
                  <Label>Modo de Distribuição *</Label>
                  <Select value={distributionMode} onValueChange={setDistributionMode} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual - Eu faço a distribuição</SelectItem>
                      <SelectItem value="auto_client">Automático - Receber e distribuir</SelectItem>
                      <SelectItem value="auto_team">Automático - Distribuir para equipe</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {distributionMode === 'manual' && 'Você receberá notificação e fará a distribuição manualmente'}
                    {distributionMode === 'auto_client' && 'Leads serão atribuídas a você automaticamente'}
                    {distributionMode === 'auto_team' && 'Leads serão distribuídas automaticamente entre sua equipe'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resumo do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tipo de Lead:</span>
                  <span className="font-medium capitalize">{leadType === 'ambos' ? 'PJ e PF' : leadType === 'juridica' ? 'PJ' : 'PF'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estados Aceitos:</span>
                  <span className="font-medium">{selectedStates.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">DDDs:</span>
                  <span className="font-medium">
                    {dddMode === 'all' ? 'Todos' : dddMode === 'specific' ? `Específicos (${specificDdds.split(',').length})` : `Exceto (${excludedDdds.split(',').length})`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantidade Total:</span>
                  <span className="font-medium">{totalQuantity || 0} leads</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantidade Diária:</span>
                  <span className="font-medium">{dailyQuantity || 0} leads/dia</span>
                </div>
                {user?.role === 'admin' && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="font-semibold">Crédito Total:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        R$ {totalAmount ? parseFloat(totalAmount).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={!totalQuantity || !dailyQuantity || selectedStates.length === 0 || (user?.role === 'admin' && (!selectedClientId || !totalAmount))}
            >
              <Save className="w-5 h-5 mr-2" />
              Criar Pedido
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
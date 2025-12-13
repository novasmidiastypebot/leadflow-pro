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
  const [unitPrice, setUnitPrice] = useState(0);
  const [distributionMode, setDistributionMode] = useState('manual');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedProduct && leadType && selectedStates.length > 0) {
      loadPricing();
    }
  }, [selectedProduct, leadType, selectedStates]);

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

  const loadPricing = async () => {
    // Buscar preço médio dos estados selecionados
    const pricings = await base44.entities.ProductPricing.filter({
      product_id: selectedProduct,
      lead_type: leadType,
    });
    
    const statePricings = pricings.filter(p => 
      selectedStates.includes(p.state) && (!p.ddd || p.ddd === '')
    );
    
    if (statePricings.length > 0) {
      const avgPrice = statePricings.reduce((sum, p) => sum + p.price, 0) / statePricings.length;
      setUnitPrice(avgPrice);
    } else {
      setUnitPrice(0);
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
    mutationFn: async (orders) => {
      if (Array.isArray(orders)) {
        return await base44.entities.Order.bulkCreate(orders);
      }
      return await base44.entities.Order.create(orders);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      navigate(createPageUrl('Orders'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const clientId = user?.role === 'admin' ? selectedClientId : userProfile?.client_id;
    const quantityPerOrder = parseInt(totalQuantity);
    const dailyQty = parseInt(dailyQuantity);
    const paid = paidAmount ? parseFloat(paidAmount) : 0;
    
    // Determinar tipos de lead a usar
    const leadTypesToUse = leadType === 'ambos' ? ['juridica', 'fisica'] : [leadType];
    
    // Determinar DDDs a usar
    let dddsToUse = [null]; // null = todo o estado
    if (dddMode === 'specific' && specificDdds) {
      dddsToUse = specificDdds.split(',').map(d => d.trim()).filter(d => d);
    } else if (dddMode === 'except' && excludedDdds) {
      // Buscar todos os DDDs possíveis e excluir os listados
      const allDdds = ['11','12','13','14','15','16','17','18','19','21','22','24','27','28',
        '31','32','33','34','35','37','38','41','42','43','44','45','46','47','48','49',
        '51','53','54','55','61','62','63','64','65','66','67','68','69','71','73','74',
        '75','77','79','81','82','83','84','85','86','87','88','89','91','92','93','94',
        '95','96','97','98','99'];
      const excluded = excludedDdds.split(',').map(d => d.trim()).filter(d => d);
      dddsToUse = allDdds.filter(d => !excluded.includes(d));
    }
    
    // Criar pedidos para cada combinação de tipo/estado/DDD
    const orders = [];
    for (const type of leadTypesToUse) {
      for (const state of selectedStates) {
        for (const ddd of dddsToUse) {
          const totalAmount = quantityPerOrder * unitPrice;
          orders.push({
            client_id: clientId,
            product_id: selectedProduct,
            category_id: selectedCategory || null,
            lead_type: type,
            state: state,
            ddd: ddd,
            total_quantity: quantityPerOrder,
            daily_quantity: dailyQty,
            delivered_quantity: 0,
            unit_price: unitPrice,
            total_amount: totalAmount,
            paid_amount: paid,
            status: paid >= totalAmount ? 'active' : 'pending_payment',
            distribution_mode: distributionMode,
            assigned_to: distributionMode !== 'manual' ? user.email : null,
          });
        }
      }
    }
    
    createOrderMutation.mutate(orders);
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

  const leadTypeMultiplier = leadType === 'ambos' ? 2 : 1;
  const dddCount = dddMode === 'specific' && specificDdds ? specificDdds.split(',').length : 
                   dddMode === 'except' && excludedDdds ? (100 - excludedDdds.split(',').length) : 1;
  const totalOrders = selectedStates.length * dddCount * leadTypeMultiplier;
  const totalAmount = totalQuantity && unitPrice ? parseFloat(totalQuantity) * unitPrice * totalOrders : 0;

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
                    <Label>Quantidade por Pedido *</Label>
                    <Input
                      type="number"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      placeholder="Ex: 100"
                      required
                      min="1"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Quantidade para cada estado/DDD
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
                    <Label>Valor Pago</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="Ex: 1000.00"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe vazio para status "Pendente de Pagamento"
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
                  <span className="text-gray-600">Estados Selecionados:</span>
                  <span className="font-medium">{selectedStates.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total de Pedidos:</span>
                  <span className="font-medium">{totalOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Preço Unitário:</span>
                  <span className="font-medium">R$ {unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Qtd por Pedido:</span>
                  <span className="font-medium">{totalQuantity || 0} leads</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Geral:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      R$ {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {unitPrice === 0 && selectedProduct && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      Preço não configurado para este produto/estado/tipo
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={!unitPrice || !totalQuantity || selectedStates.length === 0 || (user?.role === 'admin' && !selectedClientId)}
            >
              <Save className="w-5 h-5 mr-2" />
              Criar {totalOrders} Pedido{totalOrders > 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
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
  const [state, setState] = useState('');
  const [ddd, setDdd] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [dailyQuantity, setDailyQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [distributionMode, setDistributionMode] = useState('manual');
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (selectedProduct && leadType && state) {
      loadPricing();
    }
  }, [selectedProduct, leadType, state, ddd]);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
    if (profiles.length > 0) {
      setUserProfile(profiles[0]);
    }
  };

  const loadPricing = async () => {
    const pricings = await base44.entities.ProductPricing.filter({
      product_id: selectedProduct,
      lead_type: leadType,
      state: state,
    });
    
    // Buscar preço específico por DDD se fornecido
    if (ddd) {
      const specificPricing = pricings.find(p => p.ddd === ddd);
      if (specificPricing) {
        setUnitPrice(specificPricing.price);
        return;
      }
    }
    
    // Buscar preço geral do estado
    const statePricing = pricings.find(p => !p.ddd || p.ddd === '');
    if (statePricing) {
      setUnitPrice(statePricing.price);
    } else {
      setUnitPrice(0);
    }
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Product.filter({ client_id: userProfile.client_id, status: 'active' });
    },
    enabled: !!userProfile,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.ProductCategory.filter({ client_id: userProfile.client_id, status: 'active' });
    },
    enabled: !!userProfile,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data) => base44.entities.Order.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['orders']);
      navigate(createPageUrl('Orders'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const totalAmount = parseFloat(totalQuantity) * unitPrice;
    
    createOrderMutation.mutate({
      client_id: userProfile.client_id,
      product_id: selectedProduct,
      category_id: selectedCategory || null,
      lead_type: leadType,
      state: state,
      ddd: ddd || null,
      total_quantity: parseInt(totalQuantity),
      daily_quantity: parseInt(dailyQuantity),
      delivered_quantity: 0,
      unit_price: unitPrice,
      total_amount: totalAmount,
      paid_amount: 0,
      status: 'pending_payment',
      distribution_mode: distributionMode,
      assigned_to: distributionMode !== 'manual' ? user.email : null,
    });
  };

  const totalAmount = totalQuantity && unitPrice ? parseFloat(totalQuantity) * unitPrice : 0;

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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de Lead *</Label>
                    <Select value={leadType} onValueChange={setLeadType} required>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="juridica">Jurídica (PJ)</SelectItem>
                        <SelectItem value="fisica">Física (PF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Estado *</Label>
                    <Select value={state} onValueChange={setState} required>
                      <SelectTrigger className="mt-1">
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

                  <div>
                    <Label>DDD</Label>
                    <Input
                      type="text"
                      value={ddd}
                      onChange={(e) => setDdd(e.target.value)}
                      placeholder="Opcional"
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantidade Total *</Label>
                    <Input
                      type="number"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      placeholder="Ex: 100"
                      required
                      min="1"
                      className="mt-1"
                    />
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
                  <span className="text-gray-600">Preço Unitário:</span>
                  <span className="font-medium">R$ {unitPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Quantidade:</span>
                  <span className="font-medium">{totalQuantity || 0} leads</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total:</span>
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

            <Button type="submit" className="w-full" size="lg" disabled={!unitPrice || !totalQuantity}>
              <Save className="w-5 h-5 mr-2" />
              Criar Pedido
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
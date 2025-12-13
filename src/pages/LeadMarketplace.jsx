import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingUp, Package, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { distributeLeadAutomatically } from '../components/LeadDistribution';
import toast from 'react-hot-toast';
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

export default function LeadMarketplace() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showLeadsDialog, setShowLeadsDialog] = useState(false);
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

  const { data: availableLeads = [] } = useQuery({
    queryKey: ['availableLeads'],
    queryFn: async () => {
      return await base44.entities.Lead.filter({ is_distributed: false });
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await base44.entities.Product.filter({ status: 'active' });
    },
  });

  const { data: pricings = [] } = useQuery({
    queryKey: ['pricings'],
    queryFn: async () => {
      return await base44.entities.ProductPricing.filter({ is_active: true });
    },
  });

  // Agrupar leads disponíveis por produto
  const groupedInventory = availableLeads.reduce((acc, lead) => {
    if (!lead.product_id) return acc;
    
    if (!acc[lead.product_id]) {
      acc[lead.product_id] = {
        product_id: lead.product_id,
        total_available: 0,
        items: [],
        leads: []
      };
    }
    acc[lead.product_id].total_available += 1;
    acc[lead.product_id].leads.push(lead);
    
    // Agrupar por estado para exibição
    if (lead.state && !acc[lead.product_id].items.find(i => i.state === lead.state)) {
      acc[lead.product_id].items.push({ state: lead.state });
    }
    
    return acc;
  }, {});

  const buyLeadMutation = useMutation({
    mutationFn: async ({ leadId, clientId }) => {
      const leads = await base44.entities.Lead.filter({ id: leadId });
      if (leads.length === 0) throw new Error('Lead não encontrada');
      
      const lead = leads[0];
      return await distributeLeadAutomatically(lead, clientId);
    },
    onSuccess: () => {
      toast.success('Lead comprada e distribuída com sucesso!');
      queryClient.invalidateQueries(['availableLeads']);
      setShowLeadsDialog(false);
    },
    onError: (error) => {
      toast.error('Erro ao comprar lead: ' + error.message);
    },
  });

  const handleBuyLead = async (leadId) => {
    if (!userProfile) {
      toast.error('Perfil não carregado');
      return;
    }
    
    if (confirm('Deseja comprar esta lead? Ela será automaticamente distribuída.')) {
      buyLeadMutation.mutate({ leadId, clientId: userProfile.client_id });
    }
  };

  const viewProductLeads = (productId) => {
    setSelectedProduct(productId);
    setShowLeadsDialog(true);
  };

  const productLeads = selectedProduct 
    ? availableLeads.filter(l => l.product_id === selectedProduct)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace de Leads</h1>
          <p className="text-gray-600 mt-1">Leads disponíveis para compra</p>
        </div>
        <Link to={createPageUrl('OrderCreate')}>
          <Button size="lg">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Comprar Leads
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Leads Disponíveis</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {availableLeads.length}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Produtos Disponíveis</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {Object.keys(groupedInventory).length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">A partir de</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  R$ {pricings.length > 0 ? Math.min(...pricings.map(p => p.price)).toFixed(2) : '0.00'}
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.values(groupedInventory).map((group) => {
          const product = products.find(p => p.id === group.product_id);
          if (!product) return null;

          const productPricings = pricings.filter(p => p.product_id === group.product_id);
          const minPrice = productPricings.length > 0 ? Math.min(...productPricings.map(p => p.price)) : 0;

          return (
            <Card key={group.product_id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{product.name}</span>
                  <Badge className="bg-green-100 text-green-800">
                    {group.total_available} disponíveis
                  </Badge>
                </CardTitle>
                {product.description && (
                  <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">A partir de</span>
                      <span className="text-2xl font-bold text-blue-600">
                        R$ {minPrice.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">por lead</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Disponível em:</p>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(group.items.map(i => i.state))].map(state => (
                        <Badge key={state} variant="outline">{state}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1"
                      onClick={() => viewProductLeads(group.product_id)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Ver Leads
                    </Button>
                    <Link to={createPageUrl('OrderCreate')} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Criar Pedido
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {availableLeads.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma lead disponível no momento
            </h3>
            <p className="text-gray-600">
              Entre em contato conosco para saber quando novas leads estarão disponíveis
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showLeadsDialog} onOpenChange={setShowLeadsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Leads Disponíveis - {products.find(p => p.id === selectedProduct)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado/DDD</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.form_data?.Nome || lead.form_data?.name || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{lead.form_data?.['E-mail'] || lead.form_data?.email || '-'}</div>
                        <div className="text-gray-500">{lead.form_data?.Telefone || lead.form_data?.phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {lead.form_data?.['Possui CNPJ'] === 'Sim' ? 'PJ' : 'PF'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{lead.state || '-'}</div>
                        <div className="text-gray-500">{lead.ddd || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => handleBuyLead(lead.id)}
                        disabled={buyLeadMutation.isLoading}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Comprar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
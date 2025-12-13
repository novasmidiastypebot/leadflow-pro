import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function LeadMarketplace() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

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

                  <Link to={createPageUrl('OrderCreate')} className="w-full">
                    <Button className="w-full">
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Comprar Agora
                    </Button>
                  </Link>
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
    </div>
  );
}
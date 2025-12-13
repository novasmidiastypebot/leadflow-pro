import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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
import { Plus, Package, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';

export default function Orders() {
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

  const { data: orders = [], refetch } = useQuery({
    queryKey: ['orders', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      console.log('Buscando pedidos para client_id:', userProfile.client_id);
      const result = await base44.entities.Order.filter({ client_id: userProfile.client_id }, '-created_date');
      console.log('Pedidos encontrados:', result);
      return result;
    },
    enabled: !!userProfile,
  });

  useEffect(() => {
    if (userProfile) {
      refetch();
    }
  }, [userProfile, refetch]);

  const { data: products = [] } = useQuery({
    queryKey: ['products', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Product.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  const statusColors = {
    pending_payment: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels = {
    pending_payment: 'Aguardando Pagamento',
    active: 'Ativo',
    paused: 'Pausado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-600 mt-1">Gerencie seus pedidos de leads</p>
        </div>
        <Link to={createPageUrl('OrderCreate')}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Pedido
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pedidos Ativos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {orders.filter(o => o.status === 'active').length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aguardando Pagamento</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {orders.filter(o => o.status === 'pending_payment').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Creditado</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  R$ {orders.reduce((sum, o) => sum + (o.total_amount || 0), 0).toFixed(2)}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo Lead</TableHead>
                <TableHead>Estados/DDDs</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const product = products.find(p => p.id === order.product_id);
                const progress = (order.delivered_quantity / order.total_quantity) * 100;
                const creditProgress = order.total_amount > 0 ? (order.consumed_amount / order.total_amount) * 100 : 0;

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {product?.name || 'Produto não encontrado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {order.lead_types === 'ambos' ? 'PJ e PF' : order.lead_types === 'juridica' ? 'PJ' : 'PF'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{order.states?.split(',').length || 0} estados</div>
                        <div className="text-gray-500 text-xs">
                          {order.ddds === 'all' ? 'Todos DDDs' : 
                           order.ddds?.startsWith('except:') ? 'DDDs exceto alguns' : 
                           'DDDs específicos'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{order.delivered_quantity}/{order.total_quantity} leads</div>
                        <div className="text-gray-500">{order.daily_quantity}/dia</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{progress.toFixed(0)}%</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium text-green-600">
                          R$ {(order.total_amount - order.consumed_amount).toFixed(2)}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {creditProgress.toFixed(0)}% usado
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {orders.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum pedido encontrado</p>
              <Link to={createPageUrl('OrderCreate')}>
                <Button className="mt-4">Criar Primeiro Pedido</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
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
import { Play, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DistributionAdmin() {
  const [isRunning, setIsRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['activeOrders'],
    queryFn: async () => {
      return await base44.entities.Order.filter({ status: 'active' }, '-created_date');
    },
  });

  const { data: recentDistributions = [] } = useQuery({
    queryKey: ['recentDistributions'],
    queryFn: async () => {
      const leads = await base44.entities.Lead.filter(
        { is_distributed: true },
        '-distribution_date',
        50
      );
      return leads;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return await base44.entities.Product.list();
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return await base44.entities.Client.list();
    },
  });

  const runDistributionMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('distributeLeads', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Distribuição concluída! ${data.totalDistributed} leads distribuídas.`);
      queryClient.invalidateQueries(['activeOrders']);
      queryClient.invalidateQueries(['recentDistributions']);
      setIsRunning(false);
    },
    onError: (error) => {
      toast.error('Erro ao executar distribuição: ' + error.message);
      setIsRunning(false);
    },
  });

  const handleRunDistribution = async () => {
    if (confirm('Deseja executar a distribuição automática agora?')) {
      setIsRunning(true);
      runDistributionMutation.mutate();
    }
  };

  const todayDistributions = recentDistributions.filter(l => {
    if (!l.distribution_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return l.distribution_date.startsWith(today);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Distribuição Automática</h1>
          <p className="text-gray-600 mt-1">Gerencie a distribuição automática de leads</p>
        </div>
        <Button
          onClick={handleRunDistribution}
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" />
              Executar Agora
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pedidos Ativos</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {activeOrders.length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Distribuídas Hoje</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {todayDistributions.length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Distribuídas</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {recentDistributions.length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Limite Diário</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeOrders.map((order) => {
                const product = products.find(p => p.id === order.product_id);
                const client = clients.find(c => c.id === order.client_id);
                const progress = (order.delivered_quantity / order.total_quantity) * 100;
                
                const today = new Date().toISOString().split('T')[0];
                const todayCount = todayDistributions.filter(l => 
                  l.order_id === order.id
                ).length;
                const dailyProgress = (todayCount / order.daily_quantity) * 100;

                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {client?.name || 'Cliente não encontrado'}
                    </TableCell>
                    <TableCell>{product?.name || 'Produto não encontrado'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {order.delivered_quantity}/{order.total_quantity}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                dailyProgress >= 100 ? 'bg-green-600' : 'bg-yellow-600'
                              }`}
                              style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {todayCount}/{order.daily_quantity}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">
                        Ativo
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {activeOrders.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhum pedido ativo encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Distribuições</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Atribuído Para</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDistributions.slice(0, 20).map((lead) => {
                const product = products.find(p => p.id === lead.product_id);
                
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm">
                      {lead.distribution_date ? format(new Date(lead.distribution_date), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.form_data?.Nome || lead.form_data?.name || 'Sem nome'}
                    </TableCell>
                    <TableCell>{product?.name || 'Produto não encontrado'}</TableCell>
                    <TableCell className="text-sm">{lead.assigned_to || 'Não atribuído'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {lead.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {recentDistributions.length === 0 && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma distribuição realizada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
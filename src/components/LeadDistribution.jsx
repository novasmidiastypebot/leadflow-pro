import { base44 } from '@/api/base44Client';

/**
 * Distribui uma lead automaticamente baseado nas regras do pedido/cliente
 * @param {Object} lead - Lead a ser distribuída
 * @param {String} clientId - ID do cliente que está comprando
 * @param {String} orderId - ID do pedido (opcional)
 * @returns {Object} Lead atualizada
 */
export async function distributeLeadAutomatically(lead, clientId, orderId = null) {
  try {
    // 1. Buscar configuração de distribuição
    let distributionMode = 'manual';
    let assignedTo = null;

    if (orderId) {
      // Se tem pedido, usar configuração do pedido
      const orders = await base44.entities.Order.filter({ id: orderId });
      if (orders.length > 0) {
        const order = orders[0];
        distributionMode = order.distribution_mode;
        if (order.assigned_to) {
          assignedTo = order.assigned_to;
        }
      }
    }

    // Se não tem pedido ou é manual, buscar master do cliente
    if (!assignedTo || distributionMode === 'manual') {
      const teamMembers = await base44.entities.TeamMember.filter({ 
        client_id: clientId,
        role: 'master',
        status: 'active'
      });
      
      if (teamMembers.length > 0) {
        assignedTo = teamMembers[0].email;
        distributionMode = 'manual'; // Master distribui manualmente
      }
    }

    // 2. Se for distribuição automática, buscar melhor membro
    if (distributionMode === 'auto_team') {
      assignedTo = await findBestTeamMember(clientId, lead);
    } else if (distributionMode === 'auto_client') {
      // Auto para o próprio cliente/responsável do pedido
      // Já definido acima
    }

    // 3. Atualizar lead com distribuição
    const updatedLead = await base44.entities.Lead.update(lead.id, {
      assigned_to: assignedTo,
      is_distributed: true,
      distribution_date: new Date().toISOString(),
      order_id: orderId,
      client_id: clientId,
    });

    // 4. Enviar emails de notificação
    await sendDistributionEmails(updatedLead, clientId, assignedTo);

    return updatedLead;
  } catch (error) {
    console.error('Erro ao distribuir lead:', error);
    throw error;
  }
}

/**
 * Encontra o melhor membro da equipe para receber a lead
 * Baseado em: 1) DDD/UF matching, 2) Carga de trabalho
 */
async function findBestTeamMember(clientId, lead) {
  // Buscar todos os membros ativos do cliente
  const teamMembers = await base44.entities.TeamMember.filter({ 
    client_id: clientId,
    status: 'active'
  });

  if (teamMembers.length === 0) {
    return null;
  }

  // Buscar todas as leads já atribuídas para calcular carga
  const allLeads = await base44.entities.Lead.filter({ 
    client_id: clientId,
    is_distributed: true
  });

  // Calcular carga de trabalho de cada membro
  const memberWorkload = {};
  teamMembers.forEach(member => {
    memberWorkload[member.email] = allLeads.filter(
      l => l.assigned_to === member.email && l.status !== 'won' && l.status !== 'lost'
    ).length;
  });

  // Filtrar membros elegíveis por DDD/UF se a lead tiver essas informações
  let eligibleMembers = teamMembers;
  
  // Por enquanto, não temos filtro de região por membro
  // Mas poderia ser adicionado no futuro (campo states_allowed, ddds_allowed no TeamMember)

  // Ordenar por carga de trabalho (menor primeiro)
  eligibleMembers.sort((a, b) => {
    return (memberWorkload[a.email] || 0) - (memberWorkload[b.email] || 0);
  });

  // Retornar o membro com menor carga
  return eligibleMembers[0].email;
}

/**
 * Envia emails de notificação sobre a distribuição da lead
 */
async function sendDistributionEmails(lead, clientId, assignedTo) {
  try {
    // Buscar informações do produto e cliente
    const products = await base44.entities.Product.filter({ id: lead.product_id });
    const productName = products.length > 0 ? products[0].name : 'Produto não especificado';
    
    const clients = await base44.entities.Client.filter({ id: clientId });
    const clientName = clients.length > 0 ? clients[0].name : 'Cliente';

    // Formatar dados da lead
    const leadData = lead.form_data || {};
    let leadDetails = '';
    for (const [key, value] of Object.entries(leadData)) {
      leadDetails += `${key}: ${value}\n`;
    }

    // Email para o Master (cliente)
    const masterEmailBody = `
MASTER
LEAD - ${productName.toUpperCase()}
-----------------------------
${leadDetails}
Esta lead foi distribuída para você.
    `.trim();

    // Email para o Super Admin
    const adminEmailBody = `
LEAD - ${productName.toUpperCase()} - CLIENTE = ${clientName.toUpperCase()}
-----------------------------
${leadDetails}
Lead distribuída para: ${assignedTo}
    `.trim();

    // Enviar email para o master
    if (assignedTo) {
      await base44.integrations.Core.SendEmail({
        to: assignedTo,
        subject: `Nova Lead - ${productName}`,
        body: masterEmailBody,
      });
    }

    // Enviar email para super admin
    // Buscar usuários admin do sistema
    const adminUsers = await base44.entities.User.filter({ role: 'admin' });
    if (adminUsers.length > 0) {
      await base44.integrations.Core.SendEmail({
        to: adminUsers[0].email,
        subject: `Lead Distribuída - ${productName} - ${clientName}`,
        body: adminEmailBody,
      });
    }
  } catch (error) {
    console.error('Erro ao enviar emails de distribuição:', error);
    // Não falhar a distribuição se o email falhar
  }
}

/**
 * Distribui múltiplas leads de uma vez
 */
export async function distributeLeadsBulk(leads, clientId, orderId = null) {
  const results = [];
  
  for (const lead of leads) {
    try {
      const distributed = await distributeLeadAutomatically(lead, clientId, orderId);
      results.push({ success: true, lead: distributed });
    } catch (error) {
      results.push({ success: false, lead, error: error.message });
    }
  }
  
  return results;
}

/**
 * Busca leads disponíveis que atendem aos critérios do pedido
 */
export async function findMatchingLeadsForOrder(order) {
  // Buscar todas as leads não distribuídas
  const availableLeads = await base44.entities.Lead.filter({ 
    is_distributed: false,
    product_id: order.product_id
  });

  // Filtrar leads que atendem aos critérios do pedido
  const matchingLeads = availableLeads.filter(lead => {
    // Verificar tipo de lead
    if (order.lead_types === 'juridica' && lead.lead_type !== 'juridica') return false;
    if (order.lead_types === 'fisica' && lead.lead_type !== 'fisica') return false;
    // Se for 'ambos', aceita qualquer tipo

    // Verificar estado
    if (order.states && lead.state) {
      const acceptedStates = order.states.split(',').map(s => s.trim());
      if (!acceptedStates.includes(lead.state)) return false;
    }

    // Verificar DDD
    if (lead.ddd && order.ddds && order.ddds !== 'all') {
      if (order.ddds.startsWith('except:')) {
        const excludedDdds = order.ddds.replace('except:', '').split(',').map(d => d.trim());
        if (excludedDdds.includes(lead.ddd)) return false;
      } else {
        const acceptedDdds = order.ddds.split(',').map(d => d.trim());
        if (!acceptedDdds.includes(lead.ddd)) return false;
      }
    }

    return true;
  });

  return matchingLeads;
}

/**
 * Processa distribuição automática para um pedido
 * Distribui leads até atingir a quantidade diária ou até acabar o saldo
 */
export async function processOrderDistribution(orderId) {
  const orders = await base44.entities.Order.filter({ id: orderId });
  if (orders.length === 0) return { success: false, message: 'Pedido não encontrado' };
  
  const order = orders[0];
  
  // Verificar se pedido está ativo
  if (order.status !== 'active') {
    return { success: false, message: 'Pedido não está ativo' };
  }

  // Verificar quantas leads já foram entregues hoje
  const today = new Date().toISOString().split('T')[0];
  const todayLeads = await base44.entities.Lead.filter({
    order_id: orderId,
    is_distributed: true
  });
  
  const todayCount = todayLeads.filter(l => 
    l.distribution_date && l.distribution_date.startsWith(today)
  ).length;

  // Calcular quantas leads pode distribuir
  const remainingDaily = order.daily_quantity - todayCount;
  const remainingTotal = order.total_quantity - order.delivered_quantity;
  const toDistribute = Math.min(remainingDaily, remainingTotal);

  if (toDistribute <= 0) {
    return { success: false, message: 'Limite diário ou total atingido' };
  }

  // Buscar leads disponíveis
  const matchingLeads = await findMatchingLeadsForOrder(order);
  const leadsToDistribute = matchingLeads.slice(0, toDistribute);

  if (leadsToDistribute.length === 0) {
    return { success: false, message: 'Nenhuma lead disponível que atenda aos critérios' };
  }

  // Distribuir as leads
  const results = await distributeLeadsBulk(leadsToDistribute, order.client_id, orderId);
  
  // Atualizar pedido
  const successCount = results.filter(r => r.success).length;
  await base44.entities.Order.update(orderId, {
    delivered_quantity: order.delivered_quantity + successCount,
    last_delivery_date: new Date().toISOString()
  });

  return { 
    success: true, 
    distributed: successCount,
    total: leadsToDistribute.length 
  };
}

/**
 * Tenta distribuir uma lead nova para pedidos ativos compatíveis
 */
export async function autoDistributeNewLead(lead) {
  // Buscar pedidos ativos do produto
  const activeOrders = await base44.entities.Order.filter({
    product_id: lead.product_id,
    status: 'active'
  });

  // Filtrar pedidos que aceitam essa lead
  for (const order of activeOrders) {
    const matchingLeads = await findMatchingLeadsForOrder(order);
    
    if (matchingLeads.find(l => l.id === lead.id)) {
      // Verificar limite diário
      const today = new Date().toISOString().split('T')[0];
      const todayLeads = await base44.entities.Lead.filter({
        order_id: order.id,
        is_distributed: true
      });
      
      const todayCount = todayLeads.filter(l => 
        l.distribution_date && l.distribution_date.startsWith(today)
      ).length;

      if (todayCount >= order.daily_quantity) continue;
      if (order.delivered_quantity >= order.total_quantity) continue;

      // Distribuir para este pedido
      try {
        await distributeLeadAutomatically(lead, order.client_id, order.id);
        
        // Atualizar pedido
        await base44.entities.Order.update(order.id, {
          delivered_quantity: order.delivered_quantity + 1,
          last_delivery_date: new Date().toISOString()
        });
        
        return { success: true, orderId: order.id };
      } catch (error) {
        console.error('Erro ao distribuir lead:', error);
        continue;
      }
    }
  }

  return { success: false, message: 'Nenhum pedido ativo compatível encontrado' };
}
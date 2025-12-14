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
    await sendLeadDistributionEmails(updatedLead, clientId, assignedTo);

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
async function sendLeadDistributionEmails(lead, clientId, assignedTo) {
  try {
    // Buscar informações do produto
    let productName = 'Produto';
    if (lead.product_id) {
      const products = await base44.entities.Product.filter({ id: lead.product_id });
      if (products.length > 0) {
        productName = products[0].name;
      }
    }

    // Buscar informações do cliente
    let clientName = 'Cliente';
    const clients = await base44.entities.Client.filter({ id: clientId });
    if (clients.length > 0) {
      clientName = clients[0].name;
    }

    // Formatar dados da lead
    const formData = lead.form_data || {};
    let leadDetails = '';
    for (const [key, value] of Object.entries(formData)) {
      leadDetails += `${key}: ${value}\n`;
    }

    // Email para o MASTER (cliente)
    const masterEmailBody = `MASTER
LEAD - ${productName.toUpperCase()}
-----------------------------
${leadDetails}`;

    await base44.integrations.Core.SendEmail({
      to: assignedTo,
      subject: `Nova Lead Distribuída - ${productName}`,
      body: masterEmailBody,
      from_name: 'LeadManager'
    });

    // Email para o Super Admin
    const adminEmailBody = `SUPER ADMIN
LEAD - ${productName.toUpperCase()} - CLIENTE = ${clientName.toUpperCase()}
-----------------------------
${leadDetails}`;

    // Buscar super admins
    const users = await base44.entities.User.filter({ role: 'admin' });
    for (const admin of users) {
      await base44.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Nova Lead Distribuída - ${productName} - ${clientName}`,
        body: adminEmailBody,
        from_name: 'LeadManager'
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
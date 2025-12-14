import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Função agendada que processa distribuição automática de leads
 * Roda periodicamente para distribuir leads disponíveis para pedidos ativos
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Buscar todos os pedidos ativos
    const activeOrders = await base44.asServiceRole.entities.Order.filter({ 
      status: 'active' 
    });
    
    console.log(`Encontrados ${activeOrders.length} pedidos ativos`);
    
    let totalDistributed = 0;
    const results = [];
    
    for (const order of activeOrders) {
      try {
        // Verificar quantas leads já foram entregues hoje
        const today = new Date().toISOString().split('T')[0];
        const todayLeads = await base44.asServiceRole.entities.Lead.filter({
          order_id: order.id,
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
          console.log(`Pedido ${order.id} - limite atingido`);
          continue;
        }
        
        // Buscar leads disponíveis que atendem aos critérios
        const availableLeads = await base44.asServiceRole.entities.Lead.filter({ 
          is_distributed: false,
          product_id: order.product_id
        });
        
        // Filtrar leads que atendem aos critérios do pedido
        const matchingLeads = availableLeads.filter(lead => {
          // Verificar tipo de lead
          if (order.lead_types === 'juridica' && lead.lead_type !== 'juridica') return false;
          if (order.lead_types === 'fisica' && lead.lead_type !== 'fisica') return false;
          
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
        
        const leadsToDistribute = matchingLeads.slice(0, toDistribute);
        
        if (leadsToDistribute.length === 0) {
          console.log(`Pedido ${order.id} - nenhuma lead disponível`);
          continue;
        }
        
        // Distribuir as leads
        let distributedCount = 0;
        for (const lead of leadsToDistribute) {
          try {
            // Determinar para quem distribuir
            let assignedTo = order.assigned_to;
            
            // Se não tem assigned_to no pedido, buscar master do cliente
            if (!assignedTo) {
              const masterMembers = await base44.asServiceRole.entities.TeamMember.filter({ 
                client_id: order.client_id,
                role: 'master',
                status: 'active'
              });
              
              if (masterMembers.length > 0) {
                assignedTo = masterMembers[0].email;
              }
            }
            
            // Se for distribuição automática para equipe, redistribuir
            if (order.distribution_mode === 'auto_team') {
              const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ 
                client_id: order.client_id,
                status: 'active'
              });
              
              if (teamMembers.length > 0) {
                // Buscar leads já atribuídas para calcular carga
                const allLeads = await base44.asServiceRole.entities.Lead.filter({ 
                  client_id: order.client_id,
                  is_distributed: true
                });
                
                // Calcular carga de trabalho de cada membro
                const memberWorkload = {};
                teamMembers.forEach(member => {
                  memberWorkload[member.email] = allLeads.filter(
                    l => l.assigned_to === member.email && l.status !== 'won' && l.status !== 'lost'
                  ).length;
                });
                
                // Ordenar por carga (menor primeiro)
                teamMembers.sort((a, b) => {
                  return (memberWorkload[a.email] || 0) - (memberWorkload[b.email] || 0);
                });
                
                assignedTo = teamMembers[0].email;
              }
            }
            
            // Atualizar lead
            await base44.asServiceRole.entities.Lead.update(lead.id, {
              assigned_to: assignedTo,
              is_distributed: true,
              distribution_date: new Date().toISOString(),
              order_id: order.id,
              client_id: order.client_id,
            });
            
            distributedCount++;
            
            // Enviar notificação por email
            if (assignedTo) {
              const products = await base44.asServiceRole.entities.Product.filter({ id: lead.product_id });
              const productName = products.length > 0 ? products[0].name : 'Produto';
              
              const clients = await base44.asServiceRole.entities.Client.filter({ id: order.client_id });
              const clientName = clients.length > 0 ? clients[0].name : 'Cliente';
              
              const leadData = lead.form_data || {};
              let leadDetailsRows = '';
              for (const [key, value] of Object.entries(leadData)) {
                leadDetailsRows += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td><td style="padding: 8px; border: 1px solid #ddd;">${value}</td></tr>`;
              }
              
              // Email para o cliente/master
              const clientEmailBody = `
                <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                  <h2 style="color: #2563eb;">Nova Lead Distribuída</h2>
                  <h3 style="color: #059669;">Produto: ${productName.toUpperCase()}</h3>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    ${leadDetailsRows}
                  </table>
                  <p style="margin-top: 20px; color: #666;">Esta lead foi distribuída para você.</p>
                </body>
                </html>
              `;
              
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: assignedTo,
                subject: `Nova Lead - ${productName}`,
                body: clientEmailBody
              });
              
              // Email para o superadmin
              const adminEmailBody = `
                <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                  <h2 style="color: #dc2626;">Lead Distribuída</h2>
                  <h3 style="color: #059669;">Produto: ${productName.toUpperCase()}</h3>
                  <p style="font-size: 16px;"><strong>Cliente:</strong> ${clientName.toUpperCase()}</p>
                  <p style="font-size: 16px;"><strong>Distribuída para:</strong> ${assignedTo}</p>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    ${leadDetailsRows}
                  </table>
                </body>
                </html>
              `;
              
              // Buscar admin
              const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
              if (adminUsers.length > 0) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: adminUsers[0].email,
                  subject: `Lead Distribuída - ${productName} - ${clientName}`,
                  body: adminEmailBody
                });
              }
            }
            
          } catch (error) {
            console.error(`Erro ao distribuir lead ${lead.id}:`, error);
          }
        }
        
        // Atualizar pedido
        if (distributedCount > 0) {
          await base44.asServiceRole.entities.Order.update(order.id, {
            delivered_quantity: order.delivered_quantity + distributedCount,
            last_delivery_date: new Date().toISOString()
          });
          
          totalDistributed += distributedCount;
          results.push({
            orderId: order.id,
            distributed: distributedCount
          });
        }
        
        console.log(`Pedido ${order.id} - ${distributedCount} leads distribuídas`);
        
      } catch (error) {
        console.error(`Erro ao processar pedido ${order.id}:`, error);
        results.push({
          orderId: order.id,
          error: error.message
        });
      }
    }
    
    return Response.json({
      success: true,
      message: `Processamento concluído. ${totalDistributed} leads distribuídas.`,
      totalDistributed,
      results
    });
    
  } catch (error) {
    console.error('Erro ao processar distribuição automática:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});
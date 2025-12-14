import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { formData, embedId } = body;
    
    if (!embedId || !formData) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    
    // Buscar formulário
    const forms = await base44.asServiceRole.entities.FormTemplate.filter({ embed_id: embedId });
    if (forms.length === 0) {
      return Response.json({ error: 'Formulário não encontrado' }, { status: 404 });
    }
    
    const formTemplate = forms[0];
    
    // Criar lead
    const createdLead = await base44.asServiceRole.entities.Lead.create({
      client_id: formTemplate.client_id,
      form_template_id: formTemplate.id,
      product_id: formTemplate.product_id,
      form_data: formData,
      status: 'new',
      priority: 'medium',
      source: 'form_embed',
      is_distributed: false,
    });
    
    // Tentar distribuir automaticamente
    try {
      const activeOrders = await base44.asServiceRole.entities.Order.filter({
        product_id: formTemplate.product_id,
        status: 'active'
      });
      
      for (const order of activeOrders) {
        // Verificar se a lead se encaixa nos critérios do pedido
        let matches = true;
        
        // Verificar tipo de lead
        if (order.lead_types === 'juridica' && createdLead.lead_type !== 'juridica') matches = false;
        if (order.lead_types === 'fisica' && createdLead.lead_type !== 'fisica') matches = false;
        
        // Verificar estado
        if (order.states && createdLead.state) {
          const acceptedStates = order.states.split(',').map(s => s.trim());
          if (!acceptedStates.includes(createdLead.state)) matches = false;
        }
        
        // Verificar DDD
        if (createdLead.ddd && order.ddds && order.ddds !== 'all') {
          if (order.ddds.startsWith('except:')) {
            const excludedDdds = order.ddds.replace('except:', '').split(',').map(d => d.trim());
            if (excludedDdds.includes(createdLead.ddd)) matches = false;
          } else {
            const acceptedDdds = order.ddds.split(',').map(d => d.trim());
            if (!acceptedDdds.includes(createdLead.ddd)) matches = false;
          }
        }
        
        if (!matches) continue;
        
        // Verificar limites
        const today = new Date().toISOString().split('T')[0];
        const todayLeads = await base44.asServiceRole.entities.Lead.filter({
          order_id: order.id,
          is_distributed: true
        });
        
        const todayCount = todayLeads.filter(l => 
          l.distribution_date && l.distribution_date.startsWith(today)
        ).length;
        
        if (todayCount >= order.daily_quantity) continue;
        if (order.delivered_quantity >= order.total_quantity) continue;
        
        // Determinar responsável
        let assignedTo = order.assigned_to;
        
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
        
        if (order.distribution_mode === 'auto_team') {
          const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ 
            client_id: order.client_id,
            status: 'active'
          });
          
          if (teamMembers.length > 0) {
            const allLeads = await base44.asServiceRole.entities.Lead.filter({ 
              client_id: order.client_id,
              is_distributed: true
            });
            
            const memberWorkload = {};
            teamMembers.forEach(member => {
              memberWorkload[member.email] = allLeads.filter(
                l => l.assigned_to === member.email && l.status !== 'won' && l.status !== 'lost'
              ).length;
            });
            
            teamMembers.sort((a, b) => {
              return (memberWorkload[a.email] || 0) - (memberWorkload[b.email] || 0);
            });
            
            assignedTo = teamMembers[0].email;
          }
        }
        
        // Atualizar lead
        await base44.asServiceRole.entities.Lead.update(createdLead.id, {
          assigned_to: assignedTo,
          is_distributed: true,
          distribution_date: new Date().toISOString(),
          order_id: order.id,
          client_id: order.client_id,
        });
        
        // Atualizar pedido
        await base44.asServiceRole.entities.Order.update(order.id, {
          delivered_quantity: order.delivered_quantity + 1,
          last_delivery_date: new Date().toISOString()
        });
        
        // Enviar emails
        if (assignedTo) {
          const products = await base44.asServiceRole.entities.Product.filter({ id: createdLead.product_id });
          const productName = products.length > 0 ? products[0].name : 'Produto';
          
          const clients = await base44.asServiceRole.entities.Client.filter({ id: order.client_id });
          const clientName = clients.length > 0 ? clients[0].name : 'Cliente';
          
          const leadData = createdLead.form_data || {};
          let leadDetailsRows = '';
          for (const [key, value] of Object.entries(leadData)) {
            leadDetailsRows += `<tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${key}</td><td style="padding: 8px; border: 1px solid #ddd;">${value}</td></tr>`;
          }
          
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
          
          const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
          if (adminUsers.length > 0) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: adminUsers[0].email,
              subject: `Lead Distribuída - ${productName} - ${clientName}`,
              body: adminEmailBody
            });
          }
        }
        
        break;
      }
    } catch (error) {
      console.error('Erro ao distribuir lead:', error);
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Erro ao processar formulário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
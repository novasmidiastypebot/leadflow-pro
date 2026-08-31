import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const embedId = body.embedId;
    
    if (!embedId) {
      return Response.json({ error: 'ID do formulário não fornecido' }, { status: 400 });
    }
    
    // Buscar formulário
    const forms = await base44.asServiceRole.entities.FormTemplate.filter({ embed_id: embedId });
    if (forms.length === 0) {
      return Response.json({ error: 'Formulário não encontrado' }, { status: 404 });
    }
    
    const formTemplate = forms[0];
    
    // Buscar campos do formulário
    const fields = await base44.asServiceRole.entities.FormField.filter(
      { form_template_id: formTemplate.id }, 
      'order'
    );
    
    return Response.json({
      formTemplate,
      fields
    });
    
  } catch (error) {
    console.error('Erro ao buscar formulário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
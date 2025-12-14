import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle } from 'lucide-react';
import { autoDistributeNewLead } from '../components/LeadDistribution';

export default function FormEmbed() {
  const [formData, setFormData] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const embedId = urlParams.get('id');

  const { data: formTemplate } = useQuery({
    queryKey: ['form', embedId],
    queryFn: async () => {
      const forms = await base44.entities.FormTemplate.filter({ embed_id: embedId });
      return forms[0];
    },
    enabled: !!embedId,
  });

  const { data: fields = [] } = useQuery({
    queryKey: ['fields', formTemplate?.id],
    queryFn: async () => {
      if (!formTemplate) return [];
      return await base44.entities.FormField.filter({ form_template_id: formTemplate.id }, 'order');
    },
    enabled: !!formTemplate,
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Lead.create(data);
    },
    onSuccess: async (createdLead) => {
      setSubmitted(true);
      
      // Tentar distribuir automaticamente para pedidos ativos
      try {
        await autoDistributeNewLead(createdLead);
      } catch (error) {
        console.error('Erro ao auto-distribuir lead:', error);
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    createLeadMutation.mutate({
      client_id: formTemplate.client_id,
      form_template_id: formTemplate.id,
      product_id: formTemplate.product_id,
      form_data: formData,
      status: 'new',
      priority: 'medium',
      source: 'form_embed',
    });
  };

  const handleFieldChange = (fieldLabel, value) => {
    setFormData({ ...formData, [fieldLabel]: value });
  };

  if (!formTemplate) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Carregando formulário...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center p-8 text-center min-h-screen" style={{ backgroundColor: formTemplate.style_config?.form_bg_color || '#ffffff' }}>
        <div>
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: formTemplate.style_config?.title_color || '#111827' }}>
            Enviado com sucesso!
          </h2>
          <p style={{ color: formTemplate.style_config?.field_text_color || '#374151' }}>
            Obrigado pelo seu interesse. Entraremos em contato em breve.
          </p>
        </div>
      </div>
    );
  }

  const style = formTemplate.style_config || {};

  return (
    <div className="p-6 min-h-screen" style={{ backgroundColor: style.form_bg_color || '#ffffff' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h3 className="text-xl font-bold" style={{ color: style.title_color || '#111827' }}>
            {formTemplate.name}
          </h3>
          {formTemplate.description && (
            <p className="text-sm mt-2" style={{ color: style.field_text_color || '#374151' }}>
              {formTemplate.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
              {fields.map((field) => (
                <div key={field.id}>
                  <Label style={{ color: style.field_text_color || '#374151' }}>
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  
                  {field.field_type === 'textarea' ? (
                    <Textarea
                      placeholder={field.placeholder}
                      required={field.is_required}
                      onChange={(e) => handleFieldChange(field.label, e.target.value)}
                      className="mt-1"
                      style={{
                        borderColor: style.field_border_color || '#d1d5db',
                        color: style.field_text_color || '#374151',
                        fontFamily: style.field_font_family || 'inherit',
                      }}
                    />
                  ) : field.field_type === 'select' ? (
                    <Select
                      required={field.is_required}
                      onValueChange={(value) => handleFieldChange(field.label, value)}
                    >
                      <SelectTrigger 
                        className="mt-1"
                        style={{
                          borderColor: style.field_border_color || '#d1d5db',
                          color: style.field_text_color || '#374151',
                          fontFamily: style.field_font_family || 'inherit',
                        }}
                      >
                        <SelectValue placeholder={field.placeholder || 'Selecione'} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.split(',').map((opt, i) => (
                          <SelectItem key={i} value={opt.trim()}>
                            {opt.trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.field_type === 'checkbox' ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Checkbox
                        required={field.is_required}
                        onCheckedChange={(checked) => handleFieldChange(field.label, checked)}
                      />
                      <Label style={{ color: style.field_text_color || '#374151' }}>
                        {field.placeholder}
                      </Label>
                    </div>
                  ) : (
                    <Input
                      type={
                        field.field_type === 'email' ? 'email' :
                        field.field_type === 'number' ? 'number' :
                        field.field_type === 'date' ? 'date' :
                        field.field_type === 'phone' ? 'tel' :
                        'text'
                      }
                      placeholder={field.placeholder}
                      required={field.is_required}
                      onChange={(e) => handleFieldChange(field.label, e.target.value)}
                      className="mt-1"
                      style={{
                        borderColor: style.field_border_color || '#d1d5db',
                        color: style.field_text_color || '#374151',
                        fontFamily: style.field_font_family || 'inherit',
                      }}
                    />
                  )}
                </div>
              ))}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createLeadMutation.isPending}
                style={{
                  backgroundColor: style.button_bg_color || '#2563eb',
                  color: style.button_text_color || '#ffffff',
                }}
              >
                {createLeadMutation.isPending ? 'Enviando...' : (style.button_text || 'Enviar')}
              </Button>
            </form>
      </div>
    </div>
  );
}
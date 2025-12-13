import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Plus, Trash2, GripVertical, Save, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function FormBuilder() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [productId, setProductId] = useState('');
  const [fields, setFields] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const formId = urlParams.get('id');

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (formId && userProfile) {
      loadForm();
    } else if (!formId && userProfile) {
      // Adicionar campos obrigatórios para novos formulários
      setFields([
        {
          field_type: 'text',
          label: 'Nome',
          placeholder: 'Digite seu nome completo',
          is_required: true,
          options: '',
          is_default: true,
        },
        {
          field_type: 'email',
          label: 'E-mail',
          placeholder: 'Digite seu e-mail',
          is_required: true,
          options: '',
          is_default: true,
        },
        {
          field_type: 'select',
          label: 'Possui CNPJ',
          placeholder: 'Selecione',
          is_required: false,
          options: 'Sim,Não',
          is_default: true,
        }
      ]);
    }
  }, [formId, userProfile]);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
    if (profiles.length > 0) {
      setUserProfile(profiles[0]);
    }
  };

  const loadForm = async () => {
    const forms = await base44.entities.FormTemplate.filter({ id: formId });
    if (forms.length > 0) {
      const form = forms[0];
      setFormName(form.name);
      setFormDescription(form.description || '');
      setProductId(form.product_id || '');
      
      const formFields = await base44.entities.FormField.filter({ form_template_id: formId }, 'order');
      
      // Verificar se campo "Possui CNPJ" já existe
      const hasPossuiCNPJ = formFields.some(f => f.label === 'Possui CNPJ');
      
      // Se não existir, adicionar
      if (!hasPossuiCNPJ) {
        formFields.push({
          field_type: 'select',
          label: 'Possui CNPJ',
          placeholder: 'Selecione',
          is_required: false,
          options: 'Sim,Não',
          is_default: true,
        });
      }
      
      setFields(formFields);
    }
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Product.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  const createFormMutation = useMutation({
    mutationFn: async (data) => {
      const embedId = crypto.randomUUID();
      const form = await base44.entities.FormTemplate.create({
        ...data,
        embed_id: embedId,
      });
      
      // Create fields
      for (let i = 0; i < fields.length; i++) {
        await base44.entities.FormField.create({
          form_template_id: form.id,
          ...fields[i],
          order: i,
        });
      }
      
      return form;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forms']);
      navigate(createPageUrl('FormTemplates'));
    },
  });

  const updateFormMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.FormTemplate.update(formId, data);
      
      // Delete existing fields
      const existingFields = await base44.entities.FormField.filter({ form_template_id: formId });
      for (const field of existingFields) {
        await base44.entities.FormField.delete(field.id);
      }
      
      // Create new fields
      for (let i = 0; i < fields.length; i++) {
        await base44.entities.FormField.create({
          form_template_id: formId,
          field_type: fields[i].field_type,
          label: fields[i].label,
          placeholder: fields[i].placeholder,
          is_required: fields[i].is_required,
          options: fields[i].options,
          is_default: fields[i].is_default,
          order: i,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['forms']);
      navigate(createPageUrl('FormTemplates'));
    },
  });

  const addField = () => {
    setFields([...fields, {
      field_type: 'text',
      label: '',
      placeholder: '',
      is_required: false,
      options: '',
      is_default: false,
    }]);
  };

  const updateField = (index, key, value) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const removeField = (index) => {
    const field = fields[index];
    // Não permitir remover campos padrão (Nome e E-mail)
    if (field.is_default) {
      alert('Este campo é obrigatório e não pode ser removido.');
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const data = {
      client_id: userProfile.client_id,
      name: formName,
      description: formDescription,
      product_id: productId || null,
      status: 'active',
    };

    if (formId) {
      updateFormMutation.mutate(data);
    } else {
      createFormMutation.mutate(data);
    }
  };

  const fieldTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'number', label: 'Número' },
    { value: 'select', label: 'Seleção' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'textarea', label: 'Texto Longo' },
    { value: 'date', label: 'Data' },
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {formId ? 'Editar Formulário' : 'Novo Formulário'}
          </h1>
          <p className="text-gray-600 mt-1">Configure os campos do seu formulário</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Ocultar' : 'Visualizar'} Preview
          </Button>
          <Button onClick={handleSave} disabled={!formName || fields.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Config */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Formulário</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Formulário de Contato"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva o propósito deste formulário"
                />
              </div>
              <div>
                <Label htmlFor="product">Produto Relacionado (opcional)</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Nenhum</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Campos do Formulário</CardTitle>
              <Button size="sm" onClick={addField}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Campo
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm">
                        Campo {index + 1}
                        {field.is_default && <span className="text-blue-600 ml-2 text-xs">(Obrigatório)</span>}
                      </span>
                    </div>
                    {!field.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={field.field_type}
                        onValueChange={(value) => updateField(index, 'field_type', value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Label</Label>
                      <Input
                        className="h-9"
                        value={field.label}
                        onChange={(e) => updateField(index, 'label', e.target.value)}
                        placeholder="Nome do campo"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Placeholder</Label>
                    <Input
                      className="h-9"
                      value={field.placeholder}
                      onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                      placeholder="Texto de exemplo"
                    />
                  </div>

                  {field.field_type === 'select' && (
                    <div>
                      <Label className="text-xs">Opções (separadas por vírgula)</Label>
                      <Input
                        className="h-9"
                        value={field.options}
                        onChange={(e) => updateField(index, 'options', e.target.value)}
                        placeholder="Opção 1, Opção 2, Opção 3"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={field.is_required}
                      onCheckedChange={(checked) => updateField(index, 'is_required', checked)}
                      disabled={field.is_default}
                    />
                    <Label className="text-sm">Campo obrigatório</Label>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum campo adicionado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formName && (
                    <div>
                      <h3 className="text-xl font-bold">{formName}</h3>
                      {formDescription && (
                        <p className="text-sm text-gray-600 mt-1">{formDescription}</p>
                      )}
                    </div>
                  )}

                  {fields.map((field, index) => (
                    <div key={index}>
                      <Label>
                        {field.label || `Campo ${index + 1}`}
                        {field.is_required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.field_type === 'textarea' ? (
                        <Textarea placeholder={field.placeholder} className="mt-1" />
                      ) : field.field_type === 'select' ? (
                        <Select>
                          <SelectTrigger className="mt-1">
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
                          <Checkbox />
                          <Label>{field.placeholder}</Label>
                        </div>
                      ) : (
                        <Input
                          type={field.field_type === 'email' ? 'email' : field.field_type === 'number' ? 'number' : 'text'}
                          placeholder={field.placeholder}
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}

                  <Button className="w-full">Enviar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Documentation() {
  const [copiedSection, setCopiedSection] = useState(null);

  const copyToClipboard = (text, sectionId) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    toast.success('Copiado para área de transferência!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const fullDocumentation = `# Documentação Completa do Sistema LeadManager

**Data:** Janeiro 2026  
**Versão:** 1.0  
**Plataforma:** Base44 (React + Tailwind CSS + Backend Functions)

---

## 1. VISÃO GERAL DO SISTEMA

O **LeadManager** é uma plataforma de gestão e distribuição automatizada de leads para múltiplos clientes. O sistema permite:

- Cadastro e gestão de clientes
- Criação de produtos e categorias
- Precificação dinâmica por tipo de lead, estado e DDD
- Criação de pedidos com critérios específicos
- Formulários personalizáveis com embed
- Distribuição automática de leads baseada em regras
- Gestão hierárquica de equipes (Master, Manager, Supervisor, Producer)
- Marketplace de leads disponíveis
- Dashboard com métricas e KPIs

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Stack Tecnológico

**Frontend:**
- React 18
- TailwindCSS para estilização
- Shadcn/UI para componentes
- React Query para gerenciamento de estado
- React Router DOM para navegação
- Lucide React para ícones

**Backend:**
- Deno (Backend Functions)
- Base44 SDK (@base44/sdk@0.8.4)
- Service Role para operações administrativas

**Integrações:**
- Core.SendEmail (notificações)
- Core.InvokeLLM (processamento inteligente)
- Core.UploadFile (upload de arquivos)

### 2.2 Estrutura de Diretórios

\`\`\`
├── components/
│   ├── ui/                    # Componentes Shadcn/UI
│   ├── AccessControl.jsx      # Controle de acesso hierárquico
│   ├── LeadAssignment.jsx     # Atribuição de leads
│   ├── LeadDistribution.jsx   # Distribuição automática
│   └── UserNotRegisteredError.jsx
├── pages/
│   ├── Dashboard.js           # Dashboard principal
│   ├── Leads.js               # Listagem de leads
│   ├── Orders.js              # Gestão de pedidos
│   ├── OrderCreate.js         # Criação de pedidos
│   ├── Products.js            # Gestão de produtos
│   ├── ProductPricing.js      # Precificação
│   ├── Team.js                # Gestão de equipe
│   ├── FormTemplates.js       # Templates de formulários
│   ├── FormBuilder.js         # Construtor de formulários
│   ├── FormEmbed.js           # Formulário embeddable
│   ├── LeadMarketplace.js     # Marketplace de leads
│   ├── DistributionAdmin.js   # Administração de distribuição
│   ├── AdminClients.js        # Gestão de clientes (admin)
│   ├── AdminUsers.js          # Gestão de usuários (admin)
│   ├── AdminOrders.js         # Gestão de pedidos (admin)
│   └── Settings.js            # Configurações
├── functions/
│   ├── distributeLeads.js     # Distribuição automática agendada
│   ├── getFormEmbed.js        # Buscar formulário para embed
│   └── submitFormEmbed.js     # Submeter formulário embed
├── entities/                  # Esquemas JSON das entidades
└── Layout.js                  # Layout principal
\`\`\`

---

## 3. ENTIDADES DO SISTEMA

### 3.1 Client (Cliente)
Representa empresas/clientes que utilizam o sistema.

**Campos:**
- name: Nome da empresa
- document: CNPJ/CPF
- email: Email de contato
- phone: Telefone
- address: Endereço completo
- city: Cidade
- state: Estado (UF)
- status: active | inactive
- logo_url: URL do logo

### 3.2 Lead
Representa os leads captados e distribuídos.

**Campos:**
- client_id: ID do cliente
- order_id: ID do pedido vinculado
- form_template_id: ID do formulário de origem
- product_id: ID do produto
- assigned_to: Email do responsável
- lead_type: juridica | fisica
- state: Estado (UF)
- ddd: DDD do telefone
- is_distributed: Boolean
- distribution_date: Data de distribuição
- status: new | contacted | qualified | negotiation | won | lost
- source: Origem do lead
- form_data: Object com dados dinâmicos do formulário
- notes: Observações
- priority: low | medium | high
- last_contact_date: Data do último contato
- next_action_date: Data da próxima ação
- next_action: Descrição da próxima ação

### 3.3 Order (Pedido)
Representa pedidos de leads com critérios específicos.

**Campos:**
- client_id: ID do cliente
- product_id: ID do produto
- category_id: ID da categoria
- lead_types: "juridica" | "fisica" | "both"
- states: Estados aceitos (ex: "SP,RJ,MG")
- ddds: DDDs aceitos ou excluídos (ex: "all", "11,21,31", "except:13,21")
- total_quantity: Quantidade total contratada
- daily_quantity: Quantidade diária permitida
- delivered_quantity: Quantidade já entregue
- total_amount: Valor total pago/creditado
- consumed_amount: Valor já consumido
- status: pending_payment | active | paused | completed | cancelled
- distribution_mode: auto_client | auto_team | manual
- assigned_to: Email do responsável
- last_delivery_date: Data da última entrega
- notification_90_sent: Boolean

### 3.4 Product (Produto)
Representa produtos/serviços oferecidos.

**Campos:**
- client_id: ID do cliente (admin)
- category_id: ID da categoria
- name: Nome do produto
- description: Descrição
- price: Preço base
- accepted_lead_types: fisica | juridica | both
- subcategories: Subcategorias separadas por vírgula
- status: active | inactive

### 3.5 ProductCategory (Categoria de Produto)
**Campos:**
- client_id: ID do cliente
- name: Nome da categoria
- description: Descrição
- status: active | inactive

### 3.6 ProductPricing (Precificação)
Precificação específica por tipo, estado e DDD.

**Campos:**
- product_id: ID do produto
- lead_type: juridica | fisica
- state: Estado (UF)
- ddd: DDD específico (opcional)
- price: Preço da lead
- is_active: Boolean

### 3.7 TeamMember (Membro da Equipe)
**Campos:**
- client_id: ID do cliente
- name: Nome completo
- email: Email (único)
- phone: Telefone
- password: Senha criptografada
- role: master | manager | supervisor | producer
- parent_member_id: ID do superior hierárquico
- status: active | inactive

### 3.8 FormTemplate (Template de Formulário)
**Campos:**
- client_id: ID do cliente
- name: Nome do formulário
- description: Descrição
- product_id: ID do produto relacionado
- status: active | inactive
- embed_id: ID único para embed/iframe
- style_config: Object com configurações de estilo

### 3.9 FormField (Campo de Formulário)
**Campos:**
- form_template_id: ID do template
- field_type: text | email | phone | number | select | checkbox | textarea | date | cpf | cnpj
- label: Rótulo do campo
- placeholder: Texto placeholder
- is_required: Boolean
- options: Opções para select (separadas por vírgula)
- order: Ordem de exibição
- is_default: Boolean

---

## 4. FUNÇÕES BACKEND

### 4.1 distributeLeads.js
**Propósito:** Função agendada que executa distribuição automática de leads.

**Fluxo:**
1. Busca todos os pedidos com status = 'active'
2. Para cada pedido:
   - Verifica limite diário e total
   - Busca leads disponíveis (is_distributed = false)
   - Filtra leads que atendem aos critérios (tipo, estado, DDD)
   - Determina responsável pela distribuição
   - Atualiza lead e pedido
   - Envia emails

**Autorização:** Service Role (sem autenticação de usuário)

### 4.2 submitFormEmbed.js
**Propósito:** Processa submissão de formulários embeddable.

**Fluxo:**
1. Recebe formData e embedId
2. Busca o formulário pelo embed_id
3. Cria uma nova lead
4. Tenta distribuir automaticamente
5. Envia notificações

**Autorização:** Service Role (público - sem autenticação)

### 4.3 getFormEmbed.js
**Propósito:** Retorna dados do formulário para embed.

**Fluxo:**
1. Recebe embedId
2. Busca FormTemplate pelo embed_id
3. Busca FormField do template (ordenados)
4. Retorna formulário e campos

**Autorização:** Service Role (público - sem autenticação)

---

## 5. COMPONENTES PRINCIPAIS

### 5.1 AccessControl.jsx
Gerencia controle de acesso baseado em hierarquia.

**Funções:**
- getAccessibleUsers(): Retorna emails acessíveis
- canManageUsers(): Verifica permissões de gestão
- isSuperAdmin(): Verifica se é super admin

**Hierarquia:**
- Super Admin (role='admin'): Acessa tudo
- Master: Acessa toda sua equipe
- Manager/Supervisor: Acessa subordinados
- Producer: Acessa apenas próprias leads

### 5.2 LeadDistribution.jsx
Gerencia distribuição automática de leads.

**Funções:**
- distributeLeadAutomatically(): Distribui uma lead
- bulkDistributeLeads(): Distribui múltiplas leads
- findMatchingLeadsForOrder(): Busca leads compatíveis
- processAutoDistributionForOrder(): Processa distribuição
- attemptAutoDistributionForNewLead(): Tenta distribuir lead nova

**Lógica de Seleção:**
1. Se order tem assigned_to, usa esse email
2. Senão, busca o master do cliente
3. Se distribution_mode = 'auto_team', balanceia carga

---

## 6. FLUXO DE DISTRIBUIÇÃO DE LEADS

### 6.1 Distribuição Automática Agendada
**Trigger:** Função distributeLeads executada periodicamente

**Processo:**
1. Buscar pedidos ativos
2. Para cada pedido:
   - Verificar limites diário e total
   - Buscar leads disponíveis
   - Filtrar por critérios
   - Selecionar leads
   - Determinar responsável
   - Atualizar registros
   - Enviar notificações

### 6.2 Distribuição em Tempo Real (Formulário)
**Trigger:** Submissão de formulário embed

**Processo:**
1. Criar nova lead (is_distributed = false)
2. Buscar pedidos ativos para o produto
3. Verificar compatibilidade e limites
4. Se compatível, distribuir automaticamente
5. Enviar notificações

### 6.3 Distribuição Manual
**Trigger:** Usuário clica em "Distribuir"

**Processo:**
1. Selecionar lead(s) do inventário
2. Selecionar pedido de destino
3. Verificar compatibilidade
4. Confirmar distribuição
5. Atualizar registros

---

## 7. SISTEMA DE NOTIFICAÇÕES

### 7.1 Emails de Distribuição

**Para o Responsável:**
- Título: Nova Lead - {PRODUTO}
- Conteúdo: Dados completos da lead em formato tabela HTML

**Para o Super Admin:**
- Título: Lead Distribuída - {PRODUTO} - {CLIENTE}
- Conteúdo: Dados + informações de distribuição

---

## 8. REGRAS DE NEGÓCIO

### 8.1 Controle de Acesso
- Super Admin: Acessa todos os dados
- Master: Acessa dados do próprio cliente
- Manager/Supervisor: Acessa subordinados
- Producer: Acessa apenas leads atribuídas

### 8.2 Limites de Distribuição
**Limite Diário:**
- Controlado por daily_quantity
- Resetado a cada novo dia
- Soma das distribuições ≤ daily_quantity

**Limite Total:**
- Controlado por total_quantity
- delivered_quantity < total_quantity
- Pedido completa ao atingir total

### 8.3 Critérios de Compatibilidade
**Tipo de Lead:**
- juridica: Apenas PJ
- fisica: Apenas PF
- both: Ambos

**Estados:**
- null/vazio: Aceita todos
- "SP,RJ,MG": Apenas esses

**DDDs:**
- "all": Aceita todos
- "11,21,31": Apenas esses
- "except:13,21": Todos exceto esses

### 8.4 Cálculo de Workload (Auto Team)
**Fórmula:** Conta leads ativas (status ≠ won/lost) por membro
**Distribuição:** Atribui ao membro com menor carga

---

## 9. PROBLEMAS RESOLVIDOS RECENTEMENTE

### 9.1 Leads Não Aparecendo
**Problema:** Queries filtrando incorretamente por client_id

**Solução:** Admin agora lista todas as leads, outros filtram por client_id

### 9.2 Client_ID Sobrescrito
**Problema:** Distribuição sobrescrevendo client_id

**Solução:** Removido client_id das atualizações de distribuição

### 9.3 FormEmbed Requerendo Autenticação
**Problema:** Formulários públicos bloqueados

**Solução:** Backend functions usando asServiceRole

### 9.4 Emails Apenas para Admin
**Problema:** Notificações não chegando aos clientes

**Solução:** Emails separados para cliente e admin

### 9.5 Nome da Lead Não Aparecendo
**Problema:** form_data com campos variados

**Solução:** Fallback para múltiplas variações de nome

---

## 10. MELHORIAS FUTURAS SUGERIDAS

### 10.1 Funcionalidades
1. Webhooks para sistemas externos
2. Relatórios avançados e analytics
3. Automações de follow-up
4. IA para score de leads
5. Mobile app nativo

### 10.2 Otimizações Técnicas
1. Cache com Redis
2. Paginação e lazy loading
3. Rate limiting
4. Monitoramento e alertas
5. Logs estruturados

---

## 11. COMANDOS ÚTEIS

### Desenvolvimento Local
\`\`\`bash
npm install
npm run dev
npm run build
\`\`\`

### Testes de Funções
\`\`\`bash
# Testar distribuição
curl -X POST https://{app-url}/functions/distributeLeads

# Testar formulário
curl -X POST https://{app-url}/functions/submitFormEmbed \\
  -H "Content-Type: application/json" \\
  -d '{"embedId": "xxx", "formData": {...}}'
\`\`\`

---

## 12. ENDPOINTS PRINCIPAIS

### Formulário Embed
**URL:** https://app.base44.com/FormEmbed?id={embed_id}
**Método:** GET
**Público:** Sim

### Backend Functions
**Base URL:** https://{app-url}/functions/

- POST /distributeLeads
- POST /getFormEmbed
- POST /submitFormEmbed

---

## 13. CONSIDERAÇÕES DE SEGURANÇA

1. **Autenticação:** Base44 gerencia auth de usuários
2. **Autorização:** Hierarquia de roles estrita
3. **Dados Sensíveis:** form_data pode conter PII
4. **Validação:** Sanitização de inputs e verificação de permissões

---

## 14. TROUBLESHOOTING COMUM

**Leads não aparecem:**
- Verificar client_id correto
- Verificar hierarquia de acesso
- Verificar filtros aplicados

**Distribuição não funciona:**
- Verificar status do pedido (active)
- Verificar limites (daily/total)
- Verificar critérios de compatibilidade
- Verificar logs da função

**Formulário não submete:**
- Verificar embed_id correto
- Verificar campos obrigatórios
- Verificar logs do browser
- Verificar função backend

---

## 15. CONTATOS E REFERÊNCIAS

**Plataforma:** Base44
**Documentação:** https://docs.base44.com
**SDK:** @base44/sdk@0.8.4

**Tecnologias:**
- React: https://react.dev
- TailwindCSS: https://tailwindcss.com
- Shadcn/UI: https://ui.shadcn.com
- Deno: https://deno.land

---

**Fim da Documentação**

Para dúvidas ou suporte adicional, consulte a documentação do Base44 ou contate o desenvolvedor responsável.`;

  const sections = [
    { id: 1, title: '1. Visão Geral', lines: '1-50' },
    { id: 2, title: '2. Arquitetura', lines: '51-100' },
    { id: 3, title: '3. Entidades', lines: '101-250' },
    { id: 4, title: '4. Funções Backend', lines: '251-300' },
    { id: 5, title: '5. Componentes', lines: '301-350' },
    { id: 6, title: '6. Fluxo de Distribuição', lines: '351-400' },
    { id: 7, title: '7. Notificações', lines: '401-420' },
    { id: 8, title: '8. Regras de Negócio', lines: '421-470' },
    { id: 9, title: '9. Problemas Resolvidos', lines: '471-520' },
    { id: 10, title: '10-15. Melhorias e Referências', lines: '521-fim' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documentação do Sistema</h1>
          <p className="text-gray-600 mt-1">LeadManager v1.0 - Janeiro 2026</p>
        </div>
        <Button
          onClick={() => copyToClipboard(fullDocumentation, 'full')}
          className="gap-2"
        >
          {copiedSection === 'full' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Copiar Tudo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📋 Índice de Conteúdo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-sm">{section.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const anchor = document.getElementById(`section-${section.id}`);
                    anchor?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Ver
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-1">1. Visão Geral do Sistema</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(`## 1. VISÃO GERAL DO SISTEMA

O **LeadManager** é uma plataforma de gestão e distribuição automatizada de leads para múltiplos clientes. O sistema permite:

- Cadastro e gestão de clientes
- Criação de produtos e categorias
- Precificação dinâmica por tipo de lead, estado e DDD
- Criação de pedidos com critérios específicos
- Formulários personalizáveis com embed
- Distribuição automática de leads baseada em regras
- Gestão hierárquica de equipes (Master, Manager, Supervisor, Producer)
- Marketplace de leads disponíveis
- Dashboard com métricas e KPIs`, '1')}
          >
            {copiedSection === '1' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent className="prose max-w-none">
          <p>O <strong>LeadManager</strong> é uma plataforma de gestão e distribuição automatizada de leads para múltiplos clientes.</p>
          <ul className="space-y-2">
            <li>✅ Cadastro e gestão de clientes</li>
            <li>✅ Criação de produtos e categorias</li>
            <li>✅ Precificação dinâmica por tipo de lead, estado e DDD</li>
            <li>✅ Criação de pedidos com critérios específicos</li>
            <li>✅ Formulários personalizáveis com embed</li>
            <li>✅ Distribuição automática de leads baseada em regras</li>
            <li>✅ Gestão hierárquica de equipes (Master, Manager, Supervisor, Producer)</li>
            <li>✅ Marketplace de leads disponíveis</li>
            <li>✅ Dashboard com métricas e KPIs</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-2">2. Arquitetura do Sistema</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 2. ARQUITETURA DO SISTEMA

### Stack Tecnológico
**Frontend:** React 18, TailwindCSS, Shadcn/UI, React Query, React Router DOM
**Backend:** Deno (Backend Functions), Base44 SDK (@base44/sdk@0.8.4)
**Integrações:** Core.SendEmail, Core.InvokeLLM, Core.UploadFile

### Estrutura de Diretórios
- components/ (UI, AccessControl, LeadAssignment, LeadDistribution)
- pages/ (Dashboard, Leads, Orders, Products, Forms, etc)
- functions/ (distributeLeads, getFormEmbed, submitFormEmbed)
- entities/ (Esquemas JSON)
- Layout.js`, '2')}>
            {copiedSection === '2' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Stack Tecnológico</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-medium text-sm mb-1">Frontend</p>
                  <p className="text-xs text-gray-600">React 18, TailwindCSS, Shadcn/UI, React Query</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="font-medium text-sm mb-1">Backend</p>
                  <p className="text-xs text-gray-600">Deno Functions, Base44 SDK @0.8.4</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Estrutura de Diretórios</h4>
              <div className="bg-gray-50 p-3 rounded font-mono text-xs">
                <div>📁 components/ (UI, AccessControl, LeadDistribution)</div>
                <div>📁 pages/ (Dashboard, Leads, Orders, Forms...)</div>
                <div>📁 functions/ (distributeLeads, submitFormEmbed...)</div>
                <div>📁 entities/ (Esquemas JSON)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-3">3. Entidades Principais</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 3. ENTIDADES DO SISTEMA

### Client - Cliente
name, document, email, phone, address, city, state, status, logo_url

### Lead - Lead
client_id, order_id, form_template_id, product_id, assigned_to, lead_type, state, ddd, is_distributed, distribution_date, status, source, form_data, priority

### Order - Pedido
client_id, product_id, category_id, lead_types, states, ddds, total_quantity, daily_quantity, delivered_quantity, total_amount, consumed_amount, status, distribution_mode, assigned_to

### Product - Produto
client_id, category_id, name, description, price, accepted_lead_types, subcategories, status

### TeamMember - Membro da Equipe
client_id, name, email, phone, password, role, parent_member_id, status

### FormTemplate - Template de Formulário
client_id, name, description, product_id, status, embed_id, style_config

### ProductPricing - Precificação
product_id, lead_type, state, ddd, price, is_active`, '3')}>
            {copiedSection === '3' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Client', desc: 'Empresas/clientes do sistema', color: 'bg-blue-100' },
              { name: 'Lead', desc: 'Leads captadas e distribuídas', color: 'bg-green-100' },
              { name: 'Order', desc: 'Pedidos com critérios específicos', color: 'bg-purple-100' },
              { name: 'Product', desc: 'Produtos/serviços oferecidos', color: 'bg-orange-100' },
              { name: 'TeamMember', desc: 'Membros da equipe do cliente', color: 'bg-pink-100' },
              { name: 'FormTemplate', desc: 'Templates de formulários embed', color: 'bg-yellow-100' },
              { name: 'ProductPricing', desc: 'Precificação por tipo/estado/DDD', color: 'bg-cyan-100' },
              { name: 'LeadInventory', desc: 'Estoque de leads disponíveis', color: 'bg-indigo-100' },
            ].map((entity) => (
              <div key={entity.name} className={`${entity.color} p-3 rounded`}>
                <p className="font-semibold text-sm">{entity.name}</p>
                <p className="text-xs text-gray-700 mt-1">{entity.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-4">4. Funções Backend</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 4. FUNÇÕES BACKEND

### distributeLeads.js
**Propósito:** Distribuição automática agendada
**Fluxo:** Busca pedidos ativos → Verifica limites → Filtra leads compatíveis → Distribui → Envia emails
**Autorização:** Service Role

### submitFormEmbed.js
**Propósito:** Processa submissão de formulários embed
**Fluxo:** Recebe dados → Cria lead → Tenta distribuir automaticamente → Notifica
**Autorização:** Service Role (público)

### getFormEmbed.js
**Propósito:** Retorna dados do formulário para embed
**Fluxo:** Busca template e campos pelo embed_id
**Autorização:** Service Role (público)`, '4')}>
            {copiedSection === '4' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="font-semibold">distributeLeads.js</p>
              <p className="text-sm text-gray-600">Distribuição automática agendada - processa pedidos ativos e distribui leads</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="font-semibold">submitFormEmbed.js</p>
              <p className="text-sm text-gray-600">Processa formulários embed - cria lead e tenta distribuir automaticamente</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="font-semibold">getFormEmbed.js</p>
              <p className="text-sm text-gray-600">Retorna dados do formulário para renderização em iframe</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-6">6. Fluxo de Distribuição</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 6. FLUXO DE DISTRIBUIÇÃO DE LEADS

### Distribuição Automática Agendada
1. Buscar pedidos ativos
2. Verificar limites (diário e total)
3. Buscar leads disponíveis
4. Filtrar por critérios (tipo, estado, DDD)
5. Determinar responsável
6. Atualizar registros
7. Enviar notificações

### Distribuição em Tempo Real (Formulário)
1. Criar nova lead
2. Buscar pedidos ativos
3. Verificar compatibilidade
4. Distribuir se possível
5. Notificar

### Distribuição Manual
1. Selecionar leads do marketplace
2. Escolher pedido de destino
3. Verificar limites
4. Confirmar distribuição`, '6')}>
            {copiedSection === '6' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
                Distribuição Automática Agendada
              </h4>
              <p className="text-sm text-gray-600 ml-8">Função executada periodicamente que processa pedidos ativos e distribui leads baseado em critérios e limites.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
                Distribuição em Tempo Real
              </h4>
              <p className="text-sm text-gray-600 ml-8">Quando formulário é submetido, lead é criada e sistema tenta distribuir imediatamente para pedido compatível.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
                Distribuição Manual
              </h4>
              <p className="text-sm text-gray-600 ml-8">Usuário seleciona leads do marketplace e atribui manualmente a um pedido específico.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-8">8. Regras de Negócio</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 8. REGRAS DE NEGÓCIO

### Controle de Acesso
- Super Admin: Acessa todos os dados
- Master: Acessa dados do próprio cliente
- Manager/Supervisor: Acessa subordinados
- Producer: Acessa apenas leads atribuídas

### Limites de Distribuição
**Diário:** Resetado a cada dia, soma ≤ daily_quantity
**Total:** delivered_quantity < total_quantity

### Critérios de Compatibilidade
**Tipo:** juridica, fisica ou both
**Estados:** Lista específica ou todos
**DDDs:** all, lista específica ou except:lista

### Workload (Auto Team)
Distribui para membro com menor número de leads ativas`, '8')}>
            {copiedSection === '8' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">🔒 Controle de Acesso</h4>
              <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                <p><span className="font-medium">Super Admin:</span> Acessa todos os dados do sistema</p>
                <p><span className="font-medium">Master:</span> Acessa dados do próprio cliente e gerencia equipe</p>
                <p><span className="font-medium">Manager/Supervisor:</span> Acessa subordinados diretos</p>
                <p><span className="font-medium">Producer:</span> Acessa apenas leads atribuídas</p>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">📊 Limites de Distribuição</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="font-medium text-sm">Limite Diário</p>
                  <p className="text-xs text-gray-600">Resetado a cada dia</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="font-medium text-sm">Limite Total</p>
                  <p className="text-xs text-gray-600">Quantidade contratada</p>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Critérios de Compatibilidade</h4>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <p><span className="font-medium">Tipo:</span> juridica, fisica ou both</p>
                <p><span className="font-medium">Estados:</span> Lista específica ou todos</p>
                <p><span className="font-medium">DDDs:</span> all, lista ou except:lista</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-9">9. Problemas Resolvidos Recentemente</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 9. PROBLEMAS RESOLVIDOS

✅ Leads não aparecendo - Corrigido filtro de queries para admin e client_id
✅ Client_ID sobrescrito - Removido atualização incorreta na distribuição
✅ FormEmbed bloqueado - Backend functions usando asServiceRole
✅ Emails só para admin - Emails separados para cliente e admin
✅ Nome da lead não aparecendo - Fallback para múltiplas variações`, '9')}>
            {copiedSection === '9' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { issue: 'Leads não aparecendo', fix: 'Corrigido filtro de queries para admin ver tudo e outros por client_id' },
              { issue: 'Client_ID sobrescrito', fix: 'Removido atualização incorreta do client_id na distribuição' },
              { issue: 'FormEmbed bloqueado', fix: 'Backend functions usando asServiceRole para acesso público' },
              { issue: 'Emails só para admin', fix: 'Criado envio separado para cliente/responsável e admin' },
              { issue: 'Nome da lead não aparece', fix: 'Implementado fallback para "Nome", "nome", "name"' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded">
                <span className="text-green-600 font-bold">✅</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{item.issue}</p>
                  <p className="text-xs text-gray-600">{item.fix}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle id="section-10">10. Melhorias Futuras</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`## 10. MELHORIAS FUTURAS

### Funcionalidades
- Webhooks para sistemas externos
- Relatórios avançados e analytics
- Automações de follow-up
- IA para score de leads
- Mobile app nativo

### Otimizações
- Cache com Redis
- Paginação e lazy loading
- Rate limiting
- Monitoramento e alertas`, '10')}>
            {copiedSection === '10' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">💡 Funcionalidades</h4>
              <ul className="space-y-1 text-sm">
                <li>• Webhooks para CRMs</li>
                <li>• Relatórios avançados</li>
                <li>• Automações de follow-up</li>
                <li>• IA para scoring</li>
                <li>• Mobile app</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">⚡ Otimizações</h4>
              <ul className="space-y-1 text-sm">
                <li>• Cache com Redis</li>
                <li>• Paginação</li>
                <li>• Rate limiting</li>
                <li>• Monitoramento</li>
                <li>• Logs estruturados</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Plataforma:</strong> Base44 | <strong>SDK:</strong> @base44/sdk@0.8.4
            </p>
            <p className="text-xs text-gray-500">
              React 18 • TailwindCSS • Deno • Service Role
            </p>
            <Button
              onClick={() => copyToClipboard(fullDocumentation, 'full')}
              className="mt-4"
            >
              {copiedSection === 'full' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copiar Documentação Completa
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
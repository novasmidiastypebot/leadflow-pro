import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Products() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
    const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
    if (profiles.length > 0) {
      setUserProfile(profiles[0]);
    }
  };

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.ProductCategory.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', userProfile?.client_id],
    queryFn: async () => {
      if (!userProfile) return [];
      return await base44.entities.Product.filter({ client_id: userProfile.client_id });
    },
    enabled: !!userProfile,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductCategory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowCategoryDialog(false);
      setEditingCategory(null);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductCategory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowCategoryDialog(false);
      setEditingCategory(null);
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowProductDialog(false);
      setEditingProduct(null);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowProductDialog(false);
      setEditingProduct(null);
    },
  });

  const handleSaveCategory = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      client_id: userProfile.client_id,
      name: formData.get('name'),
      description: formData.get('description'),
      status: 'active',
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      client_id: userProfile.client_id,
      category_id: formData.get('category_id'),
      name: formData.get('name'),
      description: formData.get('description'),
      price: parseFloat(formData.get('price')) || 0,
      accepted_lead_types: formData.get('accepted_lead_types'),
      subcategories: formData.get('subcategories') || null,
      status: 'active',
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Produtos & Categorias</h1>
        <p className="text-gray-600 mt-1">Gerencie seus produtos e categorias</p>
      </div>

      {/* Categories Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categorias</CardTitle>
          <Button onClick={() => { setEditingCategory(null); setShowCategoryDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditingCategory(category); setShowCategoryDialog(true); }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Products Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtos</CardTitle>
          <Button onClick={() => { setEditingProduct(null); setShowProductDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo Aceito</TableHead>
                <TableHead>Subcategorias</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const category = categories.find(c => c.id === product.category_id);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{category?.name || 'Sem categoria'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {product.accepted_lead_types === 'both' ? 'PF e PJ' : 
                         product.accepted_lead_types === 'fisica' ? 'PF' : 
                         product.accepted_lead_types === 'juridica' ? 'PJ' : 'Indiferente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {product.subcategories ? (
                        <div className="flex flex-wrap gap-1">
                          {product.subcategories.split(',').slice(0, 2).map((sub, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {sub.trim()}
                            </Badge>
                          ))}
                          {product.subcategories.split(',').length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{product.subcategories.split(',').length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {product.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setEditingProduct(product); setShowProductDialog(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingCategory?.name}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingCategory?.description}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div>
              <Label htmlFor="category_id">Categoria *</Label>
              <Select name="category_id" defaultValue={editingProduct?.category_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingProduct?.name}
                placeholder="Ex: Bradesco, Ademicon, Multimarcas"
                required
              />
            </div>
            <div>
              <Label htmlFor="accepted_lead_types">Tipo de Lead Aceito *</Label>
              <Select name="accepted_lead_types" defaultValue={editingProduct?.accepted_lead_types || 'both'} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Indiferente (PF e PJ)</SelectItem>
                  <SelectItem value="fisica">Apenas Pessoa Física (PF)</SelectItem>
                  <SelectItem value="juridica">Apenas Pessoa Jurídica (PJ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="subcategories">Subcategorias</Label>
              <Input
                id="subcategories"
                name="subcategories"
                defaultValue={editingProduct?.subcategories}
                placeholder="Ex: Imóvel, Auto, Maquinários (separadas por vírgula)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Opcional: separe por vírgula para criar subcategorias
              </p>
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={editingProduct?.description}
              />
            </div>
            <div>
              <Label htmlFor="price">Preço Base (opcional)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                defaultValue={editingProduct?.price}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Configure preços específicos por estado/DDD na página de Precificação
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowProductDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


# Plano: Componente ProductForm para Catálogo de Produtos

## Visao Geral

Criar um formulário completo para gerenciamento de produtos do catálogo, incluindo a estrutura de dados e estado necessários.

## Arquitetura da Solucao

```text
ProductForm (Dialog)
├── Campos principais do Produto
│   ├── name (obrigatório)
│   ├── description (opcional)
│   ├── sku (código único)
│   ├── cost_price (CurrencyInput)
│   └── image_url (opcional)
├── Gerenciamento de Precificação
│   └── ProductPricingDetailManager (sub-componente)
│       └── Lista de detalhes com modelo de precificação
└── Ações
    ├── Salvar (create/update via Supabase)
    └── Cancelar
```

## Etapas de Implementacao

### Etapa 1: Atualizar Tipos TypeScript

Adicionar interfaces `Product` e `ProductPricingDetail` em `src/types/database.ts`:

```typescript
// Catalog Types - Products
export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  sku?: string;
  cost_price: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPricingDetail {
  id: string;
  product_id: string;
  pricing_model_id: string;
  base_price?: number;
  min_units?: number;
  max_units?: number;
  unit_name?: string;
  created_at: string;
  updated_at: string;
}
```

### Etapa 2: Expandir CatalogSlice

Adicionar gerenciamento de produtos no store Zustand:

| Estado | Tipo | Descricao |
|--------|------|-----------|
| products | Product[] | Lista de produtos |
| productPricingDetails | ProductPricingDetail[] | Detalhes de precificacao |

| Acao | Parametros | Descricao |
|------|------------|-----------|
| setProducts | products[] | Define lista completa |
| addProduct | product | Adiciona produto |
| updateProduct | id, updates | Atualiza produto |
| deleteProduct | id | Remove produto |
| setProductPricingDetails | details[] | Define detalhes |
| addProductPricingDetail | detail | Adiciona detalhe |
| updateProductPricingDetail | id, updates | Atualiza detalhe |
| deleteProductPricingDetail | id | Remove detalhe |

### Etapa 3: Integrar com useInitializeData

Adicionar carregamento inicial das tabelas `products` e `product_pricing_details`:

```typescript
// Adicionar nas queries paralelas
supabase.from('products').select('*').order('name', { ascending: true }),
supabase.from('product_pricing_details').select('*'),
```

### Etapa 4: Integrar com useRealtimeSync

Adicionar listeners de realtime para sincronizacao automatica:

```typescript
// Products
.on('postgres_changes', 
  { event: '*', schema: 'public', table: 'products', filter: `user_id=eq.${userId}` },
  // handler INSERT/UPDATE/DELETE
)
// Product Pricing Details  
.on('postgres_changes',
  { event: '*', schema: 'public', table: 'product_pricing_details' },
  // handler INSERT/UPDATE/DELETE
)
```

### Etapa 5: Atualizar resetStore

Incluir `products: []` e `productPricingDetails: []` na funcao de reset.

### Etapa 6: Criar ProductForm Component

Arquivo: `src/components/products/ProductForm.tsx`

**Props:**
```typescript
interface ProductFormProps {
  product?: Product;      // undefined = modo criacao
  onClose: () => void;
}
```

**Campos do Formulario:**

| Campo | Componente | Validacao |
|-------|------------|-----------|
| name | Input | Obrigatorio, max 50 chars |
| description | Textarea | Opcional, max 200 chars |
| sku | Input | Opcional, max 30 chars |
| cost_price | CurrencyInput | Obrigatorio, max 999.999.999,99 |
| image_url | Input | Opcional, URL valida |

**Comportamento:**
- Modo criacao: campos vazios, botao "Criar Produto"
- Modo edicao: pre-preenche com dados do produto, botao "Salvar Alteracoes"
- Validacao com feedback visual
- Toast de sucesso/erro apos operacao
- Fecha dialog apos sucesso

### Etapa 7: Sub-componente ProductPricingDetailManager (Opcional/Futuro)

Para gerenciar os detalhes de precificacao associados ao produto. Pode ser implementado como segunda fase.

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/types/database.ts` | Editar | Adicionar Product e ProductPricingDetail |
| `src/stores/slices/catalogSlice.ts` | Editar | Adicionar estado e acoes de products |
| `src/stores/useAppStore.ts` | Editar | Incluir products no resetStore |
| `src/hooks/useInitializeData.ts` | Editar | Carregar products e details |
| `src/hooks/useRealtimeSync.ts` | Editar | Sincronizar products em tempo real |
| `src/components/products/ProductForm.tsx` | Criar | Formulario principal |

## Secao Tecnica

### Estrutura do Banco de Dados (Existente)

```text
products
├── id: uuid (PK)
├── user_id: uuid (FK -> auth.users)
├── name: text (NOT NULL)
├── description: text
├── sku: text
├── cost_price: numeric
├── image_url: text
├── is_active: boolean (default true)
├── created_at: timestamptz
└── updated_at: timestamptz

product_pricing_details
├── id: uuid (PK)
├── product_id: uuid (FK -> products)
├── pricing_model_id: uuid (FK -> pricing_models)
├── base_price: numeric
├── min_units: integer
├── max_units: integer
├── unit_name: text
├── created_at: timestamptz
└── updated_at: timestamptz
```

### Padrao de Formulario (Seguindo InvestmentForm)

```typescript
// Estrutura do componente
export function ProductForm({ product, onClose }: ProductFormProps) {
  // Estados locais para cada campo
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  // ...

  // Efeito para popular em modo edicao
  useEffect(() => {
    if (product) {
      setName(product.name);
      setCostPrice(numberToBRL(product.cost_price));
      // ...
    }
  }, [product]);

  // Handler de submit com persistencia Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: name.trim(),
      cost_price: parseBRLToNumber(costPrice),
      // ...
    };

    if (product?.id) {
      // UPDATE
      await supabase.from('products').update(data).eq('id', product.id);
      updateProduct(product.id, data);
    } else {
      // INSERT
      const { data: newProduct } = await supabase.from('products').insert(data).select().single();
      addProduct(newProduct);
    }
    
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          {/* Campos */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Validacao com Zod (Opcional)

```typescript
const productSchema = z.object({
  name: z.string().trim().min(1).max(50),
  description: z.string().max(200).optional(),
  sku: z.string().max(30).optional(),
  cost_price: z.number().min(0).max(999999999.99),
  image_url: z.string().url().optional().or(z.literal('')),
});
```


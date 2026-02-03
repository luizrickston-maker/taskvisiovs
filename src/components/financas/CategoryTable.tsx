import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { CategoryFormDialog } from './CategoryFormDialog';
import type { UserIncomeCategory, UserDebtCategory } from '@/types/database';

type Category = UserIncomeCategory | UserDebtCategory;

interface CategoryTableProps {
  categories: Category[];
  onCreateCategory: (data: { name: string; description?: string }) => void;
  onUpdateCategory: (id: string, data: { name?: string; description?: string }) => void;
  onDeleteCategory: (id: string) => void;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
  emptyMessage?: string;
  dialogTitle: string;
  dialogDescription: string;
}

export function CategoryTable({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  isCreating = false,
  isUpdating = false,
  isDeleting = false,
  emptyMessage = 'Nenhuma categoria encontrada.',
  dialogTitle,
  dialogDescription,
}: CategoryTableProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const handleCreate = (data: { name: string; description?: string }) => {
    onCreateCategory(data);
    setCreateDialogOpen(false);
  };

  const handleUpdate = (data: { name: string; description?: string }) => {
    if (editingCategory) {
      onUpdateCategory(editingCategory.id, data);
      setEditingCategory(null);
    }
  };

  const handleDelete = () => {
    if (deletingCategory) {
      onDeleteCategory(deletingCategory.id);
      setDeletingCategory(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Descrição</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {category.description || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCategory(category)}
                        aria-label="Editar categoria"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingCategory(category)}
                        aria-label="Excluir categoria"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <CategoryFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        isLoading={isCreating}
        title={dialogTitle}
        description={dialogDescription}
      />

      {/* Edit Dialog */}
      <CategoryFormDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        onSubmit={handleUpdate}
        isLoading={isUpdating}
        initialData={editingCategory || undefined}
        title={`Editar ${dialogTitle.toLowerCase().replace('nova ', '')}`}
        description="Atualize as informações da categoria."
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deletingCategory?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

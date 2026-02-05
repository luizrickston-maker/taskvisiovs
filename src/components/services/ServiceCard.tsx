 import { useState } from 'react';
 import { MoreVertical, Pencil, Trash2, Clock, DollarSign } from 'lucide-react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
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
 import { Badge } from '@/components/ui/badge';
 import { toast } from 'sonner';
 import { supabase } from '@/integrations/supabase/client';
 import { useAppStore } from '@/stores/useAppStore';
 import { formatCurrency } from '@/lib/currency';
 import type { Service, ServicePricingDetail } from '@/types/database';
 
 interface ServiceCardProps {
   service: Service;
   pricingDetails?: ServicePricingDetail[];
   onEdit?: (service: Service) => void;
 }
 
 export function ServiceCard({ service, pricingDetails = [], onEdit }: ServiceCardProps) {
   const { deleteService } = useAppStore();
   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
 
   // Calculate sale price from pricing details
   const calculatedSalePrice = pricingDetails.reduce((total, detail) => {
     if (detail.base_price) return total + detail.base_price;
     if (detail.hourly_rate && service.expected_duration_hours) {
       return total + (detail.hourly_rate * service.expected_duration_hours);
     }
     return total;
   }, 0);
 
   const handleDelete = async () => {
     setIsDeleting(true);
     try {
       const { error } = await supabase
         .from('services')
         .delete()
         .eq('id', service.id);
 
       if (error) throw error;
 
       deleteService(service.id);
       toast.success('Serviço excluído com sucesso');
     } catch (error) {
       console.error('Erro ao excluir serviço:', error);
       toast.error('Erro ao excluir serviço');
     } finally {
       setIsDeleting(false);
       setShowDeleteDialog(false);
     }
   };
 
   return (
     <>
       <Card className="glass-card hover:shadow-lg transition-shadow duration-200">
         <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
           <div className="space-y-1 flex-1">
             <div className="flex items-center gap-2">
               <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
               {!service.is_active && (
                 <Badge variant="secondary" className="text-xs">Inativo</Badge>
               )}
             </div>
             {service.description && (
               <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                 {service.description}
               </CardDescription>
             )}
           </div>
           
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon" className="h-8 w-8">
                 <MoreVertical className="h-4 w-4" />
                 <span className="sr-only">Menu</span>
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuItem onClick={() => onEdit?.(service)}>
                 <Pencil className="mr-2 h-4 w-4" />
                 Editar
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={() => setShowDeleteDialog(true)}
                 className="text-destructive focus:text-destructive"
               >
                 <Trash2 className="mr-2 h-4 w-4" />
                 Excluir
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </CardHeader>
         
         <CardContent className="space-y-3">
           <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2 text-sm">
               <DollarSign className="h-4 w-4 text-muted-foreground" />
               <span className="text-muted-foreground">Custo base:</span>
               <span className="font-medium">{formatCurrency(service.base_cost || 0)}</span>
             </div>
             
             {service.expected_duration_hours && (
               <div className="flex items-center gap-2 text-sm">
                 <Clock className="h-4 w-4 text-muted-foreground" />
                 <span className="text-muted-foreground">Duração:</span>
                 <span className="font-medium">{service.expected_duration_hours}h</span>
               </div>
             )}
           </div>
           
           {calculatedSalePrice > 0 && (
             <div className="pt-2 border-t border-border">
               <div className="flex items-center justify-between">
                 <span className="text-sm text-muted-foreground">Preço de venda:</span>
                 <span className="text-lg font-bold text-primary">
                   {formatCurrency(calculatedSalePrice)}
                 </span>
               </div>
             </div>
           )}
         </CardContent>
       </Card>
 
       <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
             <AlertDialogDescription>
               Tem certeza que deseja excluir o serviço "{service.name}"? 
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
     </>
   );
 }
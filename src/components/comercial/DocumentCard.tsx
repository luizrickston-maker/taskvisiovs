import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, FileSpreadsheet, Image as ImageIcon, 
  Download, Trash2, Loader2, ExternalLink 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProspectDocument, DocumentType } from '@/types/database';

interface DocumentCardProps {
  document: ProspectDocument;
  documentTypes: DocumentType[];
  onDelete: (id: string) => void;
}

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return FileText;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  if (mimeType.includes('image')) return ImageIcon;
  return FileText;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentCard({ document, documentTypes, onDelete }: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const Icon = getFileIcon(document.mime_type);
  const documentType = document.document_type_id 
    ? documentTypes.find(dt => dt.id === document.document_type_id)
    : null;

  const isImage = document.mime_type?.includes('image');

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('prospect-documents')
        .createSignedUrl(document.file_path, 60);
      
      if (error) throw error;
      
      // Open in new tab or download
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao baixar arquivo');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('prospect-documents')
        .remove([document.file_path]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('prospect_documents')
        .delete()
        .eq('id', document.id);
      
      if (dbError) throw dbError;
      
      onDelete(document.id);
      toast.success('Documento excluído!');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao excluir documento');
    } finally {
      setIsDeleting(false);
    }
  };

  // Load preview for images
  const loadPreview = async () => {
    if (isImage && !previewUrl) {
      try {
        const { data } = await supabase.storage
          .from('prospect-documents')
          .createSignedUrl(document.file_path, 300);
        if (data) setPreviewUrl(data.signedUrl);
      } catch (error) {
        console.error('Error loading preview:', error);
      }
    }
  };

  // Load preview on mount for images
  if (isImage && !previewUrl) {
    loadPreview();
  }

  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Thumbnail/Icon */}
        <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
          {isImage && previewUrl ? (
            <img 
              src={previewUrl} 
              alt={document.file_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={document.file_name}>
            {document.file_name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {documentType && (
              <Badge 
                variant="secondary" 
                className="text-xs"
                style={{ 
                  backgroundColor: `${documentType.color}20`,
                  color: documentType.color,
                  borderColor: documentType.color
                }}
              >
                {documentType.name}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatFileSize(document.file_size)}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(document.created_at), 'dd/MM/yy', { locale: ptBR })}
            </span>
          </div>
          {document.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {document.notes}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

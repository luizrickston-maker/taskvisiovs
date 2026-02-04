import { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, FileSpreadsheet, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DocumentType, ProspectDocument } from '@/types/database';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string;
  documentTypes: DocumentType[];
  onUploadComplete: (document: ProspectDocument) => void;
}

const getFileIcon = (file: File) => {
  if (file.type.includes('pdf')) return FileText;
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) return FileSpreadsheet;
  if (file.type.includes('image')) return ImageIcon;
  return FileText;
};

export function DocumentUploadModal({ 
  open, 
  onOpenChange, 
  prospectId, 
  documentTypes,
  onUploadComplete 
}: DocumentUploadModalProps) {
  const { user } = useAuthContext();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentTypeId, setDocumentTypeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedExtensions = Object.values(ACCEPTED_FILE_TYPES).flat().join(',');
  const acceptedMimeTypes = Object.keys(ACCEPTED_FILE_TYPES).join(',');

  const validateFile = (file: File): boolean => {
    if (!Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use PDF, Excel ou imagens.');
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);

    // Garantir que o React renderize o estado de loading antes de iniciar
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${prospectId}/${uniqueFileName}`;

      // Simulate progress (Supabase doesn't provide real progress for small files)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('prospect-documents')
        .upload(filePath, selectedFile);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setUploadProgress(95);

      // Save to database
      const { data, error: dbError } = await supabase
        .from('prospect_documents')
        .insert({
          user_id: user.id,
          prospect_id: prospectId,
          document_type_id: documentTypeId || null,
          file_path: filePath,
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          notes: notes || null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(100);
      
      toast.success('Documento anexado com sucesso!');
      onUploadComplete(data as ProspectDocument);
      
      // Reset and close
      setSelectedFile(null);
      setDocumentTypeId('');
      setNotes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erro ao fazer upload do documento');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const FileIcon = selectedFile ? getFileIcon(selectedFile) : Upload;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Prevenir fechamento durante upload
      if (uploading && !newOpen) return;
      onOpenChange(newOpen);
    }}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          if (uploading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (uploading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Anexar Documento</DialogTitle>
          <DialogDescription>
            Selecione um arquivo PDF, Excel ou imagem (máx. 10MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            } ${selectedFile ? 'bg-muted/50' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedMimeTypes}
              onChange={handleInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileIcon className="w-8 h-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm truncate max-w-[200px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Excel, JPG, PNG, WebP (máx. 10MB)
                </p>
              </>
            )}
          </div>

          {/* Document Type */}
          <div className="space-y-2">
            <Label>Tipo de Documento (opcional)</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tipo..." />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre o documento..."
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                Enviando... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Anexar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

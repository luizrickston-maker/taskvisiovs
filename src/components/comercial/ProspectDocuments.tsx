import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { DocumentCard } from './DocumentCard';
import { DocumentUploadModal } from './DocumentUploadModal';
import type { ProspectDocument, DocumentType } from '@/types/database';

interface ProspectDocumentsProps {
  prospectId: string;
}

export function ProspectDocuments({ prospectId }: ProspectDocumentsProps) {
  const { user } = useAuthContext();
  const [documents, setDocuments] = useState<ProspectDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load documents and types in parallel
        const [docsRes, typesRes] = await Promise.all([
          supabase
            .from('prospect_documents')
            .select('*')
            .eq('prospect_id', prospectId)
            .order('created_at', { ascending: false }),
          supabase
            .from('document_types')
            .select('*')
            .order('name', { ascending: true })
        ]);

        if (docsRes.data) setDocuments(docsRes.data as ProspectDocument[]);
        if (typesRes.data) setDocumentTypes(typesRes.data as DocumentType[]);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, prospectId]);

  const handleDocumentDelete = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleUploadComplete = (document: ProspectDocument) => {
    setDocuments(prev => [document, ...prev]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </h3>
        <Button size="sm" onClick={() => setUploadModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Anexar
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 border-2 border-dashed border-muted rounded-lg">
          <FileText className="w-10 h-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Nenhum documento anexado
          </p>
          <Button variant="outline" size="sm" onClick={() => setUploadModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Anexar Documento
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              documentTypes={documentTypes}
              onDelete={handleDocumentDelete}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        prospectId={prospectId}
        documentTypes={documentTypes}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}

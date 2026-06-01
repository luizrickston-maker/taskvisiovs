import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function PortalRedirect() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('Link inválido.');
      return;
    }

    (async () => {
      const { data, error: fetchError } = await supabase
        .rpc('resolve_short_link', { _code: code });

      const row = Array.isArray(data) ? data[0] : data;

      if (fetchError || !row) {
        setError('Link não encontrado, expirado ou inválido.');
        return;
      }

      window.location.href = row.target_url;
    })();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {error ? (
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">Acesso indisponível</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      ) : (
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Redirecionando...</p>
        </div>
      )}
    </div>
  );
}

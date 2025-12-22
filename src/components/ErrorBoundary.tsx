import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Gera hash simples e determinístico a partir de uma string
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Gera errorId determinístico baseado no erro
    const errorContent = `${error.message || ''}${error.stack || ''}`;
    const errorId = `ERR-${simpleHash(errorContent)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Atualiza errorId com componentStack para ser mais específico
    const fullContent = `${error.message || ''}${error.stack || ''}${errorInfo.componentStack || ''}`;
    const errorId = `ERR-${simpleHash(fullContent)}`;
    this.setState({ errorId });
    
    // Log para debugging com errorId estável
    console.error(`[ErrorBoundary] Erro capturado (${errorId}):`, {
      message: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/auth';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const errorId = this.state.errorId || 'UNKNOWN';

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-lg border-destructive/20">
            <CardHeader className="text-center">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-destructive" />
              </div>
              <CardTitle className="text-xl font-display">Algo deu errado</CardTitle>
              <CardDescription className="text-base">
                Ocorreu um erro inesperado. Tente recarregar a página.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button 
                  onClick={this.handleReload} 
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recarregar
                </Button>
                <Button 
                  onClick={this.handleGoHome} 
                  className="flex-1"
                  variant="outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao Login
                </Button>
              </div>

              <Button 
                onClick={this.handleRetry} 
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Tentar novamente
              </Button>

              {/* Informações de debug */}
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Código do erro: <code className="bg-muted px-1 rounded">{errorId}</code>
                </p>
                
                {isDev && this.state.error && (
                  <details className="mt-4" open>
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Detalhes técnicos (dev only)
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-lg overflow-auto max-h-60">
                      <pre className="text-xs text-destructive whitespace-pre-wrap break-words">
                        {this.state.error.message}
                        {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                      </pre>
                      {this.state.errorInfo?.componentStack && (
                        <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                          {this.state.errorInfo.componentStack.slice(0, 1200)}
                        </pre>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

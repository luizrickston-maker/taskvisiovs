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
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log para debugging (não sensível)
    console.error('[ErrorBoundary] Erro capturado:', {
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
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;
      const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`;

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

              {/* Informações de debug (apenas em desenvolvimento) */}
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

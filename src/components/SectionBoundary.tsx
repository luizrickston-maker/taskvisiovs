import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * SectionBoundary - Mini ErrorBoundary para isolar componentes.
 * Se um componente quebrar, só ele mostra fallback e o resto da página carrega.
 */
export class SectionBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`[SectionBoundary:${this.props.name || 'unknown'}] Erro:`, {
        message: error.message,
        componentStack: errorInfo.componentStack?.slice(0, 300),
      });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-destructive/20 bg-destructive/5 min-h-[120px]">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {this.props.name ? `Erro em ${this.props.name}` : 'Erro ao carregar'}
            </span>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <p className="text-xs text-muted-foreground mb-3 text-center max-w-xs truncate">
              {this.state.error.message}
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

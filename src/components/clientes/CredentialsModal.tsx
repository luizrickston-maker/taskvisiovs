import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, KeyRound, Mail, Globe, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const PORTAL_URL = 'https://taskvisionpro.lovable.app/auth';

interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
  clientName: string;
}

export function CredentialsModal({ open, onOpenChange, email, password, clientName }: CredentialsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (value: string, field: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = () => {
    const text = `Portal: ${PORTAL_URL}\nE-mail: ${email}\nSenha: ${password}`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    toast.success('Credenciais completas copiadas!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Acesso criado com sucesso!
          </DialogTitle>
          <DialogDescription>
            Credenciais de acesso ao portal para <strong>{clientName}</strong>. 
            <span className="block mt-1 font-medium text-yellow-600 dark:text-yellow-400">⚠️ Copie e salve a senha — ela não será exibida novamente.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <CredentialRow
            icon={<Globe className="w-4 h-4 text-muted-foreground" />}
            label="Link do portal"
            value={PORTAL_URL}
            onCopy={() => copyToClipboard(PORTAL_URL, 'url', 'Link')}
            copied={copiedField === 'url'}
          />
          <CredentialRow
            icon={<Mail className="w-4 h-4 text-muted-foreground" />}
            label="E-mail"
            value={email}
            onCopy={() => copyToClipboard(email, 'email', 'E-mail')}
            copied={copiedField === 'email'}
          />
          <CredentialRow
            icon={<KeyRound className="w-4 h-4 text-muted-foreground" />}
            label="Senha"
            value={password}
            isPassword
            onCopy={() => copyToClipboard(password, 'password', 'Senha')}
            copied={copiedField === 'password'}
          />
        </div>

        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1 border border-border/50">
          <p>📧 Um e-mail com as credenciais foi enviado automaticamente para o cliente.</p>
          <p>🔑 Para logins futuros sem senha, use o botão <strong>"Link"</strong> no painel de acesso.</p>
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="outline" className="gap-2 sm:flex-1" onClick={copyAll}>
            {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar tudo
          </Button>
          <Button className="sm:flex-1" onClick={() => onOpenChange(false)}>
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CredentialRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  isPassword?: boolean;
  onCopy: () => void;
  copied: boolean;
}

function CredentialRow({ icon, label, value, isPassword, onCopy, copied }: CredentialRowProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {isPassword && (
          <Badge variant="outline" className="text-xs border-yellow-500/40 text-yellow-600 dark:text-yellow-400 ml-auto">
            Salve agora
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className={`flex-1 text-sm font-mono text-foreground bg-background border border-border/50 rounded-md px-3 py-1.5 truncate${isPassword ? ' tracking-wider' : ''}`}>
          {value}
        </code>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
          onClick={onCopy}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

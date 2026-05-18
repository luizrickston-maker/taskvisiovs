import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BriefingStatus } from "@/types/briefing";
import { BriefingStatusBadge } from "./BriefingStatusBadge";

interface BriefingHeaderProps {
  title: string;
  subtitle?: string;
  status?: BriefingStatus;
  backPath: string;
  children?: ReactNode;
}

export const BriefingHeader = ({ 
  title, 
  subtitle, 
  status, 
  backPath, 
  children 
}: BriefingHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(backPath)}
          className="shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {status && <BriefingStatusBadge status={status} />}
          </div>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {children}
      </div>
    </div>
  );
};

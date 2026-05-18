import { ReactNode } from "react";
import { 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface BriefingBlockWrapperProps {
  value: string;
  number: number;
  title: string;
  children: ReactNode;
  className?: string;
}

export const BriefingBlockWrapper = ({ 
  value, 
  number, 
  title, 
  children, 
  className 
}: BriefingBlockWrapperProps) => {
  return (
    <AccordionItem 
      value={value} 
      className={cn("glass-card px-6 border rounded-xl overflow-hidden mb-4", className)}
    >
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {number}
          </div>
          <span className="font-semibold text-lg text-left">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-6 pt-2">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
};

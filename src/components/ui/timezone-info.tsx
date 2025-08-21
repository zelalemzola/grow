import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface TimezoneInfoProps {
  className?: string;
}

export function TimezoneInfo({ className }: TimezoneInfoProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
            <Info className="h-4 w-4" />
            <span>All dates shown in UTC (Germany timezone)</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">Timezone Information</p>
            <p className="text-sm">
              Your data is displayed in UTC timezone to ensure accuracy across different regions. 
              Sales data from Germany is automatically converted to UTC for consistent reporting.
            </p>
            <p className="text-xs text-muted-foreground">
              This prevents timezone-related data discrepancies between your location and where sales occur.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

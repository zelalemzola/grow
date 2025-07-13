import { Button } from '@/components/ui/button';
import { Download, FileText, BarChart3, Globe, Package } from 'lucide-react';

interface ExportButtonProps {
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
  icon?: 'download' | 'file' | 'chart' | 'globe' | 'package';
  className?: string;
}

export function ExportButton({ 
  onClick, 
  variant = 'outline', 
  size = 'default', 
  children, 
  icon = 'download',
  className = ''
}: ExportButtonProps) {
  const getIcon = () => {
    switch (icon) {
      case 'file':
        return <FileText className="h-4 w-4" />;
      case 'chart':
        return <BarChart3 className="h-4 w-4" />;
      case 'globe':
        return <Globe className="h-4 w-4" />;
      case 'package':
        return <Package className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`gap-2 transition-all duration-200 hover:scale-105 ${className}`}
    >
      {getIcon()}
      {children}
    </Button>
  );
} 
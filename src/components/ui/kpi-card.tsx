import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface KPICardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  subtitle?: string;
  tooltip?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function KPICard({ icon, label, value, subtitle, tooltip, href, onClick, className }: KPICardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    else if (href) navigate(href);
  };

  const cardContent = (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${className || ''}`}
      onClick={handleClick}
      title={tooltip}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-lg font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );

  return cardContent;
}

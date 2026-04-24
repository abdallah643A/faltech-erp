import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MaterialRequest } from '@/hooks/useMaterialRequests';
import { cn } from '@/lib/utils';

interface MRApprovalStatusProps {
  materialRequest: MaterialRequest;
  showDetails?: boolean;
}

export function MRApprovalStatus({ materialRequest, showDetails = false }: MRApprovalStatusProps) {
  const { language } = useLanguage();

  const levels = [
    {
      label: language === 'ar' ? 'المستوى 1' : 'Level 1',
      approved: !!materialRequest.approved_at_1,
      approver: materialRequest.approved_by_1_name,
      date: materialRequest.approved_at_1,
    },
    {
      label: language === 'ar' ? 'المستوى 2' : 'Level 2',
      approved: !!materialRequest.approved_at_2,
      approver: materialRequest.approved_by_2_name,
      date: materialRequest.approved_at_2,
    },
    {
      label: language === 'ar' ? 'المستوى 3' : 'Level 3',
      approved: !!(materialRequest as any).approved_at_3,
      approver: (materialRequest as any).approved_by_3_name,
      date: (materialRequest as any).approved_at_3,
    },
  ];

  const getCurrentLevel = () => {
    if ((materialRequest as any).approved_at_3) return 3;
    if (materialRequest.approved_at_2) return 2;
    if (materialRequest.approved_at_1) return 1;
    return 0;
  };

  const currentLevel = getCurrentLevel();
  const isFullyApproved = materialRequest.status === 'approved';
  const isRejected = materialRequest.status === 'rejected';
  const isDraft = materialRequest.status === 'draft';

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2">
        {isDraft && (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {language === 'ar' ? 'مسودة' : 'Draft'}
          </Badge>
        )}
        {isRejected && (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {language === 'ar' ? 'مرفوض' : 'Rejected'}
          </Badge>
        )}
        {isFullyApproved && (
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <CheckCircle className="h-3 w-3" />
            {language === 'ar' ? 'معتمد' : 'Approved'}
          </Badge>
        )}
        {!isDraft && !isRejected && !isFullyApproved && (
          <Badge variant="outline" className="gap-1">
            <Send className="h-3 w-3" />
            {language === 'ar' ? `قيد الموافقة (${currentLevel}/3)` : `Pending (${currentLevel}/3)`}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">
        {language === 'ar' ? 'حالة الموافقة' : 'Approval Status'}
      </h4>
      <div className="flex items-center gap-2">
        {levels.map((level, index) => (
          <div key={index} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2',
                level.approved
                  ? 'bg-primary border-primary text-primary-foreground'
                  : currentLevel === index && materialRequest.status === 'pending'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-muted-foreground/30 text-muted-foreground/50'
              )}
            >
              {level.approved ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
            {index < levels.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1',
                  level.approved ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            )}
          </div>
        ))}
      </div>
      {showDetails && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {levels.map((level, index) => (
            <div key={index} className="text-center">
              <p className="font-medium">{level.label}</p>
              {level.approved && (
                <>
                  <p className="text-muted-foreground">{level.approver}</p>
                  <p className="text-muted-foreground">
                    {level.date ? new Date(level.date).toLocaleDateString() : ''}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

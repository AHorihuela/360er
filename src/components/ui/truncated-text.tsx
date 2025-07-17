import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TruncatedTextProps {
  content: string;
  maxLength?: number;
  className?: string;
  preserveFormatting?: boolean;
  showMoreText?: string;
  showLessText?: string;
}

export function TruncatedText({
  content,
  maxLength = 200,
  className,
  preserveFormatting = false,
  showMoreText = "Show more",
  showLessText = "Show less"
}: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!content) return <span className="text-muted-foreground italic">No content available</span>;
  
  const shouldTruncate = content.length > maxLength;
  const displayContent = shouldTruncate && !isExpanded 
    ? content.slice(0, maxLength) + '...'
    : content;
  
  return (
    <div className="space-y-2">
      <p className={cn(
        "text-sm leading-relaxed",
        preserveFormatting && "whitespace-pre-wrap",
        className
      )}>
        {displayContent}
      </p>
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800 hover:bg-transparent font-medium"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              {showLessText}
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              {showMoreText}
            </>
          )}
        </Button>
      )}
    </div>
  );
} 
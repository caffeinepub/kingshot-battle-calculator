import { Label } from '@/components/ui/label';
import { HelpTooltip } from './HelpTooltip';
import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  helpText?: { title: string; content: string };
  children: ReactNode;
  htmlFor?: string;
}

export function FormField({ label, error, helpText, children, htmlFor }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {helpText && <HelpTooltip title={helpText.title} content={helpText.content} />}
      </div>
      {children}
      {error && (
        <p className="text-sm text-destructive font-medium">{error}</p>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/Badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Code, FileText } from "lucide-react";

interface TemplateEditorProps {
  batchId: string;
  columns: string[];
  emailColumn: string;
  recipients: Array<{
    email: string;
    data: Record<string, any>;
  }>;
  onTemplateReady: () => void;
}

export function TemplateEditor({
  batchId,
  columns,
  emailColumn,
  recipients,
  onTemplateReady,
}: TemplateEditorProps) {
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState("");
  const [signature, setSignature] = useState("");
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  // Load existing template if available
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await apiRequest("GET", `/api/template/${batchId}`);
        const data = await response.json();
        setSubject(data.subject || "");
        setTemplate(data.template || "");
        setSignature(data.signature || "");
        setIsHtmlMode(data.isHtmlMode || false);
      } catch (error) {
        console.error("Failed to load template:", error);
      }
    };

    loadTemplate();
  }, [batchId]);

  const insertVariable = (variable: string, target: 'subject' | 'body') => {
    if (target === 'subject') {
      const input = document.querySelector('input[placeholder*="subject"]') as HTMLInputElement;
      if (input) {
        const start = input.selectionStart || subject.length;
        const end = input.selectionEnd || subject.length;
        const beforeCursor = subject.substring(0, start);
        const afterCursor = subject.substring(end);
        const newSubject = `${beforeCursor}@${variable}${afterCursor}`;
        setSubject(newSubject);
        
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + variable.length + 1, start + variable.length + 1);
        }, 10);
      }
    } else {
      const textarea = document.querySelector('textarea[placeholder*="email body"]') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart || template.length;
        const end = textarea.selectionEnd || template.length;
        const beforeCursor = template.substring(0, start);
        const afterCursor = template.substring(end);
        const newTemplate = `${beforeCursor}@${variable}${afterCursor}`;
        setTemplate(newTemplate);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variable.length + 1, start + variable.length + 1);
        }, 10);
      }
    }
  };

  const [activeField, setActiveField] = useState<'subject' | 'body' | null>(null);

  const saveTemplate = async () => {
    if (!subject.trim() || !template.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both subject and email template",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("POST", `/api/template/${batchId}`, { 
        subject, 
        template,
        signature: signature.trim() || undefined,
        isHtmlMode
      });

      toast({
        title: "Success",
        description: "Email template saved successfully!",
      });

      onTemplateReady();
    } catch (error) {
      console.error("Failed to save template:", error);
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const generatePreview = () => {
    if (recipients.length === 0) return null;

    // Parse the data if it's a JSON string
    const sampleData = typeof recipients[0].data === 'string' 
      ? JSON.parse(recipients[0].data) 
      : recipients[0].data;
    
    // Replace @ variables with sample data
    const processedSubject = subject.replace(/@(\w+)/g, (match, variable) => {
      return sampleData[variable] || match;
    });

    let processedTemplate = template.replace(/@(\w+)/g, (match, variable) => {
      return sampleData[variable] || match;
    });

    let processedSignature = signature.replace(/@(\w+)/g, (match, variable) => {
      return sampleData[variable] || match;
    });

    // For HTML mode, show as rendered HTML
    // For plain text mode, convert line breaks to <br> for preview
    if (!isHtmlMode) {
      processedTemplate = processedTemplate.replace(/\n/g, '<br>');
      if (processedSignature) {
        processedSignature = processedSignature.replace(/\n/g, '<br>');
      }
    }

    // Add signature if present
    let fullBody = processedTemplate;
    if (processedSignature.trim()) {
      if (isHtmlMode) {
        fullBody += `\n\n<div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee;">\n${processedSignature}\n</div>`;
      } else {
        fullBody += `<br><br><div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee;">${processedSignature}</div>`;
      }
    }

    return { subject: processedSubject, body: fullBody, isHtml: isHtmlMode };
  };

  const preview = generatePreview();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Fields</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click any field below to insert it into your template using @ syntax
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              {activeField === 'subject' ? 'Click a field to add to subject line:' : 
               activeField === 'body' ? 'Click a field to add to email body:' :
               'Click on Subject or Email Body field first, then click a variable to insert it'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <Badge
                key={column}
                variant={column === emailColumn ? "default" : "secondary"}
                className="cursor-pointer hover:bg-primary/80"
                onClick={() => {
                  if (activeField) {
                    insertVariable(column, activeField);
                  }
                }}
              >
                @{column}
                {column === emailColumn && " (email)"}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg" data-testid="mode-toggle-container">
            <div className="flex items-center gap-2">
              {isHtmlMode ? <Code className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              <div>
                <Label htmlFor="html-mode" className="text-sm font-medium">
                  {isHtmlMode ? "HTML Mode" : "Plain Text Mode"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isHtmlMode 
                    ? "Write HTML content with formatting and styles" 
                    : "Write plain text - line breaks will be preserved"}
                </p>
              </div>
            </div>
            <Switch
              id="html-mode"
              checked={isHtmlMode}
              onCheckedChange={setIsHtmlMode}
              data-testid="toggle-html-mode"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Subject Line
              <span className="text-xs text-muted-foreground ml-2">
                (Click field badges above to insert variables)
              </span>
            </label>
            <Input
              placeholder="Enter email subject (e.g., Hello @Name, welcome to @Company!)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setActiveField('subject')}
              onBlur={() => setTimeout(() => setActiveField(null), 100)}
              data-testid="input-subject"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Email Body
              <span className="text-xs text-muted-foreground ml-2">
                {isHtmlMode 
                  ? "(Write HTML - you can use @variables)" 
                  : "(Line breaks and formatting will be preserved)"}
              </span>
            </label>
            <Textarea
              placeholder={isHtmlMode 
                ? `Enter HTML content here. Use @ to insert variables from your Excel file.

Example:
<div style="font-family: Arial, sans-serif;">
  <h2>Hello @Name,</h2>
  <p>I hope this message finds you well at <strong>@Company</strong>.</p>
  <p>I wanted to reach out regarding your role as @role.</p>
</div>`
                : `Enter your email body here. Use @ to insert variables from your Excel file.

Example:
Dear @Name,

I hope this message finds you well at @Company. I wanted to reach out regarding your role as @role.

Best regards,
Your Name`}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              onFocus={() => setActiveField('body')}
              onBlur={() => setTimeout(() => setActiveField(null), 100)}
              rows={12}
              className="font-mono text-sm"
              data-testid="textarea-body"
            />
          </div>

          {/* Signature Field (Optional) */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Email Signature <span className="text-xs text-muted-foreground">(Optional)</span>
              <span className="text-xs text-muted-foreground ml-2 block mt-1">
                Add a signature that will be appended to all emails. {isHtmlMode ? "Use HTML formatting." : "Line breaks will be preserved."}
              </span>
            </label>
            <Textarea
              placeholder={isHtmlMode 
                ? `<div style="margin-top: 20px;">
  <p>Best regards,</p>
  <p><strong>@YourName</strong></p>
  <p>Your Title | Your Company</p>
  <p>Email: your@email.com</p>
</div>`
                : `Best regards,
Your Name
Your Title | Your Company
Email: your@email.com`}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={4}
              className="font-mono text-sm"
              data-testid="textarea-signature"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={saveTemplate}
              disabled={isSaving || !subject.trim() || !template.trim()}
              data-testid="button-save-template"
            >
              {isSaving ? "Saving..." : "Save Template"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!subject.trim() || !template.trim()}
              data-testid="button-toggle-preview"
            >
              {showPreview ? "Hide Preview" : isHtmlMode ? "Visualize HTML" : "Show Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && preview && (
        <Card data-testid="preview-card">
          <CardHeader>
            <CardTitle>{isHtmlMode ? "HTML Preview" : "Preview"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isHtmlMode 
                ? "Rendered HTML view - this is how your email will appear to recipients"
                : "This is how your email will look with sample data from your first recipient"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Subject:</label>
                <div className="p-3 bg-muted rounded-md text-sm" data-testid="preview-subject">
                  {preview.subject}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Body:</label>
                {preview.isHtml ? (
                  <div 
                    className="p-4 bg-white border rounded-md text-sm"
                    style={{ minHeight: '200px' }}
                    dangerouslySetInnerHTML={{ __html: preview.body }}
                    data-testid="preview-body-html"
                  />
                ) : (
                  <div 
                    className="p-4 bg-white border rounded-md text-sm"
                    dangerouslySetInnerHTML={{ __html: preview.body }}
                    data-testid="preview-body-text"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
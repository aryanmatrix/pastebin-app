'use client';

import { useState, useEffect } from 'react';
import { Clock, Eye, Link2, Copy, Check, AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface PasteData {
  title: string;
  content: string;
  createdAt: string;
  expiresAt?: string;
  viewCount: number;
  maxViews?: number;
  isLastView?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}

interface CreatePastePayload {
  content: string;
  title?: string;
  expiresIn?: number;
  maxViews?: number;
}

interface CreatePasteResponse {
  url: string;
}

type ExpirationOption = 'never' | 'time' | 'views';

export default function ImprovedPasteBin() {
  const [view, setView] = useState<'create' | 'view'>('create');
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [expirationType, setExpirationType] = useState<ExpirationOption>('never');
  const [hoursValue, setHoursValue] = useState<string>('');
  const [viewsValue, setViewsValue] = useState<string>('');
  const [shareableLink, setShareableLink] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [viewData, setViewData] = useState<PasteData | null>(null);

  const MAX_CONTENT_LENGTH: number = 100000; // 100KB character limit
  const MAX_TITLE_LENGTH: number = 100;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
      setView('view');
      loadPaste(id);
    }
  }, []);

  // Clear unused expiration values only when radio buttons are clicked
  const handleExpirationTypeChange = (type: ExpirationOption) => {
    setExpirationType(type);
    if (type === 'never') {
      setHoursValue('');
      setViewsValue('');
    } else if (type === 'time') {
      setViewsValue('');
    } else if (type === 'views') {
      setHoursValue('');
    }
  };

  const validateInputs = (): boolean => {
    if (!content.trim()) {
      setError('Content cannot be empty');
      return false;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
      return false;
    }

    if (title.length > MAX_TITLE_LENGTH) {
      setError(`Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`);
      return false;
    }

    if (expirationType === 'time') {
      const hours = parseInt(hoursValue);
      if (!hoursValue || hours < 1 || hours > 8760) { // Max 1 year
        setError('Please enter a valid number of hours (1-8760)');
        return false;
      }
    }

    if (expirationType === 'views') {
      const views = parseInt(viewsValue);
      if (!viewsValue || views < 1 || views > 10000) {
        setError('Please enter a valid number of views (1-10000)');
        return false;
      }
    }

    return true;
  };

  const createPaste = async (): Promise<void> => {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload: CreatePastePayload = {
        content: content.trim(),
        title: title.trim() || undefined,
      };

      if (expirationType === 'time' && hoursValue) {
        payload.expiresIn = parseInt(hoursValue);
      } else if (expirationType === 'views' && viewsValue) {
        payload.maxViews = parseInt(viewsValue);
      }

      const response = await fetch('/api/pastes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<CreatePasteResponse> = await response.json();

      if (!data.success || !data.data) {
        setError(data.error?.message || 'Failed to create paste');
        return;
      }

      setShareableLink(data.data.url);
      setContent('');
      setTitle('');
      setExpirationType('never');
      setHoursValue('');
      setViewsValue('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage || 'Failed to create paste. Please check your connection and try again.');
      console.error('Create paste error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPaste = async (id: string): Promise<void> => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/pastes/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Paste not found or has expired');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<PasteData> = await response.json();

      if (!data.success || !data.data) {
        setError(data.error?.message || 'Failed to load paste');
        setViewData(null);
        return;
      }

      setViewData(data.data);

      if (data.data.isLastView) {
        setTimeout(() => {
          setError('⚠️ This was the final view. The paste has been deleted.');
        }, 500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage || 'Failed to load paste. Please check your connection.');
      setViewData(null);
      console.error('Load paste error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
    }
  };

  const resetToCreate = (): void => {
    setView('create');
    setShareableLink('');
    setViewData(null);
    setError('');
    window.history.pushState({}, '', window.location.pathname);
  };

  // Sanitize content for display (basic XSS prevention)
  const sanitizeContent = (text: string): string => {
    return text; // In production, use a proper sanitization library
  };

  const handleNumberInput = (
    value: string,
    setter: (value: string) => void
  ): void => {
    // Allow empty string or any valid number (validation happens on submit)
    if (value === '' || !isNaN(parseInt(value))) {
      setter(value);
    }
  };

  if (view === 'view') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">PasteBin</h1>
            <Button
              onClick={resetToCreate}
              variant="outline"
            >
              <Home className="w-4 h-4" />
              Back to Create
            </Button>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-input border-t-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading paste...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {viewData && !loading && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  {viewData.title || 'Untitled'}
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(viewData.createdAt).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    Views: {viewData.viewCount}
                    {viewData.maxViews ? ` / ${viewData.maxViews}` : ''}
                  </span>
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-muted overflow-auto max-h-96">
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                  {sanitizeContent(viewData.content)}
                </pre>
              </div>

              {viewData.expiresAt && (
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(viewData.expiresAt).toLocaleString()}
                </p>
              )}

              <Button
                onClick={() => {
                  navigator.clipboard.writeText(viewData.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                variant="outline"
                className="w-full"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Content'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">PasteBin</h1>
          <p className="text-muted-foreground">Share text content with expiring links</p>
        </div>

        {shareableLink ? (
          <div className="space-y-6">
            <Alert variant="success">
              <Check className="h-4 w-4" />
              <AlertTitle>Paste Created Successfully!</AlertTitle>
              <AlertDescription>Share this link to view your content:</AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                type="text"
                value={shareableLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                size="sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <Button
              onClick={() => setShareableLink('')}
              variant="outline"
              className="w-full"
            >
              Create Another Paste
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="title">Title (optional)</Label>
                <span className="text-xs text-muted-foreground">
                  {title.length}/{MAX_TITLE_LENGTH}
                </span>
              </div>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder="Enter a title for your paste"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <Label htmlFor="content">Content</Label>
                <span className="text-xs text-muted-foreground">
                  {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
                </span>
              </div>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your content here..."
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label className="mb-3 block">Expiration</Label>
              <RadioGroup value={expirationType} onValueChange={handleExpirationTypeChange}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="never" id="never" />
                  <Label htmlFor="never" className="font-normal cursor-pointer">Never expire</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="time" id="time" />
                  <Label htmlFor="time" className="font-normal cursor-pointer flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expire after
                    <Input
                      type="number"
                      min="1"
                      max="8760"
                      value={hoursValue}
                      onChange={(e) => handleNumberInput(e.target.value, setHoursValue)}
                      placeholder="24"
                      className="w-20 h-9"
                      onClick={(e) => e.stopPropagation()}
                    />
                    hours
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="views" id="views" />
                  <Label htmlFor="views" className="font-normal cursor-pointer flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Expire after
                    <Input
                      type="number"
                      min="1"
                      max="10000"
                      value={viewsValue}
                      onChange={(e) => handleNumberInput(e.target.value, setViewsValue)}
                      placeholder="10"
                      className="w-20 h-9"
                      onClick={(e) => e.stopPropagation()}
                    />
                    views
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={createPaste}
              disabled={loading || !content.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-background/30 border-t-background"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Create Shareable Link
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Your content will be stored securely and accessible via a unique link
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
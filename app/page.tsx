'use client';

import { useState, useEffect } from 'react';
import { Clock, Eye, Link2, Copy, Check, AlertCircle, Home } from 'lucide-react';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">PasteBin</h1>
              <button
                onClick={resetToCreate}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Create New
              </button>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white"></div>
                <p className="text-white mt-4">Loading paste...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {viewData && !loading && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">
                    {viewData.title || 'Untitled'}
                  </h2>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-300">
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

                <div className="bg-slate-950/50 rounded-lg p-6 border border-white/10 overflow-auto">
                  <pre className="text-gray-100 whitespace-pre-wrap break-words font-mono text-sm">
                    {sanitizeContent(viewData.content)}
                  </pre>
                </div>

                {viewData.expiresAt && (
                  <p className="text-gray-400 text-sm mt-4">
                    Expires: {new Date(viewData.expiresAt).toLocaleString()}
                  </p>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(viewData.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Content'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-2">PasteBin</h1>
          <p className="text-gray-300 mb-8">Share text content with expiring links</p>

          {shareableLink ? (
            <div className="space-y-6">
              <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Check className="w-6 h-6" />
                  Paste Created Successfully!
                </h2>
                <p className="text-gray-200 mb-4">Share this link to view your content:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareableLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-slate-950/50 border border-white/20 rounded-lg text-white font-mono text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShareableLink('')}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Create Another Paste
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
                  <p className="text-red-200">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-white font-medium mb-2">
                  Title (optional)
                  <span className="text-gray-400 text-sm font-normal ml-2">
                    {title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                  placeholder="Untitled"
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">
                  Content
                  <span className="text-gray-400 text-sm font-normal ml-2">
                    {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your content here..."
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Expiration</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="expiration"
                      checked={expirationType === 'never'}
                      onChange={() => handleExpirationTypeChange('never')}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-200">Never expire</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="expiration"
                      checked={expirationType === 'time'}
                      onChange={() => handleExpirationTypeChange('time')}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-200 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Expire after
                      <input
                        type="number"
                        min="1"
                        max="8760"
                        value={hoursValue}
                        onChange={(e) => handleNumberInput(e.target.value, setHoursValue)}
                        placeholder="24"
                        className="w-20 px-2 py-1 bg-slate-950/50 border border-white/20 rounded text-white text-center"
                      />
                      hours
                    </span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="expiration"
                      checked={expirationType === 'views'}
                      onChange={() => handleExpirationTypeChange('views')}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-200 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Expire after
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={viewsValue}
                        onChange={(e) => handleNumberInput(e.target.value, setViewsValue)}
                        placeholder="10"
                        className="w-20 px-2 py-1 bg-slate-950/50 border border-white/20 rounded text-white text-center"
                      />
                      views
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={createPaste}
                disabled={loading || !content.trim()}
                className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    Create Shareable Link
                  </>
                )}
              </button>

              <p className="text-gray-400 text-sm text-center">
                Your content will be stored securely and accessible via a unique link
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
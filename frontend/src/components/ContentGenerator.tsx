'use client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Copy,
  Download,
  Hash,
  Loader2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { toast, Toaster } from 'sonner';

export default function ContentGenerator() {
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generationTime, setGenerationTime] = useState(0);
  const [savedContents, setSavedContents] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch saved contents
  const fetchSavedContents = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/content');
      const data = await response.json();
      if (data.status === 'success') {
        setSavedContents(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  useEffect(() => {
    fetchSavedContents();
  }, [fetchSavedContents]);

  const generateContent = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        'http://localhost:8000/api/generate-content',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success') {
        setContent(data.content);
        setGenerationTime((Date.now() - startTime) / 1000);
        toast.success('Content generated successfully!');
        fetchSavedContents(); // Refresh history
      } else {
        throw new Error(data.message || 'Unknown error occurred');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate content';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard!');
  };

  const downloadContent = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Content downloaded!');
  };

  const shareContent = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: topic,
          text: content.substring(0, 200) + '...',
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyToClipboard();
    }
  };

  const loadFromHistory = (item: any) => {
    setTopic(item.topic);
    setContent(item.content);
    setShowHistory(false);
    toast.info('Content loaded from history');
  };

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Content Generator
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Powered by CrewAI and Gemini AI
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1 space-y-4"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Generate Content
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., How AI helps blind people"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    onKeyPress={(e) =>
                      e.key === 'Enter' &&
                      !loading &&
                      topic &&
                      generateContent()
                    }
                  />
                </div>

                <button
                  onClick={generateContent}
                  disabled={loading || !topic}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Content
                    </>
                  )}
                </button>

                {generationTime > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    Generated in {generationTime.toFixed(1)}s
                  </div>
                )}
              </div>
            </div>

            {/* History Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Recent History
                </h3>
                <motion.div
                  animate={{ rotate: showHistory ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  ▼
                </motion.div>
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 space-y-2 overflow-hidden"
                  >
                    {savedContents.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <p className="font-medium truncate">{item.topic}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Content Display Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {content ? (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-semibold text-lg">Generated Content</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={copyToClipboard}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={downloadContent}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Download as markdown"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={shareContent}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Share"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="p-8 prose prose-lg dark:prose-invert max-w-none"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-gray-100">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-800 dark:text-gray-200">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-4 ml-6 list-disc space-y-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-4 ml-6 list-decimal space-y-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700 dark:text-gray-300">
                            {children}
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-gray-900 dark:text-gray-100">
                            {children}
                          </strong>
                        ),
                        code: ({ className, children, ...props }) => {
                          const match = /language-(\w+)/.exec(className || '');
                          return match ? (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code
                              className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-purple-500 pl-4 italic my-4 text-gray-700 dark:text-gray-300">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </motion.div>
                </>
              ) : (
                <div className="p-20 text-center text-gray-500 dark:text-gray-400">
                  <Hash className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">
                    Your generated content will appear here
                  </p>
                  <p className="text-sm mt-2">
                    Enter a topic and click generate to get started
                  </p>
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              >
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

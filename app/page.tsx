'use client';
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "../components/SignInForm";
import { SignOutButton } from "../components/SignOutButton";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function Page() {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const processClick = useMutation(api.links.processTrackingClick);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encryptedData = params.get('data');
    if (encryptedData && !isRedirecting) {
      setIsRedirecting(true);
      void (async () => {
        try {
          const payload = await processClick({
            encryptedData: decodeURIComponent(encryptedData),
            userAgent: navigator.userAgent,
            ipAddress: undefined,
          });

          if (payload.success) {
            toast.success(`Redirecting ${payload.name} to ${payload.redirectUrl}`);
            try {
              if (payload.suppressChatDomain) {
                const expiresAtMs = Date.now() + 15 * 60 * 1000;
                const value = {
                  domain: payload.suppressChatDomain,
                  expiresAtMs,
                  ...(payload.watcherId ? { watcherId: payload.watcherId } : {}),
                };
                localStorage.setItem('suppressChatDomain', JSON.stringify(value));
              }
            } catch {
              // ignore storage errors (e.g., private mode)
            }
            setTimeout(() => {
              window.location.href = payload.redirectUrl;
            }, 10000);
          } else {
            toast.error(payload.error || "Invalid tracking link");
            setIsRedirecting(false);
          }
        } catch {
          toast.error("Failed to process tracking link");
          setIsRedirecting(false);
        }
      })();
    }
  }, [isRedirecting, processClick]);

  if (isRedirecting)
    return <RedirectPage />;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Link Tracker</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto">
          <Content />
        </div>
      </main>
    </div>
  );
}

function RedirectPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Processing Link</h2>
        <p className="text-gray-600">Please wait while we redirect you...</p>
      </div>
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary mb-4">Link Tracking Service</h1>
        <Authenticated>
          <p className="text-xl text-secondary">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-secondary">Sign in to manage your tracking links</p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LinkGenerator />
          <Analytics />
        </div>
      </Authenticated>
    </div>
  );
}

function LinkGenerator() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const createLink = useMutation(api.links.createTrackingLink);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !targetUrl) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsGenerating(true);
    try {
      const trackingLink = await createLink({ name, email, targetUrl });
      setGeneratedLink(trackingLink);
      toast.success("Tracking link generated!");
    } catch {
      toast.error("Failed to generate tracking link");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    void navigator.clipboard
      .writeText(generatedLink)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy"));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold mb-4">Generate Tracking Link</h2>
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter recipient name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter recipient email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>
        <button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Generate Tracking Link"}
        </button>
      </form>

      {generatedLink && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">Generated Tracking Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Analytics() {
  const stats = useQuery(api.links.getClickStats);
  const recentClicks = useQuery(api.links.getClickAnalytics);

  if (stats === undefined || recentClicks === undefined) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold mb-4">Analytics</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.totalClicks}</div>
          <div className="text-sm text-gray-600">Total Clicks</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.recentClicks}</div>
          <div className="text-sm text-gray-600">Last 24h</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{stats.uniqueEmails}</div>
          <div className="text-sm text-gray-600">Unique Users</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{stats.uniqueUrls}</div>
          <div className="text-sm text-gray-600">Unique URLs</div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Clicks</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentClicks.map((click) => (
            <div key={click._id} className="p-3 bg-gray-50 rounded-md text-sm">
              <div className="font-medium">{click.name}</div>
              <div className="text-gray-600">{click.email}</div>
              <div className="text-gray-500 truncate">{click.targetUrl}</div>
              <div className="text-xs text-gray-400">
                {new Date(click.clickedAt).toLocaleString()}
              </div>
            </div>
          ))}
          {recentClicks.length === 0 && (
            <div className="text-center text-gray-500 py-4">No clicks recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}



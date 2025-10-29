'use client';
import { ConvexReactClient } from 'convex/react';
import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { ReactNode, useMemo } from 'react';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
  const convex = useMemo(() => new ConvexReactClient(url), [url]);
  return (
    <ConvexAuthProvider client={convex}>
      {children}
      <Toaster />
    </ConvexAuthProvider>
  );
}



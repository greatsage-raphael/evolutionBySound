'use client';
import { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';

export default function ClerkClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
        {children}
    </ClerkProvider>
  );
}
'use client'

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SessionProvider } from "@/components/SessionProvider";
import { useEffect } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Add global fetch interceptor for authentication with automatic token refresh
  useEffect(() => {
    const originalFetch = window.fetch;
    
    const refreshToken = async () => {
      try {
        const response = await fetch('/api/auth/refresh', { method: 'POST' });
        if (response.ok) {
          return true; // Token refreshed successfully
        }
        return false;
      } catch {
        return false;
      }
    };
    
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      
      // Skip for auth endpoints and external URLs
      if (typeof url === 'string' && 
          (url.includes('/api/auth') || url.startsWith('http'))) {
        return originalFetch(...args);
      }
      
      // Try API call first (cookies are sent automatically with HttpOnly)
      let response = await originalFetch(url, options);
      
      // If 401, try to refresh token and retry once
      if (response.status === 401 && typeof url === 'string' && url.includes('/api/')) {
        const refreshed = await refreshToken();
        
        if (refreshed) {
          // Retry the original request with new token
          response = await originalFetch(url, options);
        } else {
          // Token refresh failed, redirect to login
          if (process.env.NODE_ENV === 'development') {
            console.log('Token refresh failed, redirecting to login');
          }
          window.location.href = '/login';
          return response;
        }
      }
      
      // Log only in development without sensitive data
      if (process.env.NODE_ENV === 'development') {
        console.log('=== API CALL DEBUG ===');
        console.log('URL:', url);
        console.log('Status:', response.status);
        console.log('===================');
      }
      
      return response;
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <ErrorBoundary>
            {children}
            <LogoutButton />
          </ErrorBoundary>
        </SessionProvider>
      </body>
    </html>
  );
}

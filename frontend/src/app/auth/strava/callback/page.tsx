'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function StravaCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (code) {
      // Send the code to our backend
      fetch('/api/auth/strava/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        credentials: 'include',
      })
        .then((response) => response.json())
        .then((data) => {
          // Notify the parent window of successful authentication
          console.log(data);

          if (window.opener) {
            window.opener.postMessage({ type: 'strava_auth_success', data }, '*');
            window.close();
          } else {
            // If no opener, redirect to dashboard
            router.push('/dashboard');
          }
        })
        .catch((error) => {
          console.error('Error during Strava authentication:', error);
          if (window.opener) {
            window.opener.postMessage({ type: 'strava_auth_error', error }, '*');
            window.close();
          } else {
            router.push('/?error=strava_auth_failed');
          }
        });
    } else if (error) {
      if (window.opener) {
        console.error('Error during Strava authentication:', error);

        window.opener.postMessage({ type: 'strava_auth_error', error }, '*');
        window.close();
      } else {
        router.push(`/?error=${error}`);
      }
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold">Connecting to Strava...</h1>
      </div>
    </div>
  );
} 
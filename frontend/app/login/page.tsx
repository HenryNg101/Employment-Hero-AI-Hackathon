'use client';

import { Amplify } from 'aws-amplify';
import outputs from '@/amplify_outputs.json';

import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import { useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import Link from 'next/link';

Amplify.configure(outputs);

function AuthStatusMessage() {
  const { authStatus } = useAuthenticator((context) => [context.authStatus]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      getCurrentUser()
        .then((user) => {
          console.log("✅ User ID:", user.userId);  // TODO: Remove this later, as this is just for debugging
        })
        .catch(() => {});
    }
  }, [authStatus]);

  if (authStatus === 'authenticated') {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center space-y-4">
        <h2 className="text-2xl font-semibold">You are already logged in.</h2>
        <p className="text-gray-600">You can now go back to the homepage.</p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Authenticator />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Authenticator.Provider>
      <AuthStatusMessage />
    </Authenticator.Provider>
  );
}

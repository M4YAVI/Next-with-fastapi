'use client'; // This directive marks the component as a Client Component.

import { useEffect, useState } from 'react';

export default function Home() {
  // State to store the message fetched from the backend
  const [message, setMessage] = useState('Loading message from backend...');

  // useEffect hook to fetch data when the component mounts
  useEffect(() => {
    // Define the async function to fetch data
    const fetchData = async () => {
      try {
        // Construct the full API URL from the environment variable
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/message`;

        // Fetch data from our FastAPI endpoint
        const response = await fetch(apiUrl);

        // Check if the request was successful
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Update the state with the message from the backend
        setMessage(data.message);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setMessage('Failed to load message from backend.');
      }
    };

    // Call the function
    fetchData();
  }, []); // The empty dependency array [] ensures this effect runs only once

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-center font-mono text-center">
        <h1 className="text-4xl font-bold mb-8">Next.js 15 + FastAPI</h1>
        <div className="p-8 border border-gray-600 rounded-lg bg-gray-800 shadow-lg">
          <p className="text-lg">Message from Backend:</p>
          <p className="mt-4 text-2xl font-semibold text-cyan-400 p-4 bg-gray-700 rounded-md">
            {message}
          </p>
        </div>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { deviceGatewayApi, ExecutionResult } from '@/lib/api';

interface OperationCardProps {
  title: string;
  description: string;
  buttonText: string;
  operation: () => Promise<{ data: ExecutionResult }>;
  icon: React.ReactNode;
}

export default function OperationCard({
  title,
  description,
  buttonText,
  operation,
  icon
}: OperationCardProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showOutput, setShowOutput] = useState(false);

  const handleOperation = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await operation();
      setResult(response.data);
      setShowOutput(true);
    } catch (error) {
      console.error(`Operation failed:`, error);
      setResult({
        success: false,
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Operation failed',
      });
      setShowOutput(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-4">
        {icon}
        <h3 className="text-lg font-semibold ml-3">{title}</h3>
      </div>
      
      <p className="text-gray-600 mb-4">{description}</p>
      
      <button
        onClick={handleOperation}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          buttonText
        )}
      </button>

      {result && showOutput && (
        <div className="mt-4">
          <div className={`p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
              {result.success ? 'Success' : 'Failed'}
              {result.message && `: ${result.message}`}
            </p>
          </div>
          
          {(result.stdout || result.stderr) && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                View Output
              </summary>
              {result.stdout && (
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                  {result.stdout}
                </pre>
              )}
              {result.stderr && (
                <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-x-auto text-red-800">
                  {result.stderr}
                </pre>
              )}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { deviceGatewayApi } from '@/lib/api';
import { ImageIcon, Loader2 } from 'lucide-react';

export default function TopologyViewer() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setImageError(false);
    try {
      await deviceGatewayApi.downloadAndGenerateTopology();
      // Force image reload
      setImageLoaded(false);
      setTimeout(() => setImageLoaded(true), 100);
    } catch (error) {
      console.error('Failed to download config and generate topology:', error);
      alert('Failed to download config and generate topology');
    } finally {
      setGenerating(false);
    }
  };

  const imageUrl = imageLoaded ? `${deviceGatewayApi.getTopologyImage()}?t=${Date.now()}` : '';

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <ImageIcon className="w-5 h-5 mr-2" />
          Device Topology
        </h3>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Downloading & Generating...
            </>
          ) : (
            'Download & Generate'
          )}
        </button>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50 min-h-[300px] flex items-center justify-center">
        {imageLoaded && !imageError ? (
          <img
            src={imageUrl}
            alt="Device Topology"
            onError={() => setImageError(true)}
            className="max-w-full h-auto"
          />
        ) : imageError ? (
          <div className="text-center text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Failed to load topology image</p>
            <p className="text-sm mt-1">Generate topology first</p>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No topology image available</p>
            <p className="text-sm mt-1">Click "Download & Generate" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}
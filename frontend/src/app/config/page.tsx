'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Save, RefreshCw, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import { deviceGatewayApi } from '@/lib/api';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'yaml' | 'topology'>('yaml');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [activeTab]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = activeTab === 'yaml' 
        ? await deviceGatewayApi.getConfigYaml()
        : await deviceGatewayApi.getTopologyRequest();
      setContent(response.data.content);
      setOriginalContent(response.data.content);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch config:', err);
      const fileType = activeTab === 'yaml' ? 'config file' : 'topology request file';
      setError(err.response?.data?.detail || `Failed to load ${fileType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      if (activeTab === 'yaml') {
        await deviceGatewayApi.updateConfigYaml(content);
        setSuccess('Config file saved successfully! Changes will take effect after service restart.');
        // Emit a custom event to trigger environment info refresh
        window.dispatchEvent(new CustomEvent('configUpdated'));
      } else {
        await deviceGatewayApi.updateTopologyRequest(content);
        setSuccess('Topology request file saved successfully! Use "Generate Topology" to apply changes.');
      }
      
      setOriginalContent(content);
      
    } catch (err: any) {
      console.error('Failed to save config:', err);
      const fileType = activeTab === 'yaml' ? 'config file' : 'topology request file';
      setError(err.response?.data?.detail || `Failed to save ${fileType}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContent(originalContent);
    setError(null);
    setSuccess(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-yellow-100">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card variant="elevated" className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="bg-white/20 p-3 rounded-full inline-flex mb-4">
                  <FileText className="w-8 h-8" />
                </div>
                <h1 className="text-4xl font-bold mb-3">Configuration Editor</h1>
                <p className="text-orange-100 text-lg max-w-2xl mx-auto mb-6">
                  Edit the device gateway configuration file (config.yaml) with syntax validation
                </p>
                <div className="flex items-center justify-center space-x-6">
                  <div className="flex items-center text-orange-100">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm">Changes require restart</span>
                  </div>
                  <div className="flex items-center text-orange-100">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span className="text-sm">Auto backup created</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Tabs */}
        <Card variant="elevated" className="mb-4">
          <CardContent className="py-4">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('yaml')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'yaml'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                config.yaml
              </button>
              <button
                onClick={() => setActiveTab('topology')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'topology'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                topology_request.json
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Config Editor */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 mr-2 text-orange-600" />
                <h2 className="text-xl font-semibold text-gray-800">
                  {activeTab === 'yaml' ? 'config.yaml' : 'device_topology_request.json'}
                </h2>
                {hasChanges && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchConfig}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Reload
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasChanges || loading}
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasChanges || loading || saving}
                  isLoading={saving}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Status Messages */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center text-red-800">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Error:</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">Success:</span>
                </div>
                <p className="text-green-700 mt-1">{success}</p>
              </div>
            )}

            {/* Editor */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-500 mr-3" />
                <span className="text-gray-600">Loading config file...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-96 px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none bg-white text-gray-900"
                  placeholder={activeTab === 'yaml' ? 'YAML configuration content...' : 'JSON topology request content...'}
                  spellCheck={false}
                  style={{ 
                    color: '#1f2937',
                    backgroundColor: '#ffffff',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                />
                
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  <p className="font-medium mb-2">{activeTab === 'yaml' ? 'Configuration Tips:' : 'Topology Request Tips:'}</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {activeTab === 'yaml' ? (
                      <>
                        <li>Use proper YAML indentation (spaces, not tabs)</li>
                        <li>Changes to device_id will affect environment display</li>
                        <li>Plugin changes require service restart to take effect</li>
                        <li>A backup copy (.yaml.backup) is automatically created</li>
                      </>
                    ) : (
                      <>
                        <li>Use proper JSON syntax with quotes around strings</li>
                        <li>Specify qubits as an array of strings (e.g., ["0", "1", "2"])</li>
                        <li>exclude_couplings format: ["qubit1-qubit2", "qubit3-qubit4"]</li>
                        <li>Changes apply when generating topology</li>
                        <li>A backup copy (.json.backup) is automatically created</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
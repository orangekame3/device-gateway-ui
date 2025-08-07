'use client';

import DeviceStatusCard from '@/components/DeviceStatusCard';
import OperationCard from '@/components/OperationCard';
import TopologyViewer from '@/components/TopologyViewer';
import EnvironmentBanner from '@/components/EnvironmentBanner';
import UpcomingSchedules from '@/components/UpcomingSchedules';
import Button from '@/components/ui/Button';
import Card, { CardContent } from '@/components/ui/Card';
import { Download, GitBranch, Server, Calendar, Zap, Settings, FileText, Play } from 'lucide-react';
import { deviceGatewayApi } from '@/lib/api';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header */}
        <Card variant="elevated" className="mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
            <CardContent className="py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold flex items-center mb-3">
                    <div className="bg-white/20 p-2 rounded-xl mr-4">
                      <Server className="w-8 h-8" />
                    </div>
                    Device Gateway UI
                  </h1>
                  <p className="text-blue-100 text-lg max-w-2xl">
                    Comprehensive management platform for your device gateway operations with automated scheduling and real-time monitoring
                  </p>
                  <div className="flex items-center mt-4 space-x-4">
                    <div className="flex items-center text-blue-100">
                      <Zap className="w-4 h-4 mr-1" />
                      <span className="text-sm">Real-time Operations</span>
                    </div>
                    <div className="flex items-center text-blue-100">
                      <Settings className="w-4 h-4 mr-1" />
                      <span className="text-sm">Automated Scheduling</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-3">
                  <Link href="/scheduler">
                    <Button size="lg" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30">
                      <Calendar className="w-5 h-5 mr-2" />
                      Schedule Manager
                    </Button>
                  </Link>
                  <Link href="/config">
                    <Button size="lg" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30">
                      <FileText className="w-5 h-5 mr-2" />
                      Config Editor
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Environment Information */}
        <EnvironmentBanner />

        {/* Quick Actions Section */}
        <Card variant="elevated" className="mb-8">
          <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <CardContent className="py-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-blue-600" />
                Quick Actions
              </h2>
              <p className="text-gray-600 text-sm mt-1">Execute common device operations instantly</p>
            </CardContent>
          </div>
          <CardContent className="py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OperationCard
                title="Download & Generate Topology"
                description="Download config and generate topology (recommended)"
                buttonText="Download & Generate"
                operation={deviceGatewayApi.downloadAndGenerateTopology}
                icon={<Play className="w-5 h-5 text-purple-600" />}
              />
              <OperationCard
                title="Download QUBEx Config"
                description="Download configuration from QDash API only"
                buttonText="Download Config"
                operation={deviceGatewayApi.downloadQubexConfig}
                icon={<Download className="w-5 h-5 text-blue-600" />}
              />
              <OperationCard
                title="Generate Device Topology"
                description="Generate topology from existing configuration"
                buttonText="Generate Topology"
                operation={deviceGatewayApi.generateTopology}
                icon={<GitBranch className="w-5 h-5 text-green-600" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Schedules and System Overview */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <UpcomingSchedules />
          <DeviceStatusCard />
        </div>

        {/* Device Topology */}
        <TopologyViewer />
      </div>
    </main>
  );
}

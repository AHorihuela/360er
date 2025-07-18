import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Smartphone } from 'lucide-react';

interface DebugInfo {
  userAgent: string;
  isIOS: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isSecure: boolean;
  mediaDevicesSupported: boolean;
  mediaRecorderSupported: boolean;
  supportedMimeTypes: string[];
  permissions: string;
}

export function VoiceDebugging() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [permissionTest, setPermissionTest] = useState<string>('Not tested');

  useEffect(() => {
    const info: DebugInfo = {
      userAgent: navigator.userAgent,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
      isChrome: /Chrome/.test(navigator.userAgent),
      isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
      mediaDevicesSupported: !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia,
      mediaRecorderSupported: typeof MediaRecorder !== 'undefined',
      supportedMimeTypes: [],
      permissions: 'Unknown'
    };

    // Check supported MIME types
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav',
      'audio/ogg',
      'audio/mpeg'
    ];

    if (info.mediaRecorderSupported) {
      info.supportedMimeTypes = mimeTypes.filter(type => MediaRecorder.isTypeSupported(type));
    }

    setDebugInfo(info);
  }, []);

  const testMicrophonePermission = async () => {
    setPermissionTest('Testing...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionTest('✅ Permission granted');
    } catch (error: any) {
      setPermissionTest(`❌ Failed: ${error.name} - ${error.message}`);
    }
  };

  if (!debugInfo) return <div>Loading debug info...</div>;

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <Smartphone className="h-5 w-5" />
          Voice Recording Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Device & Browser</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {debugInfo.isIOS ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                iOS Device: {debugInfo.isIOS ? 'Yes' : 'No'}
              </div>
              <div className="flex items-center gap-2">
                {debugInfo.isSafari ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                Safari: {debugInfo.isSafari ? 'Yes' : 'No'}
              </div>
              <div className="flex items-center gap-2">
                {debugInfo.isChrome ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                Chrome: {debugInfo.isChrome ? 'Yes' : 'No'}
              </div>
              <div className="flex items-center gap-2">
                {debugInfo.isSecure ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                Secure (HTTPS): {debugInfo.isSecure ? 'Yes' : 'No'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">API Support</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {debugInfo.mediaDevicesSupported ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                MediaDevices API: {debugInfo.mediaDevicesSupported ? 'Supported' : 'Not supported'}
              </div>
              <div className="flex items-center gap-2">
                {debugInfo.mediaRecorderSupported ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                MediaRecorder API: {debugInfo.mediaRecorderSupported ? 'Supported' : 'Not supported'}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Supported Audio Formats</h4>
          <div className="flex flex-wrap gap-1">
            {debugInfo.supportedMimeTypes.length > 0 ? (
              debugInfo.supportedMimeTypes.map(type => (
                <Badge key={type} variant="outline" className="text-xs bg-green-100 text-green-800">
                  {type}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-xs bg-red-100 text-red-800">
                No supported formats found
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Permission Test</h4>
          <div className="flex items-center gap-2">
            <Button onClick={testMicrophonePermission} size="sm" variant="outline">
              Test Microphone Access
            </Button>
            <span className="text-xs">{permissionTest}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">User Agent</h4>
          <div className="text-xs bg-white p-2 rounded border">
            {debugInfo.userAgent}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
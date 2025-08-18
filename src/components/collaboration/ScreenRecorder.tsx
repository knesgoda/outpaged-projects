import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Video, 
  Square, 
  Play, 
  Pause, 
  Download, 
  Upload,
  Monitor,
  Camera,
  Mic,
  MicOff,
  Settings
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Recording {
  id: string;
  name: string;
  duration: number;
  size: string;
  createdAt: string;
  thumbnail?: string;
  blob?: Blob;
}

export function ScreenRecorder() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [includeWebcam, setIncludeWebcam] = useState(false);
  const [recordingDescription, setRecordingDescription] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const displayMediaOptions = {
        video: {
          mediaSource: 'screen' as const,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: includeAudio
      };

      const screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      
      let combinedStream = screenStream;
      
      if (includeWebcam) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 }
          });
          // Note: Combining streams would require more complex implementation
          // For demo purposes, we'll just use screen stream
        } catch (error) {
          console.warn('Webcam access denied:', error);
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const recording: Recording = {
          id: Math.random().toString(36).substr(2, 9),
          name: recordingDescription || `Screen Recording ${new Date().toLocaleString()}`,
          duration: recordingTime,
          size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: new Date().toISOString(),
          blob
        };
        
        setRecordings(prev => [recording, ...prev]);
        setRecordingDescription('');
        
        toast({
          title: "Recording Saved",
          description: "Your screen recording has been saved successfully",
        });
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Screen recording is now active",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not start screen recording. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks to release camera/screen access
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      setIsPaused(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const downloadRecording = (recording: Recording) => {
    if (recording.blob) {
      const url = URL.createObjectURL(recording.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.name}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Screen Recorder</h2>
        <p className="text-muted-foreground">Record your screen to create bug reports and tutorials</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-5 h-5" />
              Recording Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRecording && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Recording Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you're recording (optional)"
                    value={recordingDescription}
                    onChange={(e) => setRecordingDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      <Label>Include Audio</Label>
                    </div>
                    <Switch checked={includeAudio} onCheckedChange={setIncludeAudio} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <Label>Include Webcam</Label>
                    </div>
                    <Switch checked={includeWebcam} onCheckedChange={setIncludeWebcam} />
                  </div>
                </div>
                
                <Button onClick={startRecording} className="w-full">
                  <Monitor className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </div>
            )}
            
            {isRecording && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                  </div>
                  <Badge variant={isPaused ? "secondary" : "destructive"}>
                    {isPaused ? "Paused" : "Recording"}
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={togglePause} variant="outline" className="flex-1">
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                  <Button onClick={stopRecording} variant="destructive" className="flex-1">
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recording Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>For Bug Reports:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Show the exact steps to reproduce the issue</li>
                <li>Include the error message or unexpected behavior</li>
                <li>Record at normal speed, don't rush</li>
              </ul>
              
              <p className="pt-2"><strong>For Tutorials:</strong></p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Plan your recording beforehand</li>
                <li>Use clear, step-by-step actions</li>
                <li>Include audio narration when possible</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {recordings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Recordings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{recording.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{formatDuration(recording.duration)}</span>
                      <span>{recording.size}</span>
                      <span>{new Date(recording.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadRecording(recording)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-1" />
                      Attach to Task
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
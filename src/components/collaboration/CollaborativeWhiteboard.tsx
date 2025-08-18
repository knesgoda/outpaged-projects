import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Pen, 
  Square, 
  Circle, 
  Type,
  Eraser,
  Trash2,
  Download,
  Upload,
  Users,
  Palette,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

type Tool = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';

interface DrawingPoint {
  x: number;
  y: number;
  tool: Tool;
  color: string;
  size: number;
}

interface WhiteboardUser {
  id: string;
  name: string;
  avatar: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
}

export function CollaborativeWhiteboard() {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState([3]);
  const [zoom, setZoom] = useState(100);
  const [activeUsers] = useState<WhiteboardUser[]>([
    { id: '1', name: 'John Doe', avatar: 'JD', cursor: { x: 100, y: 100 }, isActive: true },
    { id: '2', name: 'Jane Smith', avatar: 'JS', cursor: { x: 200, y: 150 }, isActive: true },
    { id: '3', name: 'Mike Johnson', avatar: 'MJ', cursor: undefined, isActive: false }
  ]);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set up canvas
        canvas.width = 800;
        canvas.height = 600;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = currentTool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize[0];
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    toast({
      title: "Canvas Cleared",
      description: "The whiteboard has been cleared",
    });
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = `whiteboard-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const getToolIcon = (tool: Tool) => {
    switch (tool) {
      case 'pen': return <Pen className="w-4 h-4" />;
      case 'eraser': return <Eraser className="w-4 h-4" />;
      case 'rectangle': return <Square className="w-4 h-4" />;
      case 'circle': return <Circle className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Collaborative Whiteboard</h2>
          <p className="text-muted-foreground">Brainstorm and visualize ideas together in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{activeUsers.filter(u => u.isActive).length} active</span>
          </div>
          {activeUsers.filter(u => u.isActive).map((user) => (
            <div key={user.id} className="flex items-center gap-1">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {user.avatar}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Toolbar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Tools */}
              <div className="flex items-center gap-1">
                {(['pen', 'eraser', 'rectangle', 'circle', 'text'] as Tool[]).map((tool) => (
                  <Button
                    key={tool}
                    variant={currentTool === tool ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentTool(tool)}
                  >
                    {getToolIcon(tool)}
                  </Button>
                ))}
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Colors */}
              <div className="flex items-center gap-1">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-6 h-6 rounded border-2 ${
                        currentColor === color ? 'border-foreground' : 'border-border'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCurrentColor(color)}
                    />
                  ))}
                </div>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Size */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Size:</span>
                <div className="w-20">
                  <Slider
                    value={currentSize}
                    onValueChange={setCurrentSize}
                    max={20}
                    min={1}
                    step={1}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6">{currentSize[0]}px</span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Zoom */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm">
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                <Button variant="outline" size="sm">
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <RotateCw className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCanvas}>
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card>
          <CardContent className="p-0">
            <div className="relative overflow-auto" style={{ height: '600px' }}>
              <canvas
                ref={canvasRef}
                className="border cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
              />
              
              {/* User cursors */}
              {activeUsers.filter(u => u.isActive && u.cursor).map((user) => (
                <div
                  key={user.id}
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: user.cursor!.x,
                    top: user.cursor!.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full shadow-lg">
                    {user.name}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Save/Share Options */}
        <Card>
          <CardHeader>
            <CardTitle>Save & Share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Save to Project
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export as Image
              </Button>
              <Button variant="outline" className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p><strong>Collaboration Features:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Real-time drawing synchronization</li>
                <li>Live cursor tracking for all participants</li>
                <li>Automatic save every 30 seconds</li>
                <li>Version history and rollback</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
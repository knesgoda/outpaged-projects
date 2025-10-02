import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Bug, Lightbulb, ThumbsUp, ThumbsDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'improvement';
  message: string;
  rating: number;
  user: string;
  timestamp: Date;
  status: 'new' | 'reviewed' | 'resolved';
}

export function BetaFeedback() {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<string>('bug');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const feedbackItems: FeedbackItem[] = [
    {
      id: '1',
      type: 'bug',
      message: 'Task drag and drop sometimes fails on mobile',
      rating: 3,
      user: 'beta-user-1@test.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      status: 'new',
    },
    {
      id: '2',
      type: 'feature',
      message: 'Would love to see calendar integration',
      rating: 5,
      user: 'beta-user-2@test.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      status: 'reviewed',
    },
    {
      id: '3',
      type: 'improvement',
      message: 'The search could be faster',
      rating: 4,
      user: 'beta-user-3@test.com',
      timestamp: new Date(Date.now() - 1000 * 60 * 240),
      status: 'resolved',
    },
  ];

  const handleSubmitFeedback = () => {
    if (!feedbackMessage.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter feedback message',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Feedback Submitted',
      description: 'Thank you for your feedback!',
    });
    setFeedbackMessage('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-4 h-4 text-red-500" />;
      case 'feature':
        return <Lightbulb className="w-4 h-4 text-yellow-500" />;
      case 'improvement':
        return <ThumbsUp className="w-4 h-4 text-blue-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      new: 'bg-blue-500/10 text-blue-500',
      reviewed: 'bg-yellow-500/10 text-yellow-500',
      resolved: 'bg-green-500/10 text-green-500',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status as keyof typeof colors]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Beta Feedback</h2>
        <p className="text-muted-foreground">
          Collect and manage feedback from beta testers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit Feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={feedbackType} onValueChange={setFeedbackType}>
            <SelectTrigger>
              <SelectValue placeholder="Select feedback type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bug">Bug Report</SelectItem>
              <SelectItem value="feature">Feature Request</SelectItem>
              <SelectItem value="improvement">Improvement</SelectItem>
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Describe your feedback..."
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            rows={4}
          />

          <Button onClick={handleSubmitFeedback} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Submit Feedback
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(item.type)}
                    <span className="font-medium capitalize">{item.type}</span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                <p className="text-sm mb-3">{item.message}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.user}</span>
                  <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Bug Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {feedbackItems.filter((f) => f.type === 'bug').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Feature Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {feedbackItems.filter((f) => f.type === 'feature').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {feedbackItems.filter((f) => f.type === 'improvement').length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

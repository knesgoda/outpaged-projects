import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CreateChallengeDialogProps {
  children?: React.ReactNode;
  onChallengeCreated?: () => void;
}

export function CreateChallengeDialog({ children, onChallengeCreated }: CreateChallengeDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    challengeType: "",
    difficultyLevel: 1,
    experienceReward: 100,
    maxParticipants: "",
    endDate: "",
    requirements: [] as string[],
  });
  const [newRequirement, setNewRequirement] = useState("");

  const challengeTypes = [
    { value: "sprint", label: "Sprint Challenge" },
    { value: "completion", label: "Completion Challenge" },
    { value: "collaboration", label: "Collaboration Challenge" },
    { value: "innovation", label: "Innovation Challenge" },
  ];

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()]
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create challenges",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title || !formData.description || !formData.challengeType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const endDate = formData.endDate ? new Date(formData.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const challengeData = {
        title: formData.title,
        description: formData.description,
        challenge_type: formData.challengeType,
        difficulty_level: formData.difficultyLevel,
        experience_reward: formData.experienceReward,
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        start_date: new Date().toISOString(),
        end_date: endDate.toISOString(),
        requirements: {
          tasks: formData.requirements,
          difficulty: formData.difficultyLevel
        },
        rewards: {
          experience: formData.experienceReward,
          badge: formData.difficultyLevel >= 3 ? "Challenge Master" : "Challenger"
        },
        created_by: user.id,
      };

      const { error } = await supabase
        .from('community_challenges')
        .insert(challengeData);

      if (error) throw error;

      toast({
        title: "Challenge Created!",
        description: "Your challenge has been published to the community",
      });

      setFormData({
        title: "",
        description: "",
        challengeType: "",
        difficultyLevel: 1,
        experienceReward: 100,
        maxParticipants: "",
        endDate: "",
        requirements: [],
      });
      setOpen(false);
      onChallengeCreated?.();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Error",
        description: "Failed to create challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Create Challenge
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Create New Challenge
          </DialogTitle>
          <DialogDescription>
            Create a community challenge that others can participate in
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Challenge Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter challenge title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challengeType">Challenge Type *</Label>
              <Select
                value={formData.challengeType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, challengeType: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select challenge type" />
                </SelectTrigger>
                <SelectContent>
                  {challengeTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the challenge and what participants need to do"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select
                value={formData.difficultyLevel.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficultyLevel: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Beginner</SelectItem>
                  <SelectItem value="2">2 - Easy</SelectItem>
                  <SelectItem value="3">3 - Medium</SelectItem>
                  <SelectItem value="4">4 - Hard</SelectItem>
                  <SelectItem value="5">5 - Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience Reward</Label>
              <Input
                id="experience"
                type="number"
                value={formData.experienceReward}
                onChange={(e) => setFormData(prev => ({ ...prev, experienceReward: parseInt(e.target.value) || 100 }))}
                min="50"
                max="1000"
                step="50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                placeholder="Optional"
                min="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-sm text-muted-foreground">
              If not specified, challenge will end in 7 days
            </p>
          </div>

          <div className="space-y-2">
            <Label>Requirements</Label>
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add a requirement"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <Button type="button" onClick={addRequirement} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.requirements.map((req, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {req}
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Challenge"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSkillDevelopment } from "@/hooks/useSkillDevelopment";

interface AddSkillDialogProps {
  children?: React.ReactNode;
  onSkillAdded?: () => void;
}

export function AddSkillDialog({ children, onSkillAdded }: AddSkillDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { addExperience } = useSkillDevelopment();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    skillName: "",
    customSkill: "",
    initialExperience: 0,
    milestones: [] as string[],
  });
  const [newMilestone, setNewMilestone] = useState("");

  const predefinedSkills = [
    { value: "development", label: "Software Development", category: "Technical" },
    { value: "testing", label: "Testing & QA", category: "Technical" },
    { value: "problem-solving", label: "Problem Solving", category: "Innovation" },
    { value: "leadership", label: "Leadership", category: "Leadership" },
    { value: "collaboration", label: "Collaboration", category: "Collaboration" },
    { value: "communication", label: "Communication", category: "Collaboration" },
    { value: "project-management", label: "Project Management", category: "Leadership" },
    { value: "mentoring", label: "Mentoring", category: "Leadership" },
    { value: "creativity", label: "Creativity", category: "Innovation" },
    { value: "analytical-thinking", label: "Analytical Thinking", category: "Innovation" },
  ];

  const addMilestone = () => {
    if (newMilestone.trim()) {
      setFormData(prev => ({
        ...prev,
        milestones: [...prev.milestones, newMilestone.trim()]
      }));
      setNewMilestone("");
    }
  };

  const removeMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add skills",
        variant: "destructive",
      });
      return;
    }

    const skillName = formData.skillName === "custom" ? formData.customSkill : formData.skillName;
    
    if (!skillName) {
      toast({
        title: "Missing Information",
        description: "Please select or enter a skill name",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Add the skill with initial experience
      const skill = await addExperience(skillName, formData.initialExperience || 25);
      
      if (!skill) {
        throw new Error("Failed to create skill");
      }

      toast({
        title: "Skill Added!",
        description: `${skillName} has been added to your skill tracker`,
      });

      setFormData({
        skillName: "",
        customSkill: "",
        initialExperience: 0,
        milestones: [],
      });
      setOpen(false);
      onSkillAdded?.();
    } catch (error) {
      console.error('Error adding skill:', error);
      toast({
        title: "Error",
        description: "Failed to add skill. Please try again.",
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
            Add Skill
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Add New Skill
          </DialogTitle>
          <DialogDescription>
            Start tracking a new skill and set initial milestones
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="skillName">Skill *</Label>
            <Select
              value={formData.skillName}
              onValueChange={(value) => setFormData(prev => ({ ...prev, skillName: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Skill</SelectItem>
                {predefinedSkills.map((skill) => (
                  <SelectItem key={skill.value} value={skill.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{skill.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {skill.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.skillName === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customSkill">Custom Skill Name *</Label>
              <Input
                id="customSkill"
                value={formData.customSkill}
                onChange={(e) => setFormData(prev => ({ ...prev, customSkill: e.target.value }))}
                placeholder="Enter skill name"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="initialExperience">Initial Experience Points</Label>
            <Input
              id="initialExperience"
              type="number"
              value={formData.initialExperience}
              onChange={(e) => setFormData(prev => ({ ...prev, initialExperience: parseInt(e.target.value) || 0 }))}
              min="0"
              max="1000"
              step="25"
              placeholder="0"
            />
            <p className="text-sm text-muted-foreground">
              Start with existing experience in this skill (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Initial Milestones (Optional)</Label>
            <div className="flex gap-2">
              <Input
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                placeholder="Add a milestone"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
              />
              <Button type="button" onClick={addMilestone} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.milestones.map((milestone, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {milestone}
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Set goals or achievements you want to track for this skill
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Skill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
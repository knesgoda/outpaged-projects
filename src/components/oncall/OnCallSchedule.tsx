import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Phone, Calendar, Clock, Users } from "lucide-react";
import { toast } from "sonner";

interface OnCallRotation {
  id: string;
  name: string;
  team: string;
  schedule: OnCallShift[];
}

interface OnCallShift {
  id: string;
  engineer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  startDate: string;
  endDate: string;
}

export function OnCallSchedule() {
  const [rotations, setRotations] = useState<OnCallRotation[]>([
    {
      id: "rotation_1",
      name: "Primary On-Call",
      team: "Engineering",
      schedule: [
        {
          id: "shift_1",
          engineer: {
            id: "eng_1",
            name: "Alice Johnson",
            email: "alice@example.com",
            phone: "+1234567890",
          },
          startDate: "2025-10-01",
          endDate: "2025-10-07",
        },
        {
          id: "shift_2",
          engineer: {
            id: "eng_2",
            name: "Bob Smith",
            email: "bob@example.com",
            phone: "+1234567891",
          },
          startDate: "2025-10-08",
          endDate: "2025-10-14",
        },
      ],
    },
  ]);

  const getCurrentOnCall = (rotation: OnCallRotation) => {
    const now = new Date();
    return rotation.schedule.find(shift => {
      const start = new Date(shift.startDate);
      const end = new Date(shift.endDate);
      return now >= start && now <= end;
    });
  };

  const pageEngineer = (engineer: OnCallShift["engineer"]) => {
    toast.success(`Paging ${engineer.name}`, {
      description: `Sending alert to ${engineer.phone}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">On-Call Schedule</h2>
          <p className="text-muted-foreground">Manage on-call rotations and escalations</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Rotation
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {rotations.map(rotation => {
          const currentShift = getCurrentOnCall(rotation);

          return (
            <Card key={rotation.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{rotation.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{rotation.team}</p>
                  </div>
                  {currentShift && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => pageEngineer(currentShift.engineer)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Page On-Call
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {currentShift && (
                  <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {currentShift.engineer.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{currentShift.engineer.name}</p>
                          <Badge variant="default" className="text-xs">
                            Currently On-Call
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{currentShift.engineer.email}</span>
                          <span>•</span>
                          <span>{currentShift.engineer.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(currentShift.startDate).toLocaleDateString()} -{" "}
                            {new Date(currentShift.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Upcoming Schedule
                  </h4>
                  <div className="space-y-2">
                    {rotation.schedule.map(shift => {
                      const isCurrent = currentShift?.id === shift.id;
                      return (
                        <div
                          key={shift.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            isCurrent ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {shift.engineer.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{shift.engineer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(shift.startDate).toLocaleDateString()} -{" "}
                                {new Date(shift.endDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

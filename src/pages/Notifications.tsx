import { AdvancedNotificationCenter } from "@/components/notifications/AdvancedNotificationCenter";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default function Notifications() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Notifications & Activity</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AdvancedNotificationCenter />
          <ActivityFeed showTitle={true} />
        </div>
      </div>
    </div>
  );
}
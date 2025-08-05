import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTicketCategories, useCreateTicket, CreateTicketData } from "@/hooks/useTickets";
import { useToast } from "@/hooks/use-toast";

const baseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category_id: z.string().min(1, "Category is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Valid email is required"),
  customer_phone: z.string().optional(),
  customer_company: z.string().optional(),
});

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  
  const { data: categories } = useTicketCategories();
  const createTicket = useCreateTicket();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof baseSchema>>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      priority: "medium",
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_company: "",
    },
  });

  const selectedCategoryData = categories?.find(cat => cat.id === selectedCategory);

  useEffect(() => {
    if (selectedCategoryData?.required_fields) {
      const fields: Record<string, string> = {};
      selectedCategoryData.required_fields.forEach(field => {
        fields[field] = "";
      });
      setDynamicFields(fields);
    }
  }, [selectedCategoryData]);

  const onSubmit = async (values: z.infer<typeof baseSchema>) => {
    try {
      const ticketData: CreateTicketData = {
        ...values,
        custom_fields: dynamicFields,
      };

      await createTicket.mutateAsync(ticketData);
      
      toast({
        title: "Ticket Created",
        description: "Your support ticket has been created successfully.",
      });
      
      form.reset();
      setDynamicFields({});
      setSelectedCategory("");
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    form.setValue("category_id", categoryId);
  };

  const handleDynamicFieldChange = (fieldName: string, value: string) => {
    setDynamicFields(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const formatFieldLabel = (fieldName: string) => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={handleCategoryChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please provide detailed information about the issue..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCategoryData?.required_fields && selectedCategoryData.required_fields.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Additional Information Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCategoryData.required_fields.map((fieldName) => (
                    <div key={fieldName}>
                      <label className="text-sm font-medium">
                        {formatFieldLabel(fieldName)}
                      </label>
                      <Textarea
                        placeholder={`Please provide ${formatFieldLabel(fieldName).toLowerCase()}...`}
                        value={dynamicFields[fieldName] || ""}
                        onChange={(e) => handleDynamicFieldChange(fieldName, e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTicket.isPending}
              >
                {createTicket.isPending ? "Creating..." : "Create Ticket"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
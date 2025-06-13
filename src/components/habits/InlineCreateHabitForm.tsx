"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const formSchema = z.object({
  description: z.string().min(1, {
    message: "Description is required.",
  }),
  frequency: z.string().min(1, { message: "Frequency is required" }),
  timeOfDay: z.string().min(1, { message: "Time of day is required" }),
});

interface InlineCreateHabitFormProps {
  onCreate: (
    data: z.infer<typeof formSchema> | { description: string; isAI: boolean }
  ) => void;
  onCancel: () => void;
  isProgram?: boolean;
}

// FIX: Changed from a named export to a default export
export default function InlineCreateHabitForm({
  onCreate,
  onCancel,
  isProgram = false,
}: InlineCreateHabitFormProps) {
  const [creationType, setCreationType] = useState<"manual" | "ai">("manual");
  const [habitDescription, setHabitDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      frequency: "",
      timeOfDay: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onCreate(values);
  }

  const handleCreateWithAI = async () => {
    setIsCreating(true);
    try {
      console.log("Creating habit with AI:", habitDescription);
      toast({
        title: "Habit created with AI!",
        description: "Your new habit has been added.",
      });
      onCreate({ description: habitDescription, isAI: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not create habit with AI.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <RadioGroup
        defaultValue="manual"
        onValueChange={(value: "manual" | "ai") => setCreationType(value)}
        className="flex space-x-4 mb-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="manual" id="manual" />
          <Label htmlFor="manual">Manual</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="ai" id="ai" />
          <Label htmlFor="ai">Create with AI</Label>
        </div>
      </RadioGroup>

      {creationType === "ai" && (
        <div className="space-y-4">
          <Textarea
            placeholder="e.g., Go for a run every morning at 7am"
            value={habitDescription}
            onChange={(e) => setHabitDescription(e.target.value)}
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWithAI}
              disabled={!habitDescription || isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </div>
        </div>
      )}

      {creationType === "manual" && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I want to...</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Go for a run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select how often" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timeOfDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time of Day</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a time of day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="any">Any Time</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {isProgram ? "Add to Program" : "Create Habit"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}
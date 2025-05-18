
import React from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const entityFormSchema = z.object({
  kind: z.string().min(2, "Entity type must be at least 2 characters").regex(/^[A-Z][A-Z0-9_]*$/, "Type must start with uppercase letter and contain only letters, numbers, and underscores"),
  labelProp: z.string().default("title"),
  shape: z.enum(["rectangle", "roundrectangle", "ellipse", "triangle", "pentagon", "diamond", "hexagon", "star"]).default("rectangle"),
  color: z.string().default("#7C5BF1")
});

export type EntityFormValues = z.infer<typeof entityFormSchema>;

interface EntityTypeFormProps {
  onSubmit: (values: EntityFormValues) => void;
}

export function EntityTypeForm({ onSubmit }: EntityTypeFormProps) {
  const form = useForm<EntityFormValues>({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      kind: "",
      labelProp: "title",
      shape: "rectangle",
      color: "#7C5BF1"
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entity Type Name</FormLabel>
              <FormControl>
                <Input placeholder="CHARACTER" {...field} />
              </FormControl>
              <FormDescription>
                Type must be uppercase (e.g., CHARACTER, LOCATION)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="labelProp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label Property</FormLabel>
              <FormControl>
                <Input placeholder="title" {...field} />
              </FormControl>
              <FormDescription>
                Property used to display entity name (usually "title")
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="shape"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shape</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shape" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rectangle">Rectangle</SelectItem>
                    <SelectItem value="roundrectangle">Rounded Rectangle</SelectItem>
                    <SelectItem value="ellipse">Circle/Ellipse</SelectItem>
                    <SelectItem value="triangle">Triangle</SelectItem>
                    <SelectItem value="pentagon">Pentagon</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                    <SelectItem value="hexagon">Hexagon</SelectItem>
                    <SelectItem value="star">Star</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      {...field}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full">Create Entity Type</Button>
      </form>
    </Form>
  );
}

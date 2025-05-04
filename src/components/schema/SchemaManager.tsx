
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Plus, AlertTriangle, Database, Link as LinkIcon } from "lucide-react";
import { useGraph } from '@/contexts/GraphContext';
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from '@/lib/utils';

// Define zod schemas for validation
const entityFormSchema = z.object({
  kind: z.string().min(2, "Entity type must be at least 2 characters").regex(/^[A-Z][A-Z0-9_]*$/, "Type must start with uppercase letter and contain only letters, numbers, and underscores"),
  labelProp: z.string().default("title"),
  shape: z.enum(["rectangle", "roundrectangle", "ellipse", "triangle", "diamond", "hexagon", "star"]).default("rectangle"),
  color: z.string().default("#7C5BF1")
});

const relationshipFormSchema = z.object({
  label: z.string().min(2, "Relationship type must be at least 2 characters").regex(/^[A-Z][A-Z0-9_]*$/, "Type must start with uppercase letter and contain only letters, numbers, and underscores"),
  from: z.string().min(1, "Source entity type is required"),
  to: z.string().min(1, "Target entity type is required"),
  directed: z.boolean().default(true),
  color: z.string().default("#7C5BF1")
});

export function SchemaManager() {
  const { getEntityTypes, getRelationshipTypes, registerEntityType, registerRelationshipType } = useGraph();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("entities");
  const [entityTypes, setEntityTypes] = useState(() => getEntityTypes());
  const [relationshipTypes, setRelationshipTypes] = useState(() => getRelationshipTypes());

  // Forms
  const entityForm = useForm({
    resolver: zodResolver(entityFormSchema),
    defaultValues: {
      kind: "",
      labelProp: "title",
      shape: "rectangle",
      color: "#7C5BF1"
    },
  });

  const relationshipForm = useForm({
    resolver: zodResolver(relationshipFormSchema),
    defaultValues: {
      label: "",
      from: "",
      to: "",
      directed: true,
      color: "#7C5BF1"
    },
  });

  // Handle entity submission
  const onSubmitEntity = (values: z.infer<typeof entityFormSchema>) => {
    try {
      registerEntityType(values.kind, values.labelProp, {
        'shape': values.shape,
        'background-color': values.color
      });
      
      // Refresh entity types list
      setEntityTypes(getEntityTypes());
      
      // Reset form
      entityForm.reset();
      
      toast.success(`Entity type ${values.kind} created successfully.`);
    } catch (error) {
      toast.error("Failed to create entity type.");
    }
  };

  // Handle relationship submission
  const onSubmitRelationship = (values: z.infer<typeof relationshipFormSchema>) => {
    try {
      registerRelationshipType(
        values.label, 
        values.from, 
        values.to, 
        values.directed,
        { 'line-color': values.color }
      );
      
      // Refresh relationship types list
      setRelationshipTypes(getRelationshipTypes());
      
      // Reset form
      relationshipForm.reset();
      
      toast.success(`Relationship type ${values.label} created successfully.`);
    } catch (error) {
      toast.error("Failed to create relationship type.");
    }
  };

  // Update lists when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setEntityTypes(getEntityTypes());
      setRelationshipTypes(getRelationshipTypes());
    }
    setIsOpen(open);
  };

  // Shape previews
  const shapePreview = (shape: string, color: string) => {
    const shapeMap: Record<string, React.ReactNode> = {
      rectangle: <div className="w-6 h-4" style={{ backgroundColor: color }} />,
      roundrectangle: <div className="w-6 h-4 rounded-md" style={{ backgroundColor: color }} />,
      ellipse: <div className="w-6 h-4 rounded-full" style={{ backgroundColor: color }} />,
      triangle: <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent" style={{ borderBottomColor: color }} />,
      diamond: <div className="w-6 h-6 rotate-45" style={{ backgroundColor: color }} />,
      hexagon: <div className="w-6 h-6 bg-hexagon" style={{ backgroundColor: color }} />,
      star: <div className="text-lg" style={{ color }}>★</div>,
    };

    return shapeMap[shape] || <div className="w-6 h-4" style={{ backgroundColor: color }} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 bg-[#12141f] border-[#1a1b23]">
          <Settings className="h-4 w-4" />
          <span>Schema</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Schema Manager
          </DialogTitle>
        </DialogHeader>
        
        <Tabs 
          defaultValue="entities" 
          className="flex-1 flex flex-col overflow-hidden" 
          value={activeTab} 
          onValueChange={setActiveTab}
        >
          <TabsList>
            <TabsTrigger value="entities">Entity Types</TabsTrigger>
            <TabsTrigger value="relationships">Relationship Types</TabsTrigger>
            <TabsTrigger value="usage">How to Use</TabsTrigger>
          </TabsList>
          
          <TabsContent value="entities" className="flex-1 overflow-auto p-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Entity Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define types of entities that can be used in your notes.
                </p>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Visual</TableHead>
                        <TableHead>Label Property</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityTypes.map((entity) => (
                        <TableRow key={entity.kind}>
                          <TableCell>{entity.kind}</TableCell>
                          <TableCell>{shapePreview(entity.defaultStyle?.shape || "rectangle", entity.defaultStyle?.['background-color'] || "#7C5BF1")}</TableCell>
                          <TableCell>{entity.labelProp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">New Entity Type</h3>
                <Form {...entityForm}>
                  <form onSubmit={entityForm.handleSubmit(onSubmitEntity)} className="space-y-4">
                    <FormField
                      control={entityForm.control}
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
                      control={entityForm.control}
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
                        control={entityForm.control}
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
                        control={entityForm.control}
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
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="relationships" className="flex-1 overflow-auto p-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Relationship Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Define types of relationships that can connect entities in your notes.
                </p>
                
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Directed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relationshipTypes.map((relationship) => (
                        <TableRow key={relationship.label}>
                          <TableCell>{relationship.label}</TableCell>
                          <TableCell>{Array.isArray(relationship.from) ? relationship.from.join(', ') : relationship.from}</TableCell>
                          <TableCell>{Array.isArray(relationship.to) ? relationship.to.join(', ') : relationship.to}</TableCell>
                          <TableCell>{relationship.directed ? 'Yes' : 'No'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">New Relationship Type</h3>
                <Form {...relationshipForm}>
                  <form onSubmit={relationshipForm.handleSubmit(onSubmitRelationship)} className="space-y-4">
                    <FormField
                      control={relationshipForm.control}
                      name="label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship Type</FormLabel>
                          <FormControl>
                            <Input placeholder="FRIEND_OF" {...field} />
                          </FormControl>
                          <FormDescription>
                            Type must be uppercase with underscores (e.g., FRIEND_OF)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={relationshipForm.control}
                        name="from"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Entity Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="*">Any Type (*)</SelectItem>
                                {entityTypes.map(entity => (
                                  <SelectItem key={entity.kind} value={entity.kind}>
                                    {entity.kind}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={relationshipForm.control}
                        name="to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>To Entity Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="*">Any Type (*)</SelectItem>
                                {entityTypes.map(entity => (
                                  <SelectItem key={entity.kind} value={entity.kind}>
                                    {entity.kind}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={relationshipForm.control}
                        name="directed"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Directed Relationship</FormLabel>
                              <FormDescription>
                                If directed, relationship has a specific direction (from → to)
                              </FormDescription>
                            </div>
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={relationshipForm.control}
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
                    
                    <Button type="submit" className="w-full">Create Relationship Type</Button>
                  </form>
                </Form>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="usage" className="flex-1 overflow-auto p-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Using the Dynamic Schema System</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Galaxy Notes now supports a dynamic schema system for creating and connecting rich entity types.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Creating Entities</h4>
                <p className="text-sm">Use the following syntax in your notes to create entity instances:</p>
                <div className="bg-[#12141f] p-3 rounded-md">
                  <code>[TYPE|Name]</code>
                </div>
                <p className="text-sm">Examples:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>[CHARACTER|Jon Snow]</li>
                  <li>[LOCATION|Winterfell]</li>
                  <li>[CONCEPT|Winter is Coming]</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Creating Relationships</h4>
                <p className="text-sm">Connect entities using triple syntax:</p>
                <div className="bg-[#12141f] p-3 rounded-md">
                  <code>[TYPE_A|Entity1] (RELATIONSHIP) [TYPE_B|Entity2]</code>
                </div>
                <p className="text-sm">Examples:</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>[CHARACTER|Jon Snow] (ALLY_OF) [CHARACTER|Arya Stark]</li>
                  <li>[CHARACTER|Cersei Lannister] (ENEMY_OF) [CHARACTER|Jon Snow]</li>
                  <li>[CHARACTER|Jon Snow] (LOCATED_IN) [LOCATION|Winterfell]</li>
                </ul>
              </div>
              
              <div className="mt-4 p-4 bg-[#12141f] rounded-md border border-amber-600/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-500">Important Notes</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-1">
                      <li>Entity type names must be in UPPERCASE (e.g., CHARACTER, LOCATION)</li>
                      <li>Relationship type names must be in UPPERCASE_WITH_UNDERSCORES</li>
                      <li>Entity and relationship types must be defined here before using them</li>
                      <li>The system automatically parses your notes when you save them</li>
                      <li>View extracted entities and relationships in the Connections panel</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

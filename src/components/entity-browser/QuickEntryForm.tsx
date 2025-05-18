
import React, { useState } from 'react';
import { useGraph } from '@/contexts/GraphContext';
import { Entity } from '@/lib/utils/parsingUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { generateEntityId } from '@/lib/schema';

interface QuickEntryFormProps {
  onEntityCreated: (entity: Entity) => void;
}

export function QuickEntryForm({ onEntityCreated }: QuickEntryFormProps) {
  const [entityKind, setEntityKind] = useState('');
  const [entityLabel, setEntityLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const graph = useGraph();
  
  const entityTypes = graph.getEntityTypes();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!entityKind || !entityLabel) {
      toast.error("Please provide both entity type and label");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const entity: Entity = {
        kind: entityKind,
        label: entityLabel
      };
      
      // This would need to be implemented in GraphService
      if (graph.createEntity) {
        await graph.createEntity(entity);
        toast.success(`Created entity: ${entityLabel}`);
        onEntityCreated(entity);
        
        // Reset form
        setEntityKind('');
        setEntityLabel('');
      } else {
        toast.error("Entity creation not supported");
      }
    } catch (error) {
      console.error("Error creating entity:", error);
      toast.error("Failed to create entity");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Entity</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="entity-type">Entity Type</Label>
          <Select
            value={entityKind}
            onValueChange={setEntityKind}
            required
          >
            <SelectTrigger id="entity-type">
              <SelectValue placeholder="Select entity type" />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map(type => (
                <SelectItem key={type.kind} value={type.kind}>{type.kind}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="entity-label">Entity Label</Label>
          <Input
            id="entity-label"
            placeholder="Enter entity name"
            value={entityLabel}
            onChange={(e) => setEntityLabel(e.target.value)}
            required
          />
        </div>
        
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Entity"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

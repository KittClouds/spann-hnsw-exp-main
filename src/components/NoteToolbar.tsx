
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  IndentIncrease,
  IndentDecrease,
  Link,
  Trash
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useNoteOperations } from '@/hooks/useNoteOperations';
import { BlockNoteEditor } from '@blocknote/core';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from './ui/input';

interface NoteToolbarProps {
  editor: BlockNoteEditor | null;
}

export function NoteToolbar({ editor }: NoteToolbarProps) {
  const operations = useNoteOperations(editor);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  
  return (
    <div className="flex items-center gap-1 p-2 overflow-x-auto bg-muted/20 rounded-md">
      <TooltipProvider>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.toggleStyle({ bold: true })}
              >
                <Bold size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.toggleStyle({ italic: true })}
              >
                <Italic size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic</TooltipContent>
          </Tooltip>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Link size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex flex-col gap-2">
                <Input 
                  placeholder="URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Input 
                  placeholder="Link Text (optional)"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                />
                <Button onClick={() => {
                  operations.insertLink(linkUrl, linkText || undefined);
                  setLinkUrl('https://');
                  setLinkText('');
                }}>
                  Insert Link
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Separator orientation="vertical" className="mx-2 h-6" />
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.changeBlockType("heading")}
              >
                <Heading1 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 1</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.changeBlockType("heading-2")}
              >
                <Heading2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 2</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.changeBlockType("heading-3")}
              >
                <Heading3 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 3</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="mx-2 h-6" />
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.changeBlockType("bulletList")}
              >
                <List size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.changeBlockType("numberedList")}
              >
                <ListOrdered size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.changeBlockType("quote")}
              >
                <Quote size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Quote</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="mx-2 h-6" />
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.indentBlock()}
              >
                <IndentIncrease size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Indent</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.outdentBlock()}
              >
                <IndentDecrease size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Outdent</TooltipContent>
          </Tooltip>
        </div>
        
        <Separator orientation="vertical" className="mx-2 h-6" />
        
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => operations.removeCurrentBlock()}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Block</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}

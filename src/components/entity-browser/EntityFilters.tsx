
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { SortOption } from './EntityBrowser';

interface EntityFiltersProps {
  onFilterChange: (type: string | null) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: SortOption) => void;
  currentFilter: string | null;
  currentSort: SortOption;
  currentSearch: string;
  availableTypes: string[];
}

export function EntityFilters({
  onFilterChange,
  onSearchChange,
  onSortChange,
  currentFilter,
  currentSort,
  currentSearch,
  availableTypes
}: EntityFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search entities..."
          className="pl-8 max-w-[300px]"
          value={currentSearch}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2 items-center">
        <Label htmlFor="entity-type" className="whitespace-nowrap">Filter by:</Label>
        <Select 
          value={currentFilter || ''} 
          onValueChange={(value) => onFilterChange(value || null)}
        >
          <SelectTrigger id="entity-type" className="w-[180px]">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All entity types</SelectItem>
            {availableTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 items-center">
        <Label htmlFor="sort-by" className="whitespace-nowrap">Sort by:</Label>
        <Select 
          value={currentSort} 
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger id="sort-by" className="w-[180px]">
            <SelectValue placeholder="Alphabetical (A-Z)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alpha-asc">Alphabetical (A-Z)</SelectItem>
            <SelectItem value="alpha-desc">Alphabetical (Z-A)</SelectItem>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="references">Most referenced</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

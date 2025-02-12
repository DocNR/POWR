// components/library/SearchPopover.tsx
import React from 'react';
import { View } from 'react-native';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react-native';

interface SearchPopoverProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function SearchPopover({ searchQuery, onSearchChange }: SearchPopoverProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Search className="text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <View className="flex-row items-center p-2 gap-2">
          <Input
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={onSearchChange}
            className="flex-1"
            autoFocus
            placeholderTextColor="text-muted-foreground"
          />
          {searchQuery.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onPress={() => onSearchChange('')}
            >
              <X size={20} className="text-muted-foreground" />
            </Button>
          )}
        </View>
      </PopoverContent>
    </Popover>
  );
}
// components/library/FilterPopover.tsx
import React from 'react';
import { View } from 'react-native';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react-native';
import { Badge } from '@/components/ui/badge';
import { FilterOptions } from './FilterSheet';
import { Text } from 'components/ui/text';

interface FilterPopoverProps {
  activeFilters: number;
  onOpenFilters: () => void;
}

export function FilterPopover({ activeFilters, onOpenFilters }: FilterPopoverProps) {
  return (
    <View className="relative">
      <Button
        variant="ghost"
        size="icon"
        onPress={onOpenFilters}
      >
        <Filter className="text-foreground" />
      </Button>
      {activeFilters > 0 && (
        <Badge
          className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0"
        >
          <Text className="text-xs text-primary-foreground">
            {activeFilters}
        </Text>
        </Badge>
      )}
    </View>
  );
}
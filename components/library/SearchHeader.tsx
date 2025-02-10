// components/library/SearchHeader.tsx
import React from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react-native';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@react-navigation/native';

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilters: number;
  onOpenFilters: () => void;
}

export function SearchHeader({ searchQuery, onSearchChange, activeFilters, onOpenFilters }: SearchHeaderProps) {
    const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-2 px-4 py-2 bg-background border-b border-border">
      <Input
        placeholder="Search exercises..."
        value={searchQuery}
        onChangeText={onSearchChange}
        className="flex-1 text-foreground"
        placeholderTextColor={colors.textSecondary}
      />
      <View className="relative">
        <Button
          variant="outline"
          size="icon"
          onPress={onOpenFilters}
        >
          <SlidersHorizontal size={20} className="text-foreground" />
        </Button>
        {activeFilters > 0 && (
          <Badge
            className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0"
          >
            {activeFilters}
          </Badge>
        )}
      </View>
    </View>
  );
}
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export type SourceType = 'local' | 'powr' | 'nostr';

export interface FilterOptions {
  equipment: string[];
  tags: string[];
  source: SourceType[];
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  options: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
  availableFilters: {
    equipment: string[];
    tags: string[];
    source: SourceType[];
  };
}

function renderFilterSection<T extends string>(
  title: string,
  category: keyof FilterOptions,
  values: T[],
  selectedValues: T[],
  onToggle: (category: keyof FilterOptions, value: T) => void
) {
  return (
    <AccordionItem value={category}>
      <AccordionTrigger>
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-medium">{title}</Text>
          {selectedValues.length > 0 && (
            <Badge variant="secondary">
              <Text>{selectedValues.length}</Text>
            </Badge>
          )}
        </View>
      </AccordionTrigger>
      <AccordionContent>
        <View className="flex-row flex-wrap gap-2">
          {values.map(value => {
            const isSelected = selectedValues.includes(value);
            return (
              <Button
                key={value}
                variant={isSelected ? 'purple' : 'outline'}
                onPress={() => onToggle(category, value)}
              >
                <Text className={isSelected ? 'text-white' : ''}>{value}</Text>
              </Button>
            );
          })}
        </View>
      </AccordionContent>
    </AccordionItem>
  );
}

export function FilterSheet({
  isOpen,
  onClose,
  options,
  onApplyFilters,
  availableFilters
}: FilterSheetProps) {
  const [localOptions, setLocalOptions] = React.useState(options);

  const handleReset = () => {
    const resetOptions = { equipment: [], tags: [], source: [] };
    setLocalOptions(resetOptions);
    // Immediately apply reset
    onApplyFilters(resetOptions);
  };

  const toggleFilter = (
    category: keyof FilterOptions,
    value: string | SourceType
  ) => {
    setLocalOptions(prev => ({
      ...prev,
      [category]: prev[category].includes(value as any)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value as any]
    }));
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetContent>
        <View className="gap-4">
          <Accordion type="single" collapsible>
            {renderFilterSection('Equipment', 'equipment', availableFilters.equipment, localOptions.equipment, toggleFilter)}
            {renderFilterSection('Tags', 'tags', availableFilters.tags, localOptions.tags, toggleFilter)}
            {renderFilterSection<SourceType>('Source', 'source', availableFilters.source, localOptions.source, toggleFilter)}
          </Accordion>
          <View className="flex-row gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onPress={handleReset}
            >
              <Text>Reset</Text>
            </Button>
            <Button
              className="flex-1"
              variant="purple"
              onPress={() => {
                onApplyFilters(localOptions);
                onClose();
              }}
            >
              <Text className="text-white font-semibold">Apply Filters</Text>
            </Button>
          </View>
        </View>
      </SheetContent>
    </Sheet>
  );
}
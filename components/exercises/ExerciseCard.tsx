// components/exercises/ExerciseCard.tsx
import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star } from 'lucide-react-native';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Exercise } from '@/types/exercise';

interface ExerciseCardProps extends Exercise {
  onPress: () => void;
  onDelete: (id: string) => void;
  onFavorite?: () => void;
}

export function ExerciseCard({
  id,
  title,
  category,
  equipment,
  description,
  tags = [],
  source = 'local',
  usageCount,
  lastUsed,
  onPress,
  onDelete,
  onFavorite
}: ExerciseCardProps) {
  const [showSheet, setShowSheet] = React.useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);

  const handleConfirmDelete = () => {
    onDelete(id);
    setShowDeleteAlert(false);
    if (showSheet) {
      setShowSheet(false); // Close detail sheet if open
    }
  };

  return (
    <>
      <TouchableOpacity onPress={() => setShowSheet(true)} activeOpacity={0.7}>
        <Card className="mx-4">
          <CardContent className="p-4">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-lg font-semibold text-card-foreground">
                    {title}
                  </Text>
                  <Badge 
                    variant={source === 'local' ? 'outline' : 'secondary'}
                    className="text-xs"
                  >
                    <Text>{source}</Text>
                  </Badge>
                </View>
                
                <Text className="text-sm text-muted-foreground">
                  {category}
                </Text>
                {equipment && (
                  <Text className="text-sm text-muted-foreground mt-0.5">
                    {equipment}
                  </Text>
                )}
                {description && (
                  <Text className="text-sm text-muted-foreground mt-2 native:pr-12">
                    {description}
                  </Text>
                )}
                
                {(usageCount || lastUsed) && (
                  <View className="flex-row gap-4 mt-2">
                    {usageCount && (
                      <Text className="text-xs text-muted-foreground">
                        Used {usageCount} times
                      </Text>
                    )}
                    {lastUsed && (
                      <Text className="text-xs text-muted-foreground">
                        Last used: {lastUsed.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                )}

                {tags.length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Text>{tag}</Text>
                      </Badge>
                    ))}
                  </View>
                )}
              </View>

              <View className="flex-row gap-1 native:absolute native:right-0 native:top-0 native:p-2">
                {onFavorite && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onPress={onFavorite}
                    className="native:h-10 native:w-10"
                  >
                    <Star className="text-muted-foreground" size={20} />
                  </Button>
                )}
                
                <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="native:h-10 native:w-10 native:bg-muted/50 items-center justify-center"
                    >
                      <Trash2 
                        size={20} 
                        color={Platform.select({
                          ios: undefined,
                          android: '#dc2626'
                        })}
                        className="text-destructive" 
                      />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        <Text>Delete Exercise</Text>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        <Text>Are you sure you want to delete {title}? This action cannot be undone.</Text>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        <Text>Cancel</Text>
                      </AlertDialogCancel>
                      <AlertDialogAction onPress={handleConfirmDelete}>
                        <Text>Delete</Text>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>

      <Sheet isOpen={showSheet} onClose={() => setShowSheet(false)}>
        <SheetHeader>
          <SheetTitle>
            <Text className="text-xl font-bold">{title}</Text>
          </SheetTitle>
        </SheetHeader>
        <SheetContent>
          <View className="gap-6">
            {description && (
              <View>
                <Text className="text-base font-semibold mb-2">Description</Text>
                <Text className="text-base leading-relaxed">{description}</Text>
              </View>
            )}
            <View>
              <Text className="text-base font-semibold mb-2">Details</Text>
              <View className="gap-2">
                <Text className="text-base">Category: {category}</Text>
                {equipment && <Text className="text-base">Equipment: {equipment}</Text>}
                <Text className="text-base">Source: {source}</Text>
              </View>
            </View>
            {(usageCount || lastUsed) && (
              <View>
                <Text className="text-base font-semibold mb-2">Statistics</Text>
                <View className="gap-2">
                  {usageCount && (
                    <Text className="text-base">Used {usageCount} times</Text>
                  )}
                  {lastUsed && (
                    <Text className="text-base">
                      Last used: {lastUsed.toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            )}
            {tags.length > 0 && (
              <View>
                <Text className="text-base font-semibold mb-2">Tags</Text>
                <View className="flex-row flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      <Text>{tag}</Text>
                    </Badge>
                  ))}
                </View>
              </View>
            )}
          </View>
        </SheetContent>
      </Sheet>
    </>
  );
}
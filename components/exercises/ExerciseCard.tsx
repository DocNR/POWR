// components/exercises/ExerciseCard.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Star, Info } from 'lucide-react-native';
import { Exercise } from '@/types/exercise';

interface ExerciseCardProps extends Exercise {
  onPress: () => void;
  onDelete: () => void;
  onFavorite?: () => void;
}

export function ExerciseCard({
  id,
  title,
  type,
  category,
  equipment,
  description,
  tags = [],
  source,
  instructions = [],
  onPress,
  onDelete,
  onFavorite
}: ExerciseCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowDeleteAlert(false);
  };

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card>
          <CardContent className="p-4">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                {/* Title and Source Badge */}
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-lg font-semibold text-foreground">{title}</Text>
                  <Badge variant={source === 'local' ? 'outline' : 'secondary'} className="capitalize">
                    <Text>{source}</Text>
                  </Badge>
                </View>

                {/* Category & Equipment */}
                <View className="flex-row flex-wrap gap-2 mb-2">
                  <Badge variant="outline">
                    <Text>{category}</Text>
                  </Badge>
                  {equipment && (
                    <Badge variant="outline">
                      <Text>{equipment}</Text>
                    </Badge>
                  )}
                </View>

                {/* Description Preview */}
                {description && (
                  <Text className="text-sm text-muted-foreground mb-2 native:pr-12" numberOfLines={2}>
                    {description}
                  </Text>
                )}

                {/* Tags */}
                {tags.length > 0 && (
                  <View className="flex-row flex-wrap gap-1">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        <Text>{tag}</Text>
                      </Badge>
                    ))}
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-1">
                {onFavorite && (
                  <Button variant="ghost" size="icon" onPress={onFavorite} className="h-9 w-9">
                    <Star className="text-muted-foreground" size={18} />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onPress={() => setShowDetails(true)}
                  className="h-9 w-9"
                >
                  <Info className="text-muted-foreground" size={18} />
                </Button>
                <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Trash2 className="text-destructive" size={18} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {title}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <View className="flex-row justify-end gap-3 mt-4">
                      <AlertDialogCancel asChild>
                        <Button variant="outline">
                          <Text>Cancel</Text>
                        </Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button variant="destructive" onPress={handleDelete}>
                          <Text className="text-white">Delete</Text>
                        </Button>
                      </AlertDialogAction>
                    </View>
                  </AlertDialogContent>
                </AlertDialog>
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>

      {/* Details Sheet */}
      <Sheet isOpen={showDetails} onClose={() => setShowDetails(false)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <SheetContent>
          <View className="gap-6">
            {description && (
              <View>
                <Text className="text-base font-semibold mb-2">Description</Text>
                <Text className="text-base">{description}</Text>
              </View>
            )}

            <View>
              <Text className="text-base font-semibold mb-2">Details</Text>
              <View className="gap-2">
                <Text className="text-base">Type: {type}</Text>
                <Text className="text-base">Category: {category}</Text>
                {equipment && <Text className="text-base">Equipment: {equipment}</Text>}
                <Text className="text-base">Source: {source}</Text>
              </View>
            </View>

            {instructions.length > 0 && (
              <View>
                <Text className="text-base font-semibold mb-2">Instructions</Text>
                <View className="gap-2">
                  {instructions.map((instruction, index) => (
                    <Text key={index} className="text-base">
                      {index + 1}. {instruction}
                    </Text>
                  ))}
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
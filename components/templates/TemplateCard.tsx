// components/templates/TemplateCard.tsx
import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Star, Play } from 'lucide-react-native';
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
import { Template, TemplateExerciseDisplay } from '@/types/templates';
import { useIconColor } from '@/lib/theme/iconUtils';

interface TemplateCardProps {
  template: Template;
  onPress: () => void;
  onDelete: (id: string) => void;
  onFavorite: () => void;
  onStartWorkout: () => void;
}

export function TemplateCard({
  template,
  onPress,
  onDelete,
  onFavorite,
  onStartWorkout
}: TemplateCardProps) {
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const lastUsed = template.metadata?.lastUsed ? new Date(template.metadata.lastUsed) : undefined;
  const { getIconProps, getIconColor } = useIconColor();

  const {
    id,
    title,
    type,
    category,
    exercises,
    description,
    tags = [],
    source,
    isFavorite
  } = template;

  const handleConfirmDelete = () => {
    onDelete(id);
    setShowDeleteAlert(false);
  };

  // Prevent event propagation when clicking on action buttons
  const handleStartWorkout = (e: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    onStartWorkout();
  };

  const handleFavorite = (e: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    onFavorite();
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
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
                  className="text-xs capitalize"
                >
                  <Text>{source}</Text>
                </Badge>
              </View>
              
              <View className="flex-row gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  <Text>{type}</Text>
                </Badge>
                <Text className="text-sm text-muted-foreground">
                  {category}
                </Text>
              </View>

              {exercises.length > 0 && (
                <View className="mt-2">
                  <Text className="text-sm text-muted-foreground mb-1">
                    Exercises:
                  </Text>
                  <View className="gap-1">
                    {exercises.slice(0, 3).map((exercise, index) => (
                      <Text key={index} className="text-sm text-muted-foreground">
                        • {exercise.title} ({exercise.targetSets}×{exercise.targetReps})
                      </Text>
                    ))}
                    {exercises.length > 3 && (
                      <Text className="text-sm text-muted-foreground">
                        +{exercises.length - 3} more
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {description && (
                <Text className="text-sm text-muted-foreground mt-2 native:pr-12">
                  {description}
                </Text>
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

              {lastUsed && (
                <Text className="text-xs text-muted-foreground mt-2">
                  Last used: {lastUsed.toLocaleDateString()}
                </Text>
              )}
            </View>

            <View className="flex-row gap-1 native:absolute native:right-0 native:top-0 native:p-2">
              <Button 
                variant="ghost" 
                size="icon"
                onPress={handleStartWorkout}
                className="native:h-10 native:w-10"
                accessibilityLabel="Start workout"
              >
                <Play
                  size={20}
                  {...getIconProps('primary')}
                />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onPress={handleFavorite}
                className="native:h-10 native:w-10"
                accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Star 
                  size={20}
                  {...getIconProps(isFavorite ? 'primary' : 'muted')}
                  fill={isFavorite ? getIconColor('primary') : "none"}
                />
              </Button>
              <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="native:h-10 native:w-10 native:bg-muted/50 items-center justify-center"
                    accessibilityLabel="Delete template"
                  >
                    <Trash2 
                      size={20}
                      {...getIconProps('destructive')}
                    />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      <Text>Delete Template</Text>
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
  );
}
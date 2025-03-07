// components/workout/WorkoutAlertDialog.tsx
import React from 'react';
import { Text } from '@/components/ui/text';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WorkoutAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * A reusable alert dialog component for workout-related confirmations
 * Includes styling specific to workout flows including emoji and purple accent
 */
export function WorkoutAlertDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Complete Workout?",
  description = "Are you sure you want to finish this workout?",
  confirmText = "Complete",
  cancelText = "Cancel"
}: WorkoutAlertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Text className="text-xl">
              💪 {title}
            </Text>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>
              {description}
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onPress={() => onOpenChange(false)}>
            <Text>{cancelText}</Text>
          </AlertDialogCancel>
          <AlertDialogAction 
            onPress={onConfirm}
            className="bg-purple-500"
          >
            <Text className="text-white">{confirmText}</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
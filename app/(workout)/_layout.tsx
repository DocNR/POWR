// app/(workout)/_layout.tsx
import { Stack } from 'expo-router';

export default function WorkoutLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="new-exercise" 
        options={{
          title: 'New Exercise'
        }}
      />
    </Stack>
  );
}
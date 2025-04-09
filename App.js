import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RecipeListScreen from './src/screens/RecipeListScreen';
import RecipeDetailScreen from './src/screens/RecipeDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import IngredientScreen from './src/screens/IngredientScreen';
import CelebrationScreen from './src/screens/CelebrationScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Recipes" component={RecipeListScreen} />
        <Stack.Screen name="Recipe Details" component={RecipeDetailScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Ingredient" component={IngredientScreen} />
        <Stack.Screen name="Celebration" component={CelebrationScreen} 
          options={{
            headerLeft: () => null, // Remove back button
            gestureEnabled: false,  // Disable swipe back gesture
            headerBackVisible: false,
            headerTitle: 'Completed!',
          }}/> 
      </Stack.Navigator>
      
    </NavigationContainer>
  );
}
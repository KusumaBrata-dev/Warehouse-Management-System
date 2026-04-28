import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import InventoryListScreen from '../screens/InventoryListScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import TransactionFormScreen from '../screens/TransactionFormScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ session, onLogout }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName='Dashboard'
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name='Dashboard'>
          {(props) => <DashboardScreen {...props} session={session} onLogout={onLogout} />}
        </Stack.Screen>
        <Stack.Screen name='InventoryList' component={InventoryListScreen} options={{ title: 'Inventory List' }} />
        <Stack.Screen name='ItemDetail' component={ItemDetailScreen} options={{ title: 'Item Detail + Riwayat' }} />
        <Stack.Screen name='TransactionForm' component={TransactionFormScreen} options={{ title: 'Transaksi' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

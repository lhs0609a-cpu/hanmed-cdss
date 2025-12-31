import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

// 간단한 아이콘 컴포넌트 (실제로는 expo/vector-icons 사용)
const TabIcon = ({
  name,
  focused,
}: {
  name: string;
  focused: boolean;
}) => {
  const icons: Record<string, string> = {
    home: '🏠',
    search: '🔍',
    records: '📋',
    health: '💊',
    user: '👤',
  };

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, focused && styles.iconFocused]}>
        {icons[name] || '•'}
      </Text>
    </View>
  );
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '진료기록',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="records" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: '처방',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="health" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          title: '건강관리',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="health" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="user" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null, // 탭바에서 숨김 (홈에서 접근)
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          href: null, // 탭바에서 숨김 (홈에서 접근)
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  iconFocused: {
    transform: [{ scale: 1.1 }],
  },
});

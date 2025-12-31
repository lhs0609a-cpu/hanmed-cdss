import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { login } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/authStore';
import { getErrorMessage } from '../../src/services/api';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setPatient = useAuthStore((state) => state.setPatient);

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    return cleaned.slice(0, 11);
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('알림', '휴대폰 번호와 비밀번호를 입력해주세요.');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('알림', '올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await login(phone, password);
      setPatient(response.patient);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('로그인 실패', getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>HanMed</Text>
          <Text style={styles.subtitle}>한의학 건강관리 파트너</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>휴대폰 번호</Text>
            <TextInput
              style={styles.input}
              placeholder="01012345678"
              value={phone}
              onChangeText={(text) => setPhone(formatPhoneNumber(text))}
              keyboardType="phone-pad"
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 입력해주세요"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>로그인</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>계정이 없으신가요?</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>회원가입</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10b981',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  linkText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});

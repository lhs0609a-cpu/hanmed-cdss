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
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { sendVerificationCode, verifyCode, register } from '../../src/services/authService';
import { useAuthStore } from '../../src/stores/authStore';
import { getErrorMessage } from '../../src/services/api';

type Step = 'phone' | 'verify' | 'info';

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setPatient = useAuthStore((state) => state.setPatient);

  const formatPhoneNumber = (text: string) => {
    return text.replace(/\D/g, '').slice(0, 11);
  };

  const formatBirthDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 8);
    if (cleaned.length >= 6) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 4) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    return cleaned;
  };

  const handleSendCode = async () => {
    if (phone.length < 10) {
      Alert.alert('알림', '올바른 휴대폰 번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await sendVerificationCode(phone, 'register');
      Alert.alert('알림', '인증번호가 발송되었습니다.');
      setStep('verify');
    } catch (error) {
      Alert.alert('오류', getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      Alert.alert('알림', '6자리 인증번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyCode(phone, verificationCode);
      setStep('info');
    } catch (error) {
      Alert.alert('인증 실패', getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !birthDate || !password) {
      Alert.alert('알림', '필수 정보를 모두 입력해주세요.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await register({
        phone,
        verificationCode,
        password,
        name,
        birthDate,
        gender: gender || undefined,
      });
      setPatient(response.patient);
      Alert.alert('회원가입 완료', '환영합니다!', [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      Alert.alert('회원가입 실패', getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>회원가입</Text>
            <Text style={styles.subtitle}>
              {step === 'phone' && '휴대폰 번호를 입력해주세요'}
              {step === 'verify' && '인증번호를 입력해주세요'}
              {step === 'info' && '기본 정보를 입력해주세요'}
            </Text>
          </View>

          {/* Step 1: 휴대폰 번호 입력 */}
          {step === 'phone' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>휴대폰 번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="01012345678"
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>인증번호 받기</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: 인증번호 확인 */}
          {step === 'verify' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>인증번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6자리 숫자"
                  value={verificationCode}
                  onChangeText={(text) =>
                    setVerificationCode(text.replace(/\D/g, '').slice(0, 6))
                  }
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>인증 확인</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleSendCode}
                disabled={isLoading}
              >
                <Text style={styles.resendText}>인증번호 재발송</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: 기본 정보 입력 */}
          {step === 'info' && (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>이름 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="이름을 입력해주세요"
                  value={name}
                  onChangeText={setName}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>생년월일 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={birthDate}
                  onChangeText={(text) => setBirthDate(formatBirthDate(text))}
                  keyboardType="number-pad"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>성별</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === 'male' && styles.genderSelected,
                    ]}
                    onPress={() => setGender('male')}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === 'male' && styles.genderTextSelected,
                      ]}
                    >
                      남성
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      gender === 'female' && styles.genderSelected,
                    ]}
                    onPress={() => setGender('female')}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        gender === 'female' && styles.genderTextSelected,
                      ]}
                    >
                      여성
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>비밀번호 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8자 이상 입력해주세요"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>비밀번호 확인 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 입력해주세요"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>가입하기</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>로그인</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
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
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  genderSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  genderText: {
    fontSize: 16,
    color: '#6b7280',
  },
  genderTextSelected: {
    color: '#10b981',
    fontWeight: '600',
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
  resendButton: {
    alignItems: 'center',
    padding: 12,
  },
  resendText: {
    color: '#6b7280',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
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

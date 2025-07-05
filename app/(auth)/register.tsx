import { useAuth } from "@/context/auth";
import { auth, db } from "@/Firebase";
import { CreateUserData } from "@/types/user";
import { Ionicons } from "@expo/vector-icons";
import AntDesign from '@expo/vector-icons/AntDesign';
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
// import CountryFlag from "react-native-country-flag";
import { generate } from "referral-codes";
import useGoogleSignIn from "@/hooks/useGoogleSignIn";

// Import country data and the Country interface
import showAlert from "@/components/CustomAlert/ShowAlert";
import { languages, useLanguage } from "@/hooks/useLanguage";
import { userService } from "@/services/userService";
import { getStates } from "malaysia-postcodes";
import CountryFlag from "react-native-country-flag";

// Build list of Malaysian states for selection
const statesList = getStates().map((stateName: string) => ({
  code: stateName,
  name: stateName,
}));
// Re-use existing Country type shape
type State = { code: string; name: string };

const { width, height } = Dimensions.get('window');

type RegisterScreenParams = {
  group?: string;
  referralCode?: string;
  parentId?: string;
  isAddingUser?: string; // 'true' to enable Google login
};

type GroupType = "A" | "B";

export default function RegisterScreen() {
  const { setIsPublicRoute } = useAuth();

  useEffect(() => {
    setIsPublicRoute(true);
    return () => setIsPublicRoute(false);
  }, []);
  const {
    t,
    handleLanguageChange,
    showLanguageModal,
    setShowLanguageModal,
    selectedLanguage,
  } = useLanguage();

  const router = useRouter();
  const params = useLocalSearchParams<RegisterScreenParams>();
  // Google sign-in hook (for adding user via Google when requested)
  const { request: googleRequest, handleGoogleLogin } = useGoogleSignIn();

  // Add parentId state
  const [parentId, setParentId] = useState<string | undefined>(params.parentId);
  const [parentReferralCode, setParentReferralCode] = useState<string | undefined>(params.referralCode);

  useEffect(() => {
    if (params.parentId) {
      setParentId(params.parentId);
    }
    if (params.referralCode) {
      setParentReferralCode(params.referralCode);
    }
  }, [params.parentId, params.referralCode]);

  // Form state
  const [email, setEmail] = useState("");
  const [isEmailAvailable, setIsEmailAvailable] = useState(true);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(true);
  // const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [selectedEmailDomain, setSelectedEmailDomain] = useState('@email1.com');

  // Function to check email availability
  const checkEmailAvailability = async (
    email: string
  ): Promise<boolean> => {
    if (!email) {
      setIsEmailAvailable(false);
      return false;
    }

    try {
      const fullEmail = email || selectedEmailDomain;
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', fullEmail));
      const querySnapshot = await getDocs(q);

      const isAvailable = querySnapshot.empty;
      setIsEmailAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('Error checking email availability:', error);
      setIsEmailAvailable(false);
      return false;
    }
  };

  // Debounce email check
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (email) {
        await checkEmailAvailability(email);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [email, selectedEmailDomain]);

  // Country selection state
  // const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [town, setTown] = useState("");
  const [livingAddress, setLivingAddress] = useState("");
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [filteredStates, setFilteredStates] = useState<State[]>(statesList);

  // Bank information state
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [digitalBank, setDigitalBank] = useState("");
  const [digitalBankName, setDigitalBankName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [showBankModal, setShowBankModal] = useState(false);

  // Parent and group state
  const [parentUsername, setParentUsername] = useState<string>("");
  // const [parentGroup, setParentGroup] = useState<GroupType>(params.group as GroupType || "A");
  const [group, setGroup] = useState<GroupType>(params.group as GroupType || "A");

  // Other state
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  // const [loginMethod, setLoginMethod] = useState('email');
  const [transactionPassword, setTransactionPassword] = useState("");
  const [showTransactionPassword, setShowTransactionPassword] = useState(false);
  const [showShareLink, setShowShareLink] = useState(false);
  const registrationLink = `${process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081'}/register?referralCode=${params.referralCode || ''}&group=${params.group || ''}&isAddingUser=true`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: t.shareRegistrationMessage + '\n' + registrationLink
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(registrationLink)
        .then(() => showAlert(t.success, t.linkCopied))
        .catch(err => console.error('Failed to copy:', err));
    }
  };

  const renderLanguageOption = (lang: (typeof languages)[0]) => (
    <TouchableOpacity
      key={lang.code}
      style={[
        styles.languageOption,
        selectedLanguage === lang.code && styles.selectedLanguage,
      ]}
      onPress={() => handleLanguageChange(lang.code)}
    >
      <CountryFlag
        isoCode={lang.isoCode}
        size={24}
        style={{ marginRight: 8 }}
      />
      <Text
        style={[
          styles.languageOptionText,
          selectedLanguage === lang.code && styles.selectedLanguageText,
        ]}
      >
        {lang.name}
      </Text>
      {selectedLanguage === lang.code && (
        <AntDesign name="check" size={20} color="#007AFF" />
      )}
    </TouchableOpacity>
  );

  // Function to generate a unique referral code
  const generateUniqueReferralCode = async (): Promise<string> => {
    let isUnique = false;
    let referralCode = "";

    while (!isUnique) {
      referralCode = generate({
        length: 4,
        count: 1,
        charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      })[0];

      // Check if the referral code already exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", referralCode));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        isUnique = true;
      }
    }

    return referralCode;
  };

  const verifyParentReferralCode = async () => {
    if (!parentReferralCode) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("referralCode", "==", parentReferralCode));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const parentDoc = querySnapshot.docs[0];
        const parentData = parentDoc.data();
        setParentUsername(parentData.username || "");
        setParentId(parentDoc.id);
      } else {
        setParentUsername("");
        setParentId("");
      }
    } catch (error) {
      console.error("Error verifying referral code:", error);
      setParentUsername("");
      setParentId("");
    }
  };

  useEffect(() => {
    if (parentReferralCode) {
      verifyParentReferralCode();
    } else {
      setParentUsername("");
      setParentId("");
    }
  }, [parentReferralCode]);

  useEffect(() => {
    if (username) {
      checkUsernameAvailability(username);
    }
  }, [username]);

  const checkUsernameAvailability = async (
    username: string
  ): Promise<boolean> => {
    if (username.length < 3) {
      setIsUsernameAvailable(false);
      return false;
    }

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      const isAvailable = querySnapshot.empty;
      setIsUsernameAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error("Error checking username availability:", error);
      setIsUsernameAvailable(false);
      return false;
    }
  };

  const handleRegister = async () => {
    // Trim whitespace from email
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password || !username || !fullName || !transactionPassword) {
      showAlert(t.error, t.fillAllFields);
      return;
    }

    // Validate email format
    if (selectedEmailDomain === '@email1.com') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        showAlert(t.error, t.invalidEmail);
        return;
      }
    } else if (!trimmedEmail.endsWith('@email2.com')) {
      showAlert(t.error, t.invalidEmail);
      return;
    }

    // Check password length
    if (password.length < 6) {
      showAlert(t.error, t.invalidPassword);
      return;
    }

    // Check transaction password length
    if (transactionPassword.length !== 6) {
      showAlert(t.error, t.invalidTransactionPassword);
      return;
    }

    // Check username availability
    if (!isUsernameAvailable) {
      showAlert(t.error, t.usernameTaken);
      return;
    }

    try {

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      // Generate unique referral code
      const referralCode = await generateUniqueReferralCode();

      // Create base user data object
      const baseUserData: Omit<CreateUserData, 'parentId'> = {
        email: trimmedEmail,
        username,
        fullName,
        idNumber,
        state,
        town,
        phoneNumber,
        livingAddress,
        bankName,
        bankAccount,
        digitalBank,
        digitalBankName,
        bankNumber,
        selectedBank,
        transactionPassword,
        balance: 0,
        RM: 100,
        role: "user" as const,
        referralCode,
        children: [],
        group: params.group as GroupType || group || "A",
        password,
        photoURL: null,
        timestamp: serverTimestamp() as any,
      };

      // Add parentId only if it exists
      const userData = parentId
        ? { ...baseUserData, parentId }
        : baseUserData;

      // Save user data to Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), userData);

      // Update parent's children array if parent exists and has referral code
      if (parentId && parentReferralCode) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("referralCode", "==", parentReferralCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty && userCredential.user?.uid) {
          const parentDoc = querySnapshot.docs[0];
          await updateDoc(doc(db, "users", parentDoc.id), {
            children: arrayUnion(userCredential.user.uid),
          });
        }
      }

      // Handle navigation based on registration context
      if (parentId) {
        try {
          // If registering from group screens, go back to parent's tabs
          const parentData = await userService.getUserById(parentId);
          if (parentData?.email && parentData?.password) {
            // Sign out the new user
            await signOut(auth);
            // Sign back in as parent
            // await signInWithEmailAndPassword(auth, parentData.email, parentData.password);
            showAlert(
              t.success,
              t.registerSuccess,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    router.replace("/(auth)/login");
                  }
                }
              ]
            );
          }
        } catch (error) {
          console.error("Error handling parent session:", error);
          showAlert(t.error, t.registerFailed);
        }
      } else {
        // Normal registration flow
        showAlert(t.success, t.registerSuccess);
        await signOut(auth);
        router.replace("/(auth)/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showAlert(t.error, t.registerFailed);
    }
  };

  const handleGroupChange = (newGroup: GroupType) => {
    if (!params.group) {
      setGroup(newGroup);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleTransactionPasswordVisibility = () => {
    setShowTransactionPassword(!showTransactionPassword);
  };

  const handleStateSearch = (text: string) => {
    setStateSearch(text);
    const filtered = statesList.filter((stateItem: State) =>
      stateItem.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredStates(filtered);
  };

  const renderGroupSelection = () => {
    return (
      <View style={styles.groupSelectionContainer}>
        <Text style={styles.groupLabel}>{t.select} {t.group}</Text>
        <View style={styles.groupButtonsContainer}>
          <TouchableOpacity
            style={[
              styles.groupButton,
              group === "A" && styles.groupButtonSelected,
            ]}
            onPress={() => handleGroupChange("A")}
            disabled={!!params.group}
          >
            <Text
              style={[
                styles.groupButtonText,
                group === "A" && styles.groupButtonTextSelected,
              ]}
            >
              {t.group} {group === "A" ? `(${t.Selected})` : ""}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.groupButton,
              group === "B" && styles.groupButtonSelected,
            ]}
            onPress={() => handleGroupChange("B")}
            disabled={!!params.group}
          >
            <Text
              style={[
                styles.groupButtonText,
                group === "B" && styles.groupButtonTextSelected,
              ]}
            >
              {t.group} {group === "B" ? `(${t.Selected})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
        {params.group && (
          <Text style={styles.groupNote}>
            {t.GroupIsPreSelectedBasedOnParentChoice}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>{t.createAccount}</Text>

            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguageModal(true)}
            >
              {(() => {
                const selectedLang =
                  languages.find((lang) => lang.code === selectedLanguage) ||
                  languages[0];
                return (
                  <>
                    {/* <CountryFlag
                      isoCode={selectedLang.isoCode}
                      size={24}
                      style={{ marginRight: 8 }}
                    /> */}
                    <Text style={styles.languageButtonText}>
                      {selectedLang.name}
                    </Text>
                    <AntDesign name="down" size={16} color="#666" />
                  </>
                );
              })()}
            </TouchableOpacity>
          </View>

          {/* Essential Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.essentialInformation}</Text>

            <View style={styles.loginMethodContainer}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  selectedEmailDomain === '@email1.com' && styles.methodButtonActive,
                ]}
                onPress={() => {
                  setSelectedEmailDomain('@email1.com');
                  // Keep username if switching from Email 2
                  if (email.endsWith('@email2.com')) {
                    setEmail(email.split('@')[0]);
                  }
                }}
              >
                <AntDesign name="mail" size={20} color={selectedEmailDomain === '@email1.com' ? "#fff" : "#666"} />
                <Text style={[styles.methodButtonText, selectedEmailDomain === '@email1.com' && styles.methodButtonTextActive]}>{t.email}</Text>
              </TouchableOpacity>

              {params.isAddingUser === 'true' && (
                <TouchableOpacity
                  style={styles.methodButton}
                  onPress={handleGoogleLogin}
                  disabled={!googleRequest}
                >
                  <AntDesign name="google" size={20} color="red" />
                  <Text style={styles.methodButtonText}>Google Sign Up</Text>
                </TouchableOpacity>
              )}
              {/* <TouchableOpacity
                style={[
                  styles.methodButton,
                  selectedEmailDomain === '@email2.com' && styles.methodButtonActive,
                ]}
                onPress={() => {
                  setSelectedEmailDomain('@email2.com');
                  // Only append @email2.com if it's not already there
                  if (!email.endsWith('@email2.com')) {
                    setEmail(email ? email.split('@')[0] + '@email2.com' : '@email2.com');
                  }
                }}
              >
                <AntDesign name="phone" size={20} color={selectedEmailDomain === '@email2.com' ? "#fff" : "#666"} />
                <Text style={[styles.methodButtonText, selectedEmailDomain === '@email2.com' && styles.methodButtonTextActive]}>{t.phone}</Text>
              </TouchableOpacity> */}
            </View>

            {selectedEmailDomain === '@email1.com' ? (
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={[styles.input, styles.emailInput, { flex: 1 }, (!isEmailAvailable && email.trim().length > 0) && styles.invalidInput]}
                  placeholder={t.emailAddress}
                  value={email}
                  onChangeText={(text) => { setEmail(text); checkEmailAvailability(text); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholderTextColor="#666"
                />
              </View>
            ) : (
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={[styles.input, styles.emailInput, { flex: 1 }, !isEmailAvailable && styles.invalidInput]}
                  placeholder={t.phoneNumber}
                  value={email.split('@')[0]}
                  onChangeText={(text) => setEmail(text + '@email2.com')}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoComplete="tel"
                  placeholderTextColor="#666"
                />
              </View>
            )}

            {!isEmailAvailable && email.trim().length > 0 && (
              <Text style={styles.errorText}>
                {"This email is already registered."}
              </Text>
            )}

            <TextInput
              style={[
                styles.input,
                !isUsernameAvailable && username.trim().length > 0 && styles.invalidInput,
              ]}
              placeholder={t.username}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                checkUsernameAvailability(text);
              }}
              placeholderTextColor="#666"
            />
            {!isUsernameAvailable && username.trim().length > 0 && (
              <Text style={styles.errorText}>
                {t.usernameTaken}
              </Text>
            )}

            <TextInput
              style={styles.input}
              placeholder={t.fullName}
              value={fullName}
              onChangeText={setFullName}
              placeholderTextColor="#666"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t.login_password}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                onPress={togglePasswordVisibility}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t.transactionPassword}
                value={transactionPassword}
                keyboardType="numeric"
                onChangeText={(text) => {
                  const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setTransactionPassword(digits);
                }}
                secureTextEntry={!showTransactionPassword}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                onPress={toggleTransactionPasswordVisibility}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showTransactionPassword ? "eye-off" : "eye"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.locationInformation}</Text>
            <TouchableOpacity
              style={styles.countryPickerButton}
              onPress={() => setShowStateModal(true)}
            >
              {state ? (
                <View style={styles.selectedCountry}>
                  <Text style={styles.selectedCountryText}>
                    {state}
                  </Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Select State</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* Contact Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.contactInformation}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.phoneNumber}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#666"
            />

          </View>

          {/* Referral Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.your_friend_account_code}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.parentReferralCode}
              value={parentReferralCode}
              onChangeText={setParentReferralCode}
              autoCapitalize="characters"
              maxLength={4}
              editable={!params.referralCode}
              placeholderTextColor="#666"
            />
            {parentUsername && (
              <Text style={styles.successText}>{t.friend} {parentUsername}</Text>
            )}
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
          </View>

          {/* Group Selection */}
          {/* {renderGroupSelection()} */}

          {/* Registration Link Section */}
          {(params.referralCode || params.group) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t.shareRegistrationLink}</Text>
              <View style={styles.linkContainer}>
                <TextInput
                  style={styles.linkInput}
                  value={registrationLink}
                  editable={false}
                  multiline
                />
                <View style={styles.linkButtons}>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={handleCopyLink}
                  >
                    <AntDesign name="copy1" size={20} color="#007AFF" />
                    <Text style={styles.linkButtonText}>{t.copy}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={handleShare}
                  >
                    <AntDesign name="sharealt" size={20} color="#007AFF" />
                    <Text style={styles.linkButtonText}>{t.share}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={handleRegister}
            >
              <Text style={styles.buttonText}>{t.signUp}</Text>
            </TouchableOpacity>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>{t.alreadyHaveAccount}</Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login")}
              >
                <Text style={styles.loginLink}>{t.login}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Country Picker Modal */}
      <Modal
        visible={showStateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Select State</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowStateModal(false);
                  setStateSearch("");
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search State"
              value={stateSearch}
              onChangeText={handleStateSearch}
              placeholderTextColor="#666"
            />
            <FlatList
              data={filteredStates}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setState(item.code);
                    setShowStateModal(false);
                    setStateSearch("");
                  }}
                >
                  <CountryFlag isoCode={item.code} size={24} />
                  <Text style={styles.countryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.code}
              style={styles.countryList}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
            <ScrollView>{languages.map(renderLanguageOption)}</ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>{t.back}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    minHeight: height,
    paddingVertical: 40,
  },
  container: {
    flex: 1,
    padding: 20,
    position: 'relative',
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 400,
    maxHeight: height * 0.7,
    borderRadius: 15,
    padding: 20,
    ...Platform.select({
      ios: {
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.2)',
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: '0px 3px 6px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalCloseButton: {
    padding: 5,
  },
  languageList: {
    flex: 1,
  },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 2,
  },
  selectedLanguage: {
    backgroundColor: "#f5f5f5",
  },
  languageOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedLanguageText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  input: {
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  registerButton: {
    backgroundColor: "#2f95dc",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 14,
    marginBottom: 12,
  },
  successText: {
    color: "#34c759",
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  bankModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  bankModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  bankModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  searchInput: {
    height: 40,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  countryList: {
    maxHeight: 300,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  countryName: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  invalidInput: {
    borderColor: "#ff3b30",
  },
  groupSelectionContainer: {
    marginBottom: 24,
  },
  groupButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  groupButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  groupButtonSelected: {
    backgroundColor: "#2f95dc",
    borderColor: "#2f95dc",
  },
  groupButtonText: {
    fontSize: 16,
    color: "#666",
  },
  groupButtonTextSelected: {
    color: "#fff",
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  groupNote: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  countryPickerButton: {
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedCountry: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedCountryText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginLink: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  emailContainer: {
    marginBottom: 15,
  },
  emailInput: {
    marginBottom: 0,
  },
  loginMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 10,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'lightgreen',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  methodButtonActive: {
    backgroundColor: '#2196F3',
  },
  methodButtonText: {
    fontSize: 16,
    color: 'blue',
    fontWeight: '600',
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  languageSelectorContainer: {
    marginBottom: 24,
  },
  modalHeaderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  groupLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 2,
  },
  selectedLanguageItem: {
    backgroundColor: "#f5f5f5",
  },
  languageText: {
    fontSize: 16,
    color: "#333",
  },
  bankItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedBank: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
  },
  bankText: {
    fontSize: 16,
    color: "#333",
  },
  selectedBankText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  bankPickerButton: {
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#757575",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignSelf: "flex-end",
    marginBottom: 10,
  },
  languageButtonText: {
    fontSize: 16,
    color: "#333",
    marginRight: 5,
  },
  linkContainer: {
    marginTop: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
  },
  linkInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  linkButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  linkButtonText: {
    marginLeft: 5,
    color: '#007AFF',
    fontSize: 16,
  },
});

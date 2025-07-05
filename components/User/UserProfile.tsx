import PinInput from "@/components/Transaction/PinInput";
import { useAuth } from "@/context/auth";
import { auth, db, storage } from "@/Firebase";
import { useLanguage } from '@/hooks/useLanguage';
import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { getStates } from "malaysia-postcodes";

// Malaysian states list
const statesList = getStates().map((name: string) => ({ code: name, name }));
interface State { code: string; name: string; }
import { useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SelectableText from "../Common/SelectableText";
import showAlert from "../CustomAlert/ShowAlert";
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  state: string;
  livingAddress: string;
  bankName: string;
  bankAccount: string;
  digitalBank: string;
  digitalBankName: string;
  bankNumber: string;
  role?: string;
  password?: string;
  transactionPassword?: string;
  idNumber?: string;
  photoURL?: string;
}

interface Bank {
  id: string;
  name: string;
  image: any;
}

export default function UserProfileScreen() {
  const { user: authUser, signOut } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [otherBank, setOtherBank] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // State picker modal
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [filteredStates, setFilteredStates] = useState<State[]>(statesList);

  const handleStateSearch = (text: string) => {
    setStateSearch(text);
    const filtered = statesList.filter((item) => item.name.toLowerCase().includes(text.toLowerCase()));
    setFilteredStates(filtered);
  };
  const [bankNumber, setBankNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [digitalBankName, setDigitalBankName] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTransactionPassword, setShowTransactionPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');

  const { t } = useLanguage();

  const banks: Bank[] = [
    { id: 'alipay', name: t.alipay, image: require('@/assets/images/Alipay.png') },
    { id: 'wechat', name: t.wechat, image: require('@/assets/images/WeChat_Pay.png') },
    { id: 'tng', name: 'TNG', image: require('@/assets/images/TNG.png') },
    { id: 'other', name: `${digitalBankName} Other`, image: null },
  ];

  useEffect(() => {
    console.log("Auth User:", authUser); // Debug log
    if (authUser?.uid) {
      fetchUserData();
    } else {
      showAlert(
        'Login Required',
        'New Users Will Get 100 Credits',
        [
          {
            text: 'Cancel',
            onPress: () => { },
          },
          {
            text: 'Log In',
            onPress: () => router.push('/login'),
          },
        ]
      );
      return;
    }
  }, [authUser?.uid]);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching user data for uid:", authUser?.uid); // Debug log
      const userDoc = await getDoc(doc(db, "users", authUser!.uid));
      console.log("User doc exists:", userDoc.exists()); // Debug log
      if (userDoc.exists()) {
        const userData = { id: userDoc.id, ...userDoc.data() } as User;
        console.log("User data:", userData); // Debug log
        setUser(userData);
        setEditedUser(userData);
        setSelectedBank(userData.digitalBank || '');
        setBankNumber(userData.bankNumber || '');
        if (userData.digitalBank === 'other') {
          setDigitalBankName(userData.digitalBankName || '');
        }
      } else {
        // If no user document exists, create one with default values
        const defaultUserData: Partial<User> = {
          email: authUser?.email || '',
          username: authUser?.email?.split('@')[0] || '',
          fullName: '',
          idNumber: '',
          phoneNumber: '',
          state: '',
          livingAddress: '',
          bankName: '',
          bankAccount: '',
          digitalBank: '',
          digitalBankName: '',
          bankNumber: '',
          photoURL: '',
        };

        const userRef = doc(db, "users", authUser!.uid);
        await updateDoc(userRef, {
          ...defaultUserData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Set the default data in state
        setUser({ id: authUser!.uid, ...defaultUserData } as User);
        setEditedUser({ id: authUser!.uid, ...defaultUserData } as User);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      showAlert(t.error, t.UserNotAuthenticated);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (newPhotoURL?: string | null) => {
    if (!authUser?.uid || !editedUser) return;
    try {
      const userRef = doc(db, "users", authUser.uid);
      await updateDoc(userRef, {
        fullName: editedUser.fullName,
        phoneNumber: editedUser.phoneNumber,
        state: editedUser.state,
        livingAddress: editedUser.livingAddress,
        bankName: editedUser.bankName,
        bankAccount: editedUser.bankAccount,
        digitalBankName: editedUser.digitalBankName,
        idNumber: editedUser.idNumber,
        transactionPassword: editedUser.transactionPassword,
        photoURL: newPhotoURL ?? editedUser.photoURL ?? user?.photoURL ?? '',
        updatedAt: serverTimestamp(),
      });
      setIsEditing(false);
      await fetchUserData();
      showAlert(t.success, `${t.profile} ${t.updated} ${t.success}`, [
        {
          text: "OK",
          onPress: () => {
            router.replace("/(tabs)/profile");
          }
        }
      ]);
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert(t.error, `${t.updated} ${t.error}`);
    }
  };

  const handleSaveDigitalBank = async () => {
    if (!authUser?.uid) return;
    try {
      const userRef = doc(db, "users", authUser.uid);
      await updateDoc(userRef, {
        digitalBank: selectedBank,
        digitalBankName: selectedBank === 'other' ? digitalBankName : banks.find(b => b.id === selectedBank)?.name || '',
        bankNumber: bankNumber,
        updatedAt: serverTimestamp(),
      });
      setShowBankModal(false);
      await fetchUserData();
      showAlert(t.success, `${t.updated} ${t.success}`, [
        {
          text: "OK",
          onPress: () => {
            router.replace("/(tabs)/profile");
          }
        }
      ]);
    } catch (error) {
      console.error("Error updating digital bank:", error);
      showAlert(t.error, `${t.updated} ${t.error}`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error("Error signing out:", error);
      showAlert(t.error, `${t.logout} ${t.error}`);
    }
  };

  const handleAdminPanel = () => {
    router.push("/admin");
  };

  const getFieldValue = (user: User | null, fieldName: keyof User): string => {
    if (!user) return "";
    const value = user[fieldName];
    return value !== null && value !== undefined ? String(value) : "";
  };

  const renderField = (label: string, fieldName: keyof User) => {
    const value = getFieldValue(user, fieldName);
    let displayValue = value;

    // Special handling for email display
    if (fieldName === 'email' && value) {
      if (!value.endsWith('@email2.com')) {
        // For non-@email2.com emails, show as is
        displayValue = value;
      } else {
        // For @email2.com emails, hide the domain
        displayValue = value.replace('@email2.com', '');
      }
    }

    // Check if field is read-only
    const readOnlyFields = ['email', 'username'];
    const isReadOnly = readOnlyFields.includes(fieldName);

    if (isEditing && !isReadOnly) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, fieldName === 'livingAddress' && styles.multilineInput, isReadOnly && styles.readOnlyInput]}
            value={getFieldValue(editedUser, fieldName)}
            onChangeText={(text) =>
              setEditedUser((prev) => ({ ...prev!, [fieldName]: text }))
            }
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#666"
            editable={!isReadOnly}
            multiline={fieldName === 'livingAddress'}
            numberOfLines={fieldName === 'livingAddress' ? 4 : 1}
          />
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{displayValue}</Text>
      </View>
    );
  };

  const renderStateItem = () => {
    if (!editedUser) return null;

    if (isEditing) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>State</Text>
          <TouchableOpacity
            style={styles.countryPickerButton}
            onPress={() => setShowStateModal(true)}
          >
            <Text style={styles.value}>
              {editedUser.state || t.selectState}
            </Text>
          </TouchableOpacity>

          <Modal visible={showStateModal} transparent animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select State</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowStateModal(false);
                      setStateSearch('');
                    }}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder={t.search}
                  value={stateSearch}
                  onChangeText={handleStateSearch}
                  placeholderTextColor="#666"
                />
                <ScrollView>
                  {filteredStates.map((item) => (
                    <TouchableOpacity
                      key={item.code}
                      style={styles.countryText}
                      onPress={() => {
                        setEditedUser(prev => prev ? { ...prev, state: item.code } : prev);
                        setShowStateModal(false);
                        setStateSearch('');
                      }}
                    >
                      <Text style={styles.countryText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      );
    }

    return (
      <View style={styles.infoContainer}>
        <Text style={styles.label}>State : </Text>
        <View style={styles.countryContainer}>
          <Text style={styles.countryText}>
            {editedUser.state || t.notSet}
          </Text>
        </View>
      </View>
    );
  };

  const renderDigitalBankField = () => {
    if (!isEditing) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.digitalBank} {t.details}</Text>
          <View style={styles.bankDetailsCard}>
            {user?.digitalBank ? (
              <>
                <View style={styles.selectedBankRow}>
                  {user.digitalBank === 'other' ? (
                    <View style={styles.customBankDisplay}>
                      <MaterialIcons name="account-balance" size={24} color="#4CAF50" />
                      <Text style={styles.bankName}>{user.digitalBankName || `${t.other} ${t.bankName}`}</Text>
                    </View>
                  ) : (
                    <>
                      <Image
                        source={banks.find(b => b.id === user.digitalBank)?.image}
                        style={styles.bankLogoLarge}
                      />
                      <View style={styles.bankInfoContainer}>
                        <Text style={styles.bankName}>
                          {banks.find(b => b.id === user.digitalBank)?.name}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                <View style={styles.accountNumberContainer}>
                  <Text style={styles.inputLabel}>{t.account} {t.number}</Text>
                  <SelectableText text={user.bankNumber || 'Not set'} style={styles.accountNumberText} />
                </View>
              </>
            ) : (
              <View style={styles.noBankSelected}>
                <MaterialIcons name="account-balance" size={40} color="#666" />
                <Text style={styles.noBankText}>{t.no} {t.digitalBank} {t.Selected}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.digitalBank} {t.details}</Text>
        <TouchableOpacity
          style={styles.bankSelector}
          onPress={() => setShowBankModal(true)}
        >
          {selectedBank ? (
            <View style={styles.selectedBankRow}>
              {selectedBank === 'other' ? (
                <View style={styles.customBankDisplay}>
                  <MaterialIcons name="account-balance" size={24} color="#4CAF50" />
                  <Text style={styles.bankName}>{otherBank || `${t.other} ${t.bankName}`}</Text>
                </View>
              ) : (
                <>
                  <Image
                    source={banks.find(b => b.id === selectedBank)?.image}
                    style={styles.bankLogoLarge}
                  />
                  <View style={styles.bankInfoContainer}>
                    <Text style={styles.bankName}>
                      {banks.find(b => b.id === selectedBank)?.name}
                    </Text>
                  </View>
                </>
              )}
            </View>
          ) : (
            <View style={styles.selectBankPrompt}>
              <MaterialIcons name="add-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.selectBankText}>{t.select} {t.digitalBank}</Text>
            </View>
          )}
        </TouchableOpacity>

        {selectedBank === 'other' && (
          <View style={styles.customBankInput}>
            <Text style={styles.inputLabel}>{t.bankName}</Text>
            <TextInput
              style={styles.input}
              placeholder={`${t.enter} ${t.bankName}`}
              value={digitalBankName}
              onChangeText={setDigitalBankName}
              placeholderTextColor="#666"
            />
          </View>
        )}

        <View style={styles.accountNumberContainer}>
          <Text style={styles.inputLabel}>{t.account} {t.number}</Text>
          <TextInput
            style={styles.input}
            placeholder={`${t.enter} ${t.account} ${t.number}`}
            value={bankNumber}
            onChangeText={setBankNumber}
            // keyboardType="numeric"
            placeholderTextColor="#666"
          />
        </View>
      </View>
    );
  };

  // Open gallery and let user pick an image. Returns picked URI or null
  const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      quality: 1,
    });
    if (result.canceled) return null;
    return result.assets[0]?.uri || null;

  };

  // Upload picked image to Firebase Storage and return its download URL
  const uploadImageAsync = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const fileRef = ref(storage, `userAvatar/${Date.now()}`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  const handleChangePhoto = async () => {
    try {
      const uri = await pickImage();
      if (!uri) return;

      setSelectedImage(uri);
    } catch (error) {
      console.error('Image upload error', error);
      showAlert(t.error, t.error);
      return null;
    }
  };

  const handleSavePhoto = async (): Promise<string | null> => {
    if (!selectedImage) return null;
    try {
      // const uri = await pickImage();
      // if (!uri) return;

      // Delete previous photo if exists
      const oldUrl = editedUser?.photoURL || user?.photoURL;

      if (oldUrl) {
        try {
          const match = oldUrl.match(/\/o\/(.*?)\?/);
          if (match && match[1]) {
            const oldPath = decodeURIComponent(match[1]);
            await deleteObject(ref(storage, oldPath));
          }
        } catch (err) {
          console.log('Failed to delete old avatar', err);
        }
      } else {
        console.log('No previous avatar, proceeding to save new photo');
      }
      const downloadUrl = await uploadImageAsync(selectedImage);
      setEditedUser(prev => (prev ? { ...prev, photoURL: downloadUrl } : prev));
      setSelectedImage(null);
      return downloadUrl;
    } catch (error) {
      console.error('Image upload error', error);
      showAlert(t.error, t.error);
      return null;
    }
  };

  // Render profile photo
  const renderProfilePhoto = () => {
    const imageSource = isEditing ? (selectedImage || editedUser?.photoURL) : user?.photoURL;
    return (
      <View style={styles.photoContainer}>
        {isEditing ? (
          <View>
            <TouchableOpacity onPress={handleChangePhoto}>
              <Image
                source={imageSource ? { uri: imageSource } : require("@/assets/images/user.png")}
                style={styles.photo}
              />
            </TouchableOpacity>
            <FontAwesome6 name="edit" size={24} color="blue" style={styles.editIcon} />
          </View>
        ) : (
          <Image
            source={imageSource ? { uri: imageSource } : require("@/assets/images/user.png")}
            style={styles.photo}
          />
        )}
      </View>
    );
  };

  const renderPasswordField = () => {
    // ... (rest of the code remains the same)
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t.login_password}</Text>
        <View style={styles.passwordContainer}>
          <Text style={[styles.passwordText, styles.readOnlyText]}>
            {showPassword ? (user?.password || '') : '••••••••'}
          </Text>
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTransactionPasswordField = () => {
    if (!isEditing) {
      return (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>{t.transactionPassword}</Text>
          <View style={styles.passwordContainer}>
            <Text style={styles.passwordText}>
              {showTransactionPassword ? (user?.transactionPassword || '') : '••••••••'}
            </Text>
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowTransactionPassword(!showTransactionPassword)}
            >
              <Ionicons
                name={showTransactionPassword ? 'eye-off' : 'eye'}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>{t.transactionPassword}</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={editedUser?.transactionPassword || ''}
            keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
            maxLength={6}
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, '').slice(0, 6);
              setEditedUser((prev) => (prev ? { ...prev, transactionPassword: digits } : prev));
            }}
            secureTextEntry={!showTransactionPassword}
            placeholder={`${t.enter} ${t.new} ${t.transactionPassword}`}
            placeholderTextColor="#666"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowTransactionPassword(!showTransactionPassword)}
          >
            <Ionicons
              name={showTransactionPassword ? 'eye-off' : 'eye'}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAdminButton = () => {
    if (user?.role === "admin") {
      return (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={handleAdminPanel}
        >
          <Ionicons name="settings" size={24} color="white" />
          <Text style={styles.adminButtonText}>{t.admin} {t.panel}</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderBankModal = () => (
    <Modal
      visible={showBankModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBankModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t.update} {t.bank} {t.information}</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.bankSection}>
              <Text style={styles.sectionTitle}>{t.digitalBank}</Text>
              <View style={styles.bankOptionsContainer}>
                {banks.map((bank) => (
                  <TouchableOpacity
                    key={bank.id}
                    style={[
                      styles.bankOption,
                      selectedBank === bank.id && styles.selectedBankOption
                    ]}
                    onPress={() => setSelectedBank(bank.id)}
                  >
                    {bank.id === 'other' ? (
                      <MaterialIcons name="account-balance" size={32} color="#4CAF50" />
                    ) : (
                      <Image
                        source={bank.image}
                        style={styles.bankLogo}
                      />
                    )}
                    <Text style={styles.bankOptionText}>
                      {bank.id === 'other' ? 'Custom Bank' : bank.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedBank === 'other' && (
                <View style={styles.customBankInput}>
                  <Text style={styles.inputLabel}>{t.other} {t.bankName}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`${t.enter} ${t.other} ${t.bankName}`}
                    value={digitalBankName}
                    onChangeText={setDigitalBankName}
                    placeholderTextColor="#666"
                  />
                </View>
              )}

              <View style={styles.accountNumberContainer}>
                <Text style={styles.inputLabel}>{t.bank} {t.account} {t.number}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`${t.enter} ${t.bank} ${t.account} ${t.number}`}
                  value={bankNumber}
                  onChangeText={setBankNumber}
                  placeholderTextColor="#666"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.saveDigitalButton,
                  (selectedBank === 'other' && !digitalBankName) && styles.disabledButton
                ]}
                onPress={handleSaveDigitalBank}
                disabled={selectedBank === 'other' && !digitalBankName}
              >
                <Text style={styles.actionButtonText}>{t.save} {t.digitalBank}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setShowBankModal(false)}
              >
                <Text style={styles.actionButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const handleDeleteAccount = async () => {
    if (!user) return;

    setShowPinInput(true);
  };

  const handlePinConfirm = async () => {
    if (!user || !authUser) return;

    if (pin !== user.transactionPassword) {
      showAlert(t.error, `${t.invalidTransactionPassword}. ${t.tryAgain}`);
      setPin('');
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Delete user from Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.delete();
      }

      // Sign out and redirect to login
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      showAlert(
        t.error,
        `${t.error} ${t.tryAgain}`
      );
    } finally {
      setIsDeletingAccount(false);
      setShowPinInput(false);
      setPin('');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!user || !editedUser) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t.user} {t.notFound}</Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.profile} {t.settings}</Text>
          <View style={styles.buttonContainer}>
            {!isEditing ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.buttonText}>{t.edit} {t.profile}</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelButton]}
                  onPress={() => {
                    setIsEditing(false);
                    setEditedUser(user);
                    setSelectedBank(user.digitalBank || '');
                    setBankNumber(user.bankNumber || '');
                    if (user.digitalBank === 'other') {
                      setOtherBank(user.bankName || '');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveButton]}
                  onPress={async () => {
                    const newUrl = await handleSavePhoto();
                    await handleSaveProfile(newUrl);
                  }}
                >
                  <Text style={styles.buttonText}>{t.save}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {renderProfilePhoto()}
        {renderField(`${t.email}`, "email")}
        {renderField(t.username, "username")}
        {renderField(t.fullName, "fullName")}
        {renderField("ID Number", "idNumber")}
        {renderStateItem()}
        {renderField(t.livingAddress, "livingAddress")}
        {renderField(t.phoneNumber, "phoneNumber")}
        {renderPasswordField()}
        {renderTransactionPasswordField()}
        {renderField(t.bankName, "bankName")}
        {renderField(`${t.bank} ${t.account}`, "bankAccount")}
        {renderDigitalBankField()}
        {renderBankModal()}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t.logout}</Text>
        </TouchableOpacity>



        <PinInput
          visible={showPinInput}
          value={pin}
          onChange={setPin}
          onClose={() => {
            setShowPinInput(false);
            setPin('');
          }}
          onConfirm={handlePinConfirm}
          title={`${t.verify} ${t.transactionPassword}`}
        />

        {user.role === 'admin' && renderAdminButton()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  countryPickerButton: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    fontSize: 16,
    color: "#333",
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editIcon: {
    position: 'absolute',
    top: -20,
    right: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 8,
    borderRadius: 50,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 30,
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  photoInput: {
    marginTop: 12,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  value: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    marginLeft: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "red",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    // textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  bankSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
  },
  bankOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bankOption: {
    width: "48%",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
      },
    }),
  },
  selectedBankOption: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  bankLogo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
    marginBottom: 8,
  },
  bankOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginTop: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  saveDigitalButton: {
    backgroundColor: "#4CAF50",
  },
  saveBankButton: {
    backgroundColor: "#2196F3",
  },
  logoutButton: {
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  logoutText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    maxHeight: "100%",
    ...Platform.select({
      ios: {
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)",
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
    color: "#333",
  },
  countryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  countryText: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bankDetailsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedBankRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankLogoLarge: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    marginRight: 12,
  },
  bankInfoContainer: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  customBankDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountNumberContainer: {
    marginTop: 12,
  },
  accountNumberText: {
    fontSize: 16,
    color: "#333",
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
  },
  noBankSelected: {
    alignItems: "center",
    padding: 20,
  },
  noBankText: {
    color: "#666",
    fontSize: 16,
    marginTop: 8,
  },
  bankSelector: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectBankPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  selectBankText: {
    color: "#4CAF50",
    fontSize: 16,
  },
  customBankInput: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 50,
  },
  infoContainer: {
    marginBottom: 16,
  },
  passwordText: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
    flex: 1,
    paddingRight: 40,
  },
  adminButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#673AB7",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    ...Platform.select({
      ios: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
      },
    }),
  },
  adminButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50, // Make room for the eye icon
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  selectableText: {
    margin: 0,
    padding: 0,
    backgroundColor: "transparent",
    color: "#333",
    minHeight: 20,
    ...Platform.select({
      ios: {
        height: undefined,
      },
      android: {
        textAlignVertical: "center",
        paddingVertical: 0,
      },
    }),
  },
  selectionToolbar: {
    position: "absolute",
    top: -48,
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    borderRadius: 4,
  },
  toolbarButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  toolbarButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "500",
  },
  deleteAccountContainer: {
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  deleteButton: {
    backgroundColor: "#FF3B30",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  readOnlyInput: {
    backgroundColor: "#f5f5f5",
    color: "#666",
  },
  readOnlyText: {
    color: "#666",
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});


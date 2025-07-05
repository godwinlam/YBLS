import { auth } from "@/Firebase";
import { useUser } from "@/hooks/useUser";
import { adminService } from "@/services/adminService";
import { userService } from "@/services/userService";
import { UpdateUserData, User } from "@/types/user";
import { countriesList } from "@/utils/countries";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryFlag from "react-native-country-flag";
import showAlert from "../CustomAlert/ShowAlert";

export default function UserManagementScreen() {
  const { users, loading, error, fetchAllUsers, updateUser } = useUser();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editedUser, setEditedUser] = useState<UpdateUserData>(
    {} as UpdateUserData
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    checkAdminStatus();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      console.log(
        "User IDs:",
        users.map((user) => ({ uid: user.uid, email: user.email }))
      );
    }
  }, [users]);

  useEffect(() => {
    if (!users) return;

    const filtered = users.filter((user) =>
      Object.values(user).some((value) => {
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return false;
      })
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const checkAdminStatus = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    try {
      const userDetails = await userService.getUserById(currentUser.uid);
      if (userDetails?.role !== "admin") {
        showAlert("Access Denied", "Only administrators can access this page");
        router.back();
        return;
      }
      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
      showAlert("Error", "Failed to verify admin status");
      router.back();
    }
  };

  const handleEditUser = (user: User) => {
    console.log("Selected user:", user);
    setSelectedUser({
      ...user,
      uid: user.uid || user.username,
    });
    setEditedUser({

      balance: user.balance,
      RM: user.RM,
    });
    setIsModalVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) {
      showAlert("Error", "No user selected");
      return;
    }

    const userId = selectedUser.uid || selectedUser.username;
    console.log("Attempting to update user with ID:", userId);

    if (!userId) {
      showAlert("Error", "Cannot identify user for update");
      return;
    }

    try {
      const updateData: UpdateUserData = {


        balance: editedUser.balance,
        RM: editedUser.RM,
      };

      console.log("Update data:", updateData);

      await updateUser(userId, updateData);
      showAlert("Success", "User updated successfully");
      setIsModalVisible(false);
      fetchAllUsers(); // Refresh the list
    } catch (error) {
      console.error("Update error:", error);
      showAlert(
        "Error",
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleEditUser(item)}
    >
      <View style={styles.userHeader}>
        <Text style={styles.username}>{item.username}</Text>

        {/* <View style={styles.countryContainer}>
          {item.country && <CountryFlag isoCode={item.country} size={20} />}
          <Text>
            {" "}
            {countriesList.find((c) => c.code === item.country)?.name}
          </Text>
        </View> */}

        <View style={styles.roleContainer}>
          <Text style={styles.role}>{item.role}</Text>
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text>ID: {item.uid}</Text>
        <Text>Email: {item.email}</Text>
        <Text>Full Name: {item.fullName}</Text>
        <Text>ID Number: {item.idNumber}</Text>
        <Text>State: {item.state}</Text>
        <Text>Phone Number: {item.phoneNumber}</Text>
        <Text numberOfLines={2}>Living Address: {item.livingAddress}</Text>
        <Text>YBC: {item.balance}</Text>
        <Text>RM: {item.RM}</Text>
        <Text>Referral Code: {item.referralCode}</Text>
        <Text>Password: {item.password}</Text>
        <Text>Transaction Password: {item.transactionPassword}</Text>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
            onPress={() => handleEditUser(item)}
          >
            <MaterialIcons name="edit" size={20} color="white" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
            onPress={async () => {
              try {
                setLoadingUsers(prev => ({ ...prev, [item.uid]: true }));
                
                if (!item.email || !item.password) {
                  showAlert('Error', 'User email or password is missing');
                  return;
                }

                // Directly sign in as the user
                await signInWithEmailAndPassword(auth, item.email, item.password);
                showAlert('Success', `Logged in as ${item.username || item.email}`);
                
                // Log the admin access for audit
                await adminService.logMasterAccess(item.uid);
                
                // Navigate to main app
                router.replace('/(tabs)');
              } catch (error: any) {
                console.error('Error accessing user account:', error);
                showAlert('Error', error.message || 'Failed to access user account');
              } finally {
                setLoadingUsers(prev => ({ ...prev, [item.uid]: false }));
              }
            }}
          >
            {loadingUsers[item.uid] ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color="white" />
                <Text style={styles.actionButtonText}>Login as User</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        {/* <View style={styles.countryContainer}>
          <Text>Country: </Text>
          {item.country && <CountryFlag isoCode={item.country} size={20} />}
          <Text> {countriesList.find((c) => c.code === item.country)?.name}</Text>
        </View> */}
      </View>
    </TouchableOpacity>
  );

  const RoleSelector = ({
    selectedRole,
    onSelect,
  }: {
    selectedRole: "user" | "admin" | "merchant";
    onSelect: (role: "user" | "admin" | "merchant") => void;
  }) => (
    <View style={styles.optionButtonsContainer}>
      <TouchableOpacity
        style={[
          styles.optionButton,
          selectedRole === "user" && styles.optionButtonSelected,
        ]}
        onPress={() => onSelect("user")}
      >
        <Text
          style={[
            styles.optionButtonText,
            selectedRole === "user" && styles.optionButtonTextSelected,
          ]}
        >
          User
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionButton,
          selectedRole === "admin" && styles.optionButtonSelected,
        ]}
        onPress={() => onSelect("admin")}
      >
        <Text
          style={[
            styles.optionButtonText,
            selectedRole === "admin" && styles.optionButtonTextSelected,
          ]}
        >
          Admin
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionButton,
          selectedRole === "merchant" && styles.optionButtonSelected,
        ]}
        onPress={() => onSelect("merchant")}
      >
        <Text
          style={[
            styles.optionButtonText,
            selectedRole === "merchant" && styles.optionButtonTextSelected,
          ]}
        >
          Merchant
        </Text>
      </TouchableOpacity>
    </View>
  );

  const GDPStatusSelector = ({
    selectedStatus,
    onSelect,
  }: {
    selectedStatus: "active" | "inactive";
    onSelect: (status: "active" | "inactive") => void;
  }) => (
    <View style={styles.optionButtonsContainer}>
      <TouchableOpacity
        style={[
          styles.optionButton,
          selectedStatus === "active" && styles.optionButtonSelected,
        ]}
        onPress={() => onSelect("active")}
      >
        <Text
          style={[
            styles.optionButtonText,
            selectedStatus === "active" && styles.optionButtonTextSelected,
          ]}
        >
          Active
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionButton,
          selectedStatus === "inactive" && styles.optionButtonSelected,
        ]}
        onPress={() => onSelect("inactive")}
      >
        <Text
          style={[
            styles.optionButtonText,
            selectedStatus === "inactive" && styles.optionButtonTextSelected,
          ]}
        >
          Inactive
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAdmin) {
    return <ActivityIndicator />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) =>
            item.uid || item.username || item.email || Date.now().toString()
          }
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>No users found</Text>
          )}
        />
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit User</Text>

              <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{selectedUser?.fullName?.trim() || selectedUser?.username || 'Full Name'}</Text>
                {/* <TextInput
                  style={styles.input}
                  value={editedUser.fullName}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({ ...prev, fullName: text }))
                  }
                /> */}
              </View>

              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.email}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({ ...prev, email: text }))
                  }
                  keyboardType="email-address"
                />
              </View> */}

              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.phoneNumber || ""}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({ ...prev, phoneNumber: text }))
                  }
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Referral Code:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.referralCode}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({ ...prev, referralCode: text }))
                  }
                />
              </View> */}

              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Shares:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.shares?.toString()}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({
                      ...prev,
                      shares: parseInt(text) || 0,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View> */}

              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>GDP:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.gdp?.toString()}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({
                      ...prev,
                      gdp: parseInt(text) || 0,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View> */}

              {/* <View style={styles.pickerContainer}>
                <Text style={styles.inputLabel}>GDP Status:</Text>
                <GDPStatusSelector
                  selectedStatus={editedUser.gdpStatus || "inactive"}
                  onSelect={(status) =>
                    setEditedUser((prev) => ({ ...prev, gdpStatus: status }))
                  }
                />
              </View> */}

              {/* <View style={styles.pickerContainer}>
                <Text style={styles.inputLabel}>Role:</Text>
                <RoleSelector
                  selectedRole={editedUser.role || "user"}
                  onSelect={(role) =>
                    setEditedUser((prev) => ({ ...prev, role: role }))
                  }
                />
              </View> */}

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Balance:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.balance?.toString()}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({
                      ...prev,
                      balance: parseFloat(text) || 0,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>RM:</Text>
                <TextInput
                  style={styles.input}
                  value={editedUser.RM?.toString()}
                  onChangeText={(text) =>
                    setEditedUser((prev) => ({
                      ...prev,
                      RM: parseFloat(text) || 0,
                    }))
                  }
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleUpdateUser}
                >
                  <Text style={styles.buttonText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 2,
    boxShadow: "0px 2px 3.84px rgba(0, 0, 0, 0.25)",
  },
  userHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
    color: "blue",
  },
  roleContainer: {
    backgroundColor: "#e0e0e0",
    padding: 5,
    borderRadius: 5,
  },
  role: {
    fontSize: 12,
  },
  userInfo: {
    gap: 5,
  },
  countryContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  modalScrollView: {
    width: "100%",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "blue",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  pickerContainer: {
    marginBottom: 15,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    backgroundColor: "#fff",
    marginTop: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    width: "45%",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f44336",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  optionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#2f95dc",
    borderColor: "#2f95dc",
  },
  optionButtonText: {
    fontSize: 14,
    color: "#666",
  },
  optionButtonTextSelected: {
    color: "#fff",
  },
  searchContainer: {
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  searchInput: {
    height: 40,
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 16,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

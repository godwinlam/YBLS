import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import React from "react";
import Animated from "react-native-reanimated";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import showAlert from "@/components/CustomAlert/ShowAlert";

const locationImage = require("@/assets/images/burger.jpg");

const phoneNumber = "01120881183"; // without dashes
const whatsappLink = `https://wa.me/6${phoneNumber}`;
const mapLink = `https://maps.app.goo.gl/fWDhZAQVgkN76ngj6`;

const LocationScreen = () => {
  const handleWhatsApp = async () => {
    const supported = await Linking.canOpenURL(whatsappLink);
    if (supported) {
      await Linking.openURL(whatsappLink);
    } else {
      showAlert("Error", "WhatsApp not installed");
    }
  };

  const handleMap = async () => {
    const supported = await Linking.canOpenURL(mapLink);
    if (supported) {
      await Linking.openURL(mapLink);
    } else {
      showAlert("Error", "Google Map Error");
    }
  };

  const copyPhoneNumber = async () => {
    await Clipboard.setStringAsync(phoneNumber);
    showAlert("Copied", "Phone number copied to clipboard");
  };

  return (
    <View style={styles.container}>
      <Animated.Image source={locationImage} style={styles.titleImage} />
      <View style={styles.titleContainer}>
        <Text style={styles.title}>We are here</Text>
        <Text style={styles.danHair}>( partner with Dan Hair Studio )</Text>

        <TouchableOpacity style={styles.mapContainer} onPress={handleMap}>
          <MaterialIcons name="location-on" size={26} color="blue" st />
          <Text style={styles.map}>
            https://maps.app.goo.gl/fWDhZAQVgkN76ngj6
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.address}>
          No 37, JALAN MEDAN MIDAH, TAMAN MIDAH
        </Text>
        <Text style={styles.address}>56100 KUALA LUMPUR</Text>
      </View>

      <Text style={styles.phone}>Booking/Enquiry</Text>
      <Text style={styles.phone}>Evonne</Text>
      <TouchableOpacity onPress={handleWhatsApp} onLongPress={copyPhoneNumber}>
        <Text style={styles.phone}>WhatsApp Link: 011-2088 1183</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LocationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "lightyellow",
  },
  titleImage: {
    width: 350,
    height: 200,
    margin: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  danHair: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  titleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  addressContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  address: {
    fontSize: 16,
    color: "#000",
  },
  phone: {
    marginTop: 20,
    fontSize: 20,
    color: "blue",
  },
  mapContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  map: {
    fontSize: 14,
    color: "blue",
  },
});

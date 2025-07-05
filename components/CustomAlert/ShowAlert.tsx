import { Colors } from "@/constants/Colors";
import { Alert, Platform } from "react-native";

// Custom alert for web that matches native behavior
const showAlert = (title: string, message: string, buttons?: Array<{ text: string; onPress?: () => void }>) => {
  if (Platform.OS === "web") {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById("custom-alert-container");
    if (!alertContainer) {
      alertContainer = document.createElement("div");
      alertContainer.id = "custom-alert-container";
      document.body.appendChild(alertContainer);
    }

    // Create alert elements
    const alertOverlay = document.createElement("div");
    alertOverlay.style.position = "fixed";
    alertOverlay.style.top = "0";
    alertOverlay.style.left = "0";
    alertOverlay.style.right = "0";
    alertOverlay.style.bottom = "0";
    alertOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    alertOverlay.style.display = "flex";
    alertOverlay.style.justifyContent = "center";
    alertOverlay.style.alignItems = "center";
    alertOverlay.style.zIndex = "9999";

    const alertBox = document.createElement("div");
    alertBox.style.backgroundColor = "white";
    alertBox.style.padding = "20px";
    alertBox.style.borderRadius = "10px";
    alertBox.style.maxWidth = "300px";
    alertBox.style.width = "80%";
    alertBox.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";

    const titleElement = document.createElement("h3");
    titleElement.textContent = title;
    titleElement.style.margin = "0 0 10px 0";
    titleElement.style.fontSize = "18px";
    titleElement.style.textAlign = "center";

    const messageElement = document.createElement("p");
    messageElement.textContent = message;
    messageElement.style.margin = "0 0 20px 0";
    messageElement.style.fontSize = "16px";
    messageElement.style.textAlign = "center";

    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "10px";

    alertBox.appendChild(titleElement);
    alertBox.appendChild(messageElement);
    alertBox.appendChild(buttonContainer);
    alertOverlay.appendChild(alertBox);
    alertContainer.appendChild(alertOverlay);

    // Add buttons
    if (buttons && buttons.length > 0) {
      buttons.forEach((button) => {
        const buttonElement = document.createElement("button");
        buttonElement.textContent = button.text;
        buttonElement.style.padding = "10px 20px";
        buttonElement.style.border = "none";
        buttonElement.style.borderRadius = "5px";
        buttonElement.style.backgroundColor = Colors.light.tint;
        buttonElement.style.color = "white";
        buttonElement.style.fontSize = "16px";
        buttonElement.style.cursor = "pointer";
        buttonElement.onclick = () => {
          alertContainer.removeChild(alertOverlay);
          button.onPress?.();
        };
        buttonContainer.appendChild(buttonElement);
      });
    } else {
      const okButton = document.createElement("button");
      okButton.textContent = "OK";
      okButton.style.padding = "10px 20px";
      okButton.style.border = "none";
      okButton.style.borderRadius = "5px";
      okButton.style.backgroundColor = Colors.light.tint;
      okButton.style.color = "white";
      okButton.style.fontSize = "16px";
      okButton.style.cursor = "pointer";
      okButton.onclick = () => {
        alertContainer.removeChild(alertOverlay);
      };
      buttonContainer.appendChild(okButton);
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default showAlert;
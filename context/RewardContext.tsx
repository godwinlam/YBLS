import { db } from "@/Firebase";
import { RewardSettings } from "@/types/user";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

interface RewardContextType {
  rewardSettings: RewardSettings;
  setRewardSettings: React.Dispatch<React.SetStateAction<RewardSettings>>;
}

const RewardContext = createContext<RewardContextType | undefined>(undefined);

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>({
    percentage: 0,
    investmentPercentage: 0,
    investmentTerm: 0,
    gdpRewardPercentage: 0,
    withdrawalFee: 0,
  });

  useEffect(() => {
    const unsubscribeReward = onSnapshot(
      doc(db, "settings", "rewardPercentage"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as Partial<RewardSettings>;
          setRewardSettings((prev) => ({ ...prev, ...data }));
        }
      }
    );

    const unsubscribeInvestment = onSnapshot(
      doc(db, "settings", "investmentSettings"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as Partial<RewardSettings>;
          setRewardSettings((prev) => ({ ...prev, ...data }));
        }
      }
    );

    const unsubscribeGDP = onSnapshot(
      doc(db, "settings", "gdpRewardSettings"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as Partial<RewardSettings>;
          setRewardSettings((prev) => ({ ...prev, ...data }));
        }
      }
    );

    const unsubscribeWithdrawalFee = onSnapshot(
      doc(db, "settings", "withdrawalFee"),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as Partial<RewardSettings>;
          setRewardSettings((prev) => ({ ...prev, ...data }));
        }
      }
    );

    return () => {
      unsubscribeReward();
      unsubscribeInvestment();
      unsubscribeGDP();
      unsubscribeWithdrawalFee();
    };
  }, []);

  const updateRewardSettings = async (
    newSettings:
      | Partial<RewardSettings>
      | ((prevSettings: RewardSettings) => RewardSettings)
  ) => {
    try {
      let updatedSettings: RewardSettings;

      if (typeof newSettings === "function") {
        updatedSettings = newSettings(rewardSettings);
      } else {
        updatedSettings = { ...rewardSettings, ...newSettings };
      }

      await setDoc(doc(db, "settings", "rewardPercentage"), {
        percentage: updatedSettings.percentage,
      });
      await setDoc(doc(db, "settings", "investmentSettings"), {
        investmentPercentage: updatedSettings.investmentPercentage,
        investmentTerm: updatedSettings.investmentTerm,
      });
      await setDoc(doc(db, "settings", "gdpRewardSettings"), {
        gdpRewardPercentage: updatedSettings.gdpRewardPercentage,
      });
      await setDoc(doc(db, "settings", "withdrawalFee"), {
        withdrawalFee: updatedSettings.withdrawalFee,
      });
      setRewardSettings(updatedSettings);
    } catch (error) {
      console.error("Error updating reward settings:", error);
    }
  };

  return (
    <RewardContext.Provider
      value={{ rewardSettings, setRewardSettings: updateRewardSettings }}
    >
      {children}
    </RewardContext.Provider>
  );
};

export const useReward = () => {
  const context = useContext(RewardContext);
  if (context === undefined) {
    throw new Error("useReward must be used within a RewardProvider");
  }
  return context;
};

import { FieldValue, Timestamp } from "firebase/firestore";

export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  supplier: string;
  itemCode: string;
}

export interface CarouselItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  order: number;
}

export interface User {
  uid: string;
  email: string;
  username: string;
  fullName: string;
  idNumber: string | null;
  country: string | null;
  countryCode?: string;
  state: string | null;
  town: string | null;
  phoneNumber: string | null;
  livingAddress: string | null;
  bankName: string | null;
  bankAccount: string | null;
  transactionPassword: string;
  digitalBank: string | null;
  digitalBankName: string | null;
  bankNumber: string | null;
  selectedBank: string | null;
  balance: number;
  RM: number;
  token: number;
  role: "user" | "admin" | "merchant";
  referralCode: string;
  parentId?: string;
  children: string[];
  password?: string;
  group: "A" | "B";
  shares?: number;
  gdp?: number;
  gdpStatus: "active" | "inactive";
  gdpAnimation?: string;
  photoURL?: string | null;
  createdAt: number;
  updatedAt: number;
  timestamp: Timestamp | FieldValue;
}

export interface Transaction {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  timestamp: Timestamp;
  type:
    | "transfer"
    | "reward"
    | "share_purchase"
    | "investment_reward"
    | "bank_transfer";
  rewardPercentage?: number;
  sharesPurchased?: number;
  bankType?: string;
  accountNumber?: string;
  status?: "pending" | "approved" | "rejected";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Purchase {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  totalCost: number;
  timestamp: Timestamp;
  invoiceNumber: string;
}

export interface PurchaseWithItem extends Purchase {
  item: Item | null;
}

export interface RewardSettings {
  percentage: number;
  investmentPercentage?: number;
  investmentTerm?: number;
  gdpRewardPercentage?: number;
  withdrawalFee?: number;
}

export interface SharePurchase {
  id: string;
  userId: string;
  username: string;
  tokensPaid: number;
  sharesPurchased: number;
  timestamp: Timestamp | FieldValue;
  rewardClaimed: boolean;
  totalRewardClaimed: number;
}

export interface ShareOption {
  id: string;
  amount: number;
  price: number;
}

export interface GDPOption {
  id: string;
  amount: number;
  price: number;
  animationFile?: string;
  timestamp: Timestamp | FieldValue;
}

export interface GDPPurchase {
  amount: number;
  animationFile: any;
  id: string;
  userId: string;
  username: string;
  gdpPurchased: number;
  purchasePrice: number;
  gdpOptionId: string;
  timestamp: Timestamp | FieldValue;
  rewardClaimed: boolean;
  rewardClaimed130?: boolean;
  rewardClaimed150?: boolean;
  rewardClaimed200?: boolean;
  rewardClaimed300?: boolean;
  rewardClaimed500?: boolean;
  rewardClaimed1000?: boolean;
  totalRewardClaimed: number;
  source?: "gdp" | "otc";
}

export interface OTCListing {
  id: string;
  sellerId: string;
  sellerUsername: string;
  gdpAmount: number;
  sellingPrice: number;
  status: "active" | "sold" | "cancelled";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  buyerId?: string;
  buyerUsername?: string;
  countryCode: string;
  animationFile: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  fullName: string;
  idNumber: string | null;
  state: string | null;
  town: string | null;
  phoneNumber: string | null;
  livingAddress: string | null;
  bankName: string | null;
  bankAccount: string | null;
  digitalBank: string | null;
  digitalBankName: string | null;
  bankNumber: string | null;
  selectedBank: string | null;
  transactionPassword: string;
  balance: number;
  RM: number;
  role: "user" | "admin" | "merchant";
  referralCode: string;
  children: string[];
  group: "A" | "B";
  password: string;
  photoURL: string | null;
  timestamp: Timestamp | FieldValue;
  parentId?: string;
}

export type UpdateUserData = Partial<
  Omit<User, "uid" | "createdAt" | "updatedAt">
>;

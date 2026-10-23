export interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  preferredContact: "in_app" | "sms" | "email";
  accountStatus: "Active" | "Restricted" | "Pending Review";
  verificationStatus: "Identity Verified" | "Verification Required";
  memberSince: string;
  language: string;
  timezone: string;
  currency: string;
}

export interface CustomerCard {
  id: string;
  nickname: string;
  brand: "Visa" | "Mastercard";
  cardType: "Debit" | "Credit" | "Virtual";
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  status: "active" | "locked" | "under_review";
  isPrimary: boolean;
  linkedDevicesCount: number;
  monthlyLimitUsd: number;
  currentMonthSpendUsd: number;
  hasUnderReviewTxn: boolean;
  colorScheme: "sapphire" | "coral" | "charcoal";
}

export interface CustomerDevice {
  id: string;
  name: string;
  type: "laptop" | "phone" | "tablet" | "desktop";
  os: string;
  browser: string;
  lastActive: string;
  location: string;
  ipAddress: string;
  isCurrent: boolean;
  isTrusted: boolean;
  firstAdded: string;
  isFlaggedUnknown?: boolean;
}

export interface CustomerTransaction {
  id: string;
  cardId: string;
  cardName: string;
  cardLast4: string;
  amountUsd: number;
  date: string;
  time: string;
  merchant: string;
  category: string;
  channel: "online" | "in_person";
  status: "completed" | "under_review" | "pending" | "refunded";
  location: string;
  description: string;
  isFlaggedUnderReview: boolean;
}

export interface SecuritySession {
  id: string;
  deviceName: string;
  deviceType: "laptop" | "phone" | "tablet" | "desktop";
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface CustomerNotification {
  id: string;
  category: "investigation" | "security" | "transaction" | "account";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionLabel?: string;
  actionTab?: string;
}

export interface CustomerPreferences {
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushAlerts: boolean;
  alertOnAllTransactions: boolean;
  transactionAlertThresholdUsd: number;
  securityAlerts: boolean;
  investigationUpdates: boolean;
  monthlyStatementsEmail: boolean;
}

export interface CustomerSupportTicket {
  id: string;
  txnId?: string;
  subject: string;
  reason: string;
  message: string;
  status: "received" | "under_review" | "resolved";
  createdAt: string;
  estimatedResponse: string;
}

export interface CustomerActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  iconType: "profile" | "card" | "device" | "security" | "support" | "transaction";
}

export const INITIAL_CUSTOMER_PROFILE: CustomerProfile = {
  id: "C13487",
  firstName: "Elena",
  lastName: "Rostova",
  fullName: "Elena Rostova",
  email: "elena.rostova@example.com",
  phone: "+1 (555) 382-9104",
  addressLine1: "742 Evergreen Terrace, Suite 4B",
  city: "Seattle",
  state: "WA",
  postalCode: "98101",
  country: "United States",
  preferredContact: "in_app",
  accountStatus: "Active",
  verificationStatus: "Identity Verified",
  memberSince: "March 2019",
  language: "English (US)",
  timezone: "Pacific Time (US & Canada) - UTC-08:00",
  currency: "USD ($)",
};

export const INITIAL_CUSTOMER_CARDS: CustomerCard[] = [
  {
    id: "C13487-K1",
    nickname: "Primary Sapphire Debit",
    brand: "Visa",
    cardType: "Debit",
    last4: "4417",
    expiryMonth: "09",
    expiryYear: "28",
    status: "active",
    isPrimary: true,
    linkedDevicesCount: 2,
    monthlyLimitUsd: 5000,
    currentMonthSpendUsd: 4944.19,
    hasUnderReviewTxn: true,
    colorScheme: "coral",
  },
  {
    id: "C13487-K2",
    nickname: "Everyday Rewards Credit",
    brand: "Mastercard",
    cardType: "Credit",
    last4: "8820",
    expiryMonth: "11",
    expiryYear: "27",
    status: "active",
    isPrimary: false,
    linkedDevicesCount: 1,
    monthlyLimitUsd: 12000,
    currentMonthSpendUsd: 174.3,
    hasUnderReviewTxn: false,
    colorScheme: "sapphire",
  },
  {
    id: "C13487-K3",
    nickname: "Digital Virtual Card",
    brand: "Visa",
    cardType: "Virtual",
    last4: "1904",
    expiryMonth: "04",
    expiryYear: "29",
    status: "active",
    isPrimary: false,
    linkedDevicesCount: 1,
    monthlyLimitUsd: 2500,
    currentMonthSpendUsd: 312.0,
    hasUnderReviewTxn: false,
    colorScheme: "charcoal",
  },
];

export const INITIAL_CUSTOMER_DEVICES: CustomerDevice[] = [
  {
    id: "dev-macbook",
    name: "MacBook Pro 16\"",
    type: "laptop",
    os: "macOS 14.4 Sonoma",
    browser: "Safari 17.4",
    lastActive: "Active now",
    location: "Seattle, WA, United States",
    ipAddress: "198.51.100.42",
    isCurrent: true,
    isTrusted: true,
    firstAdded: "Oct 15, 2023",
  },
  {
    id: "dev-iphone",
    name: "iPhone 15 Pro",
    type: "phone",
    os: "iOS 17.4.1",
    browser: "Mobile Safari",
    lastActive: "2 hours ago",
    location: "Seattle, WA, United States",
    ipAddress: "198.51.100.42",
    isCurrent: false,
    isTrusted: true,
    firstAdded: "Jan 20, 2024",
  },
  {
    id: "dev-tablet",
    name: "Galaxy Tab S8",
    type: "tablet",
    os: "Android 13",
    browser: "Chrome Mobile 122",
    lastActive: "Yesterday at 18:40",
    location: "Portland, OR, United States",
    ipAddress: "203.0.113.19",
    isCurrent: false,
    isTrusted: true,
    firstAdded: "Aug 11, 2023",
  },
  {
    id: "dev-unrecognized-phone",
    name: "Samsung SM-G935F",
    type: "phone",
    os: "Android 7.0",
    browser: "Chrome 62.0 for Android",
    lastActive: "Nov 22, 2016 at 20:11",
    location: "Unknown (Anonymous Proxy)",
    ipAddress: "185.220.101.5",
    isCurrent: false,
    isTrusted: false,
    firstAdded: "Nov 22, 2016",
    isFlaggedUnknown: true,
  },
];

export const INITIAL_CUSTOMER_TRANSACTIONS: CustomerTransaction[] = [
  {
    id: "3478561",
    cardId: "C13487-K1",
    cardName: "Primary Sapphire Debit",
    cardLast4: "4417",
    amountUsd: 4850.0,
    date: "Nov 22, 2016",
    time: "20:11",
    merchant: "Apex Global Electronics",
    category: "Electronics & Tech",
    channel: "online",
    status: "under_review",
    location: "Online",
    description: "Online order flagged for customer confirmation",
    isFlaggedUnderReview: true,
  },
  {
    id: "3471092",
    cardId: "C13487-K1",
    cardName: "Primary Sapphire Debit",
    cardLast4: "4417",
    amountUsd: 64.2,
    date: "Nov 21, 2016",
    time: "14:32",
    merchant: "Whole Foods Market",
    category: "Groceries",
    channel: "in_person",
    status: "completed",
    location: "Seattle, WA",
    description: "Contactless in-store purchase",
    isFlaggedUnderReview: false,
  },
  {
    id: "3468901",
    cardId: "C13487-K2",
    cardName: "Everyday Rewards Credit",
    cardLast4: "8820",
    amountUsd: 128.5,
    date: "Nov 20, 2016",
    time: "19:45",
    merchant: "Nordstrom Downtown",
    category: "Retail & Apparel",
    channel: "in_person",
    status: "completed",
    location: "Seattle, WA",
    description: "Point of sale transaction with PIN",
    isFlaggedUnderReview: false,
  },
  {
    id: "3465120",
    cardId: "C13487-K1",
    cardName: "Primary Sapphire Debit",
    cardLast4: "4417",
    amountUsd: 14.99,
    date: "Nov 19, 2016",
    time: "08:15",
    merchant: "Spotify Premium",
    category: "Subscriptions",
    channel: "online",
    status: "completed",
    location: "Online",
    description: "Monthly recurring service payment",
    isFlaggedUnderReview: false,
  },
  {
    id: "3459800",
    cardId: "C13487-K3",
    cardName: "Digital Virtual Card",
    cardLast4: "1904",
    amountUsd: 312.0,
    date: "Nov 18, 2016",
    time: "12:04",
    merchant: "Delta Air Lines",
    category: "Travel & Transport",
    channel: "online",
    status: "completed",
    location: "Online",
    description: "Airline ticket booking confirmation",
    isFlaggedUnderReview: false,
  },
  {
    id: "3454210",
    cardId: "C13487-K2",
    cardName: "Everyday Rewards Credit",
    cardLast4: "8820",
    amountUsd: 45.8,
    date: "Nov 16, 2016",
    time: "21:10",
    merchant: "Uber Technologies",
    category: "Travel & Transport",
    channel: "online",
    status: "completed",
    location: "Seattle, WA",
    description: "Rideshare trip fare",
    isFlaggedUnderReview: false,
  },
  {
    id: "3449115",
    cardId: "C13487-K1",
    cardName: "Primary Sapphire Debit",
    cardLast4: "4417",
    amountUsd: 89.9,
    date: "Nov 14, 2016",
    time: "11:22",
    merchant: "Amazon Marketplace",
    category: "Shopping & Goods",
    channel: "online",
    status: "completed",
    location: "Online",
    description: "E-commerce order shipment",
    isFlaggedUnderReview: false,
  },
];

export const INITIAL_SECURITY_SESSIONS: SecuritySession[] = [
  {
    id: "sess-1",
    deviceName: "MacBook Pro 16\" (Safari)",
    deviceType: "laptop",
    ipAddress: "198.51.100.42",
    location: "Seattle, WA, United States",
    lastActive: "Active now",
    isCurrent: true,
  },
  {
    id: "sess-2",
    deviceName: "iPhone 15 Pro (App)",
    deviceType: "phone",
    ipAddress: "198.51.100.42",
    location: "Seattle, WA, United States",
    lastActive: "2 hours ago",
    isCurrent: false,
  },
  {
    id: "sess-3",
    deviceName: "Galaxy Tab S8 (Chrome)",
    deviceType: "tablet",
    ipAddress: "203.0.113.19",
    location: "Portland, OR, United States",
    lastActive: "Yesterday at 18:40",
    isCurrent: false,
  },
];

export const INITIAL_CUSTOMER_NOTIFICATIONS: CustomerNotification[] = [
  {
    id: "notif-1",
    category: "investigation",
    title: "Transaction review in progress",
    message: "A recent online transaction of $4,850.00 on card •4417 is currently being reviewed for your protection.",
    timestamp: "10 minutes ago",
    isRead: false,
    actionLabel: "View Review",
    actionTab: "overview",
  },
  {
    id: "notif-2",
    category: "security",
    title: "Unrecognized device signed in",
    message: "A sign-in was attempted from a new Android device (SM-G935F). Please review your known devices.",
    timestamp: "Nov 22, 2016",
    isRead: false,
    actionLabel: "Review Devices",
    actionTab: "devices",
  },
  {
    id: "notif-3",
    category: "transaction",
    title: "Transaction completed",
    message: "$64.20 was charged at Whole Foods Market on card •4417.",
    timestamp: "Nov 21, 2016",
    isRead: true,
    actionLabel: "View Transactions",
    actionTab: "transactions",
  },
  {
    id: "notif-4",
    category: "account",
    title: "Monthly account statement available",
    message: "Your November e-statement is ready to view and download.",
    timestamp: "Nov 15, 2016",
    isRead: true,
    actionLabel: "View Statements",
    actionTab: "account",
  },
];

export const INITIAL_CUSTOMER_PREFERENCES: CustomerPreferences = {
  emailAlerts: true,
  smsAlerts: true,
  pushAlerts: true,
  alertOnAllTransactions: false,
  transactionAlertThresholdUsd: 100,
  securityAlerts: true,
  investigationUpdates: true,
  monthlyStatementsEmail: true,
};

export const INITIAL_SUPPORT_TICKETS: CustomerSupportTicket[] = [
  {
    id: "TKT-84920",
    txnId: "3478561",
    subject: "Inquiry regarding online transaction 3478561",
    reason: "Transaction verification inquiry",
    message: "I received a notification about an online purchase on my debit card and wanted to check the review progress.",
    status: "under_review",
    createdAt: "Nov 22, 2016 20:25",
    estimatedResponse: "Within 2 hours",
  },
];

export const INITIAL_ACTIVITY_LOG: CustomerActivityItem[] = [
  {
    id: "act-1",
    action: "Signed in",
    detail: "Verified session opened on MacBook Pro (Current device)",
    timestamp: "Today at 20:10",
    iconType: "security",
  },
  {
    id: "act-2",
    action: "Transaction flagged for review",
    detail: "$4,850.00 online order at Apex Global Electronics placed under standard security review",
    timestamp: "Nov 22, 2016 at 20:11",
    iconType: "transaction",
  },
  {
    id: "act-3",
    action: "New device detected",
    detail: "Android Phone SM-G935F attempted sign-in from an unknown network",
    timestamp: "Nov 22, 2016 at 20:09",
    iconType: "device",
  },
  {
    id: "act-4",
    action: "Security setting verified",
    detail: "Two-step verification status checked and active",
    timestamp: "Nov 20, 2016 at 10:14",
    iconType: "security",
  },
  {
    id: "act-5",
    action: "Profile contact verified",
    detail: "Email and phone contact methods confirmed",
    timestamp: "Nov 18, 2016 at 15:30",
    iconType: "profile",
  },
];

export const FAQ_TOPICS = [
  {
    id: "faq-1",
    question: "What should I do if I see an unfamiliar transaction?",
    answer:
      "If you notice a transaction you do not recognize, click 'Report an unfamiliar transaction' below or select the specific transaction from your Transactions list. You can also temporarily lock the affected card immediately in the 'My Cards' section.",
  },
  {
    id: "faq-2",
    question: "How does the transaction review process work?",
    answer:
      "When an unusual transaction occurs, our automated security system places it in review. We will notify you via in-app message, SMS, or email asking you to confirm whether you authorized it. Your card stays active for legitimate purchases unless a block is requested.",
  },
  {
    id: "faq-3",
    question: "How do I temporarily lock or unlock my card?",
    answer:
      "Go to 'My Cards', select the card you wish to control, and toggle the 'Lock card' switch. Locking your card immediately stops all new in-person and online purchases while allowing recurring subscriptions.",
  },
  {
    id: "faq-4",
    question: "How do I manage my trusted devices?",
    answer:
      "Visit 'My Devices' to see every device linked to your account. You can mark trusted personal devices or remove/sign out any unfamiliar device with one click.",
  },
  {
    id: "faq-5",
    question: "Will I be charged for fraudulent transactions?",
    answer:
      "No. With Zero Liability protection, you are not held responsible for confirmed unauthorized charges when reported promptly.",
  },
];

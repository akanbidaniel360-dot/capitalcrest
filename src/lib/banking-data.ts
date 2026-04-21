// Realistic banking reference data used across transfer, bills, loans, cards.

export const LOCAL_BANKS = [
  "Access Bank", "GTBank", "Zenith Bank", "First Bank", "UBA",
  "Stanbic IBTC", "Fidelity Bank", "Union Bank", "Wema Bank", "Sterling Bank",
  "Chase", "Bank of America", "Wells Fargo", "Citibank", "Capital One",
  "Barclays", "HSBC", "Lloyds", "NatWest", "Santander",
];

export const TRANSFER_PURPOSES = [
  "Family Support", "Salary / Payroll", "Business Payment", "Loan Repayment",
  "Rent / Utilities", "Education / Tuition", "Medical Expenses",
  "Investment", "Gift", "Refund", "Other",
];

export const COUNTRIES_INTL = [
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "GH", name: "Ghana", currency: "GHS" },
];

export const BILL_CATEGORIES = [
  {
    value: "airtime",
    label: "Airtime / Mobile Top-Up",
    accountLabel: "Phone Number",
    accountPlaceholder: "+1 555 123 4567",
    providers: ["MTN", "Airtel", "Glo", "9mobile", "Vodafone", "AT&T", "Verizon", "T-Mobile"],
    presets: [5, 10, 20, 50, 100],
  },
  {
    value: "data",
    label: "Mobile Data",
    accountLabel: "Phone Number",
    accountPlaceholder: "+1 555 123 4567",
    providers: ["MTN Data", "Airtel Data", "Glo Data", "9mobile Data", "Verizon Data"],
    presets: [10, 25, 50, 100],
  },
  {
    value: "electricity",
    label: "Electricity",
    accountLabel: "Meter Number",
    accountPlaceholder: "12345678901",
    providers: ["IKEDC", "EKEDC", "AEDC", "PHED", "EEDC", "Con Edison", "PG&E", "National Grid"],
    presets: [20, 50, 100, 200, 500],
  },
  {
    value: "internet",
    label: "Internet / Broadband",
    accountLabel: "Account / Customer ID",
    accountPlaceholder: "ACCT-000123",
    providers: ["Spectranet", "Smile", "Swift", "Comcast Xfinity", "Verizon Fios", "AT&T Internet", "BT", "Sky Broadband"],
    presets: [30, 50, 80, 120],
  },
  {
    value: "tv",
    label: "Cable / Satellite TV",
    accountLabel: "Smartcard / Subscriber ID",
    accountPlaceholder: "1234567890",
    providers: ["DSTV", "GOTV", "Startimes", "Netflix", "Showmax", "Sky", "Xfinity TV"],
    presets: [15, 30, 50, 80],
  },
  {
    value: "water",
    label: "Water Utilities",
    accountLabel: "Account Number",
    accountPlaceholder: "WAT-000123",
    providers: ["Lagos Water Corp", "Thames Water", "American Water", "Veolia"],
    presets: [25, 50, 100],
  },
  {
    value: "education",
    label: "School Fees",
    accountLabel: "Student / Reference ID",
    accountPlaceholder: "STU-000123",
    providers: ["Direct to school", "WAEC", "JAMB", "NECO", "University Portal"],
    presets: [100, 250, 500, 1000],
  },
  {
    value: "tax",
    label: "Government / Tax",
    accountLabel: "Tax / Reference ID",
    accountPlaceholder: "TAX-000123",
    providers: ["IRS", "HMRC", "FIRS", "State Revenue"],
    presets: [50, 100, 250, 500],
  },
] as const;

export const BILL_FEE_RATE = 0.005; // 0.5% convenience fee, capped at 2.50

export const calcBillFee = (amount: number) =>
  Math.min(2.5, Math.round(amount * BILL_FEE_RATE * 100) / 100);

export const LOAN_PURPOSES = [
  "Home Improvement", "Debt Consolidation", "Medical Expenses",
  "Education", "Business / Startup", "Vehicle Purchase",
  "Wedding", "Vacation / Travel", "Emergency", "Other",
];

export const EMPLOYMENT_STATUS = [
  "Full-time Employed", "Part-time Employed", "Self-employed",
  "Business Owner", "Contractor / Freelancer", "Retired",
  "Student", "Unemployed",
];

export const MARITAL_STATUS = ["Single", "Married", "Divorced", "Widowed", "Separated"];

export const HOUSING_STATUS = ["Own (mortgage)", "Own (outright)", "Rent", "Living with family", "Other"];

export const CARD_TIERS = [
  {
    value: "standard",
    label: "Standard Debit",
    annualFee: 0,
    spendingLimit: 5000,
    benefits: ["Online & POS payments", "Free SMS alerts", "Standard support"],
    color: "from-slate-700 to-slate-900",
  },
  {
    value: "gold",
    label: "Gold Debit",
    annualFee: 50,
    spendingLimit: 25000,
    benefits: ["Higher daily limits", "Travel insurance", "Priority support", "Cashback on dining"],
    color: "from-amber-500 to-yellow-700",
  },
  {
    value: "platinum",
    label: "Platinum Debit",
    annualFee: 150,
    spendingLimit: 100000,
    benefits: ["Unlimited spending", "Airport lounge access", "Concierge service", "Premium cashback"],
    color: "from-zinc-700 via-zinc-500 to-zinc-800",
  },
] as const;

export const CARD_TYPES = [
  { value: "virtual", label: "Virtual Card", description: "Instant issuance for online use" },
  { value: "physical", label: "Physical Card", description: "Mailed to your address (3–7 days)" },
] as const;

export const ID_TYPES = [
  "National ID", "Passport", "Driver's License", "Voter's Card", "SSN",
];

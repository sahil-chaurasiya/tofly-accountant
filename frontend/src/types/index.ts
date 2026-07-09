export interface PauseInterval {
  pausedAt: string;
  resumedAt: string | null;
}

export interface ContractValueOverride {
  year: number;
  month: number;
  value: number;
}

export interface Client {
  _id: string;
  name: string;
  startDate: string;
  contractValue: number;
  notes: string;
  accountManager: string;
  workStatus: 'On Time' | 'Delayed' | '';
  paymentStatus: 'Pending' | 'Partially Paid' | 'Paid' | '';
  isActive: boolean;
  pauseHistory: PauseInterval[];
  // Set once a client's contract is ended — they stop being tracked/billed
  // for any month after the one this date falls in.
  endDate?: string | null;
  // One-off monthly contract value overrides — only the listed (year, month)
  // is affected.
  contractValueOverrides?: ContractValueOverride[];
  // The amount actually owed for the currently-selected month (accounts for
  // any override for that month). Use this instead of `contractValue` for
  // anything tied to a specific month.
  monthContractValue?: number;
  receivedAmount: number;
  pendingAmount: number;
  totalDue: number;
  dueDate?: string | null;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'NotStarted' | 'Upcoming' | 'Paused' | 'Completed';
  payments?: Payment[];
  monthLedger?: MonthLedgerEntry[];
  createdAt: string;
}

export interface MonthLedgerEntry {
  month: number;
  year: number;
  contractValue: number;
  totalPaid: number;
  remaining: number;
  status: 'Unpaid' | 'Partial' | 'Paid' | 'Upcoming' | 'Paused';
  dueDate: string;
  billable: boolean;
  payments: Payment[];
}

export interface Payment {
  _id: string;
  clientId?: string | { _id: string; name: string; contractValue: number } | null;
  isOneTime?: boolean;
  customClientName?: string;
  customClientPhone?: string;
  purpose?: string;
  totalAmount?: number;
  amount: number;
  paymentDate: string;
  month?: number;
  year?: number;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'UPI' | 'Cheque' | 'Online';
  remarks: string;
  createdAt: string;
}

export interface Employee {
  _id: string;
  name: string;
  joiningDate: string;
  monthlySalary: number;
  isActive: boolean;
  salaryHistory?: { amount: number; effectiveFrom: string }[];
}

export interface SalaryPayment {
  _id: string;
  employeeId: string | Employee;
  month: number;
  year: number;
  amountPaid: number;
  paidDate?: string;
  status: 'Paid' | 'Pending';
}

export interface Expense {
  _id: string;
  title: string;
  category: 'Rent' | 'Internet' | 'Electricity' | 'Software' | 'Marketing' | 'Travel' | 'Miscellaneous';
  amount: number;
  expenseDate: string;
  remarks: string;
}

export interface Loan {
  _id: string;
  name: string;
  originalAmount: number;
  monthlyEMI: number;
  remainingAmount: number;
  startDate: string;
  status: 'Active' | 'Closed';
  payments?: EMIPayment[];
}

export interface EMIPayment {
  _id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  remarks: string;
}

export interface MonthlyAccounting {
  _id?: string;
  month: number;
  year: number;
  openingBalance: number;
  reservedAmount: number;
  monthlyIncome: number;
  salaryExpenses: number;
  officeExpenses: number;
  emiExpenses: number;
  totalExpenses: number;
  closingBalance: number;
  notes?: string;
}

export interface DashboardData {
  month: number;
  year: number;
  cards: {
    totalContractValue: number;
    totalCollected: number;
    totalPending: number;
    currentMonthRevenue: number;
    currentMonthExpenses: number;
    salaryExpense: number;
    emiExpense: number;
    netProfit: number;
  };
  topPendingClients: Array<{ _id: string; name: string; pendingAmount: number }>;
  revenueTrend: Array<{ month: string; income: number; expense: number; profit: number }>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface Service {
  _id: string;
  name: string;
  description: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}
export interface CompanySettings {
  _id?: string;
  companyName: string;
  address: string;
  tagline: string;
  phone1: string;
  phone2: string;
  accountHolder: string;
  accountType: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upi: string;
}
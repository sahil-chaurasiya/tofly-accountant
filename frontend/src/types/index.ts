export interface Client {
  _id: string;
  name: string;
  startDate: string;
  contractValue: number;
  notes: string;
  accountManager: string;
  workStatus: 'On Time' | 'Delayed' | '';
  paymentStatus: 'Pending' | 'Partially Paid' | 'Paid' | '';
  receivedAmount: number;
  pendingAmount: number;
  status: 'Pending' | 'Partial' | 'Paid';
  payments?: Payment[];
  createdAt: string;
}

export interface Payment {
  _id: string;
  clientId: string | { _id: string; name: string; contractValue: number };
  amount: number;
  paymentDate: string;
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
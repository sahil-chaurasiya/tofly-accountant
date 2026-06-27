require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Employee = require('../models/Employee');
const SalaryPayment = require('../models/SalaryPayment');
const Expense = require('../models/Expense');
const Loan = require('../models/Loan');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/revenue-pwa');
  console.log('Connected to MongoDB');

  // Admin
  await Admin.deleteMany({});
  await Admin.create({
    email: process.env.ADMIN_EMAIL || 'admin@agency.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    name: 'Agency Admin',
  });
  console.log('Admin created: admin@agency.com / Admin@123');

  // Clients
  await Client.deleteMany({});
  await Payment.deleteMany({});
  const clients = await Client.insertMany([
    { name: 'TechCorp Solutions', startDate: new Date('2024-01-15'), contractValue: 120000, notes: 'SEO + PPC campaign' },
    { name: 'Fashion Brand Co.', startDate: new Date('2024-02-01'), contractValue: 85000, notes: 'Social media management' },
    { name: 'HealthPlus Clinic', startDate: new Date('2024-03-10'), contractValue: 60000, notes: 'Google Ads + content' },
    { name: 'EduLearn Platform', startDate: new Date('2024-04-01'), contractValue: 45000, notes: 'Performance marketing' },
    { name: 'RealEstate Hub', startDate: new Date('2024-05-15'), contractValue: 95000, notes: 'Lead generation' },
  ]);

  // Payments for clients — now includes month + year fields
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();

  await Payment.insertMany([
    { clientId: clients[0]._id, amount: 40000, paymentDate: new Date('2024-01-20'), month: 1, year: 2024, paymentMethod: 'Bank Transfer', remarks: 'First installment' },
    { clientId: clients[0]._id, amount: 40000, paymentDate: new Date('2024-02-20'), month: 2, year: 2024, paymentMethod: 'Bank Transfer', remarks: 'Second installment' },
    { clientId: clients[1]._id, amount: 30000, paymentDate: new Date('2024-02-05'), month: 2, year: 2024, paymentMethod: 'UPI', remarks: 'Advance' },
    { clientId: clients[1]._id, amount: 55000, paymentDate: new Date('2024-03-05'), month: 3, year: 2024, paymentMethod: 'Bank Transfer', remarks: 'Final payment' },
    { clientId: clients[2]._id, amount: 20000, paymentDate: new Date('2024-03-15'), month: 3, year: 2024, paymentMethod: 'Cheque', remarks: 'Partial payment' },
    { clientId: clients[3]._id, amount: 45000, paymentDate: new Date('2024-04-05'), month: 4, year: 2024, paymentMethod: 'Bank Transfer', remarks: 'Full payment' },
    { clientId: clients[4]._id, amount: 30000, paymentDate: now, month: m, year: y, paymentMethod: 'Bank Transfer', remarks: 'Advance' },
    { clientId: clients[0]._id, amount: 20000, paymentDate: now, month: m, year: y, paymentMethod: 'UPI', remarks: 'Monthly retainer' },
  ]);

  // Employees
  await Employee.deleteMany({});
  await SalaryPayment.deleteMany({});
  const employees = await Employee.insertMany([
    { name: 'Priya Sharma', joiningDate: new Date('2023-06-01'), monthlySalary: 35000 },
    { name: 'Rahul Verma', joiningDate: new Date('2023-08-15'), monthlySalary: 28000 },
    { name: 'Anjali Singh', joiningDate: new Date('2024-01-10'), monthlySalary: 22000 },
  ]);

  await SalaryPayment.insertMany([
    { employeeId: employees[0]._id, month: m, year: y, amountPaid: 35000, paidDate: new Date(), status: 'Paid' },
    { employeeId: employees[1]._id, month: m, year: y, amountPaid: 28000, paidDate: new Date(), status: 'Paid' },
    { employeeId: employees[2]._id, month: m, year: y, amountPaid: 0, status: 'Pending' },
  ]);

  // Expenses
  await Expense.deleteMany({});
  await Expense.insertMany([
    { title: 'Office Rent', category: 'Rent', amount: 25000, expenseDate: now, remarks: 'Monthly rent' },
    { title: 'Internet', category: 'Internet', amount: 3500, expenseDate: now, remarks: 'Business fiber' },
    { title: 'Adobe Suite', category: 'Software', amount: 5000, expenseDate: now, remarks: 'Annual license' },
    { title: 'Facebook Ads', category: 'Marketing', amount: 15000, expenseDate: now, remarks: 'Agency promotion' },
  ]);

  // Loans
  await Loan.deleteMany({});
  await Loan.insertMany([
    { name: 'Office Equipment Loan', originalAmount: 200000, monthlyEMI: 10000, remainingAmount: 140000, startDate: new Date('2023-07-01'), status: 'Active' },
    { name: 'Business Expansion Loan', originalAmount: 500000, monthlyEMI: 20000, remainingAmount: 320000, startDate: new Date('2024-01-01'), status: 'Active' },
  ]);

  console.log('Seed completed!');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
# 💰 Tofly Accountant PWA

A production-ready Revenue Management Progressive Web App for digital marketing agency founders.

## 🎯 Features

| Module | Features |
|--------|----------|
| **Dashboard** | KPI cards, revenue trends, expense trends, profit charts, pending clients |
| **Clients** | Add/edit/delete, search & filter by status, payment history, progress tracking |
| **Collections** | Record payments, payment history, auto status calculation |
| **Salaries** | Employee register, monthly salary summary, one-click mark paid |
| **Expenses** | Category-wise tracking, pie chart, monthly summaries |
| **EMI Tracker** | Loan management, EMI payments, auto remaining balance |
| **Accounting** | Monthly P&L, opening/closing balance, historical records |
| **Reports** | Revenue, expense, profit & collection reports with CSV export |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Option 1: Local Development

```bash
# 1. Install dependencies
npm run install:all

# 2. Setup backend environment
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and settings

# 3. Seed the database (creates admin + sample data)
npm run seed

# 4. Start backend (new terminal)
cd backend && npm run dev

# 5. Start frontend (new terminal)
cd frontend && npm run dev
```

Visit: http://localhost:5173

### Option 2: Docker (Recommended for Production)

```bash
docker-compose up -d
```

Visit: http://localhost

### Default Credentials
- **Email:** admin@agency.com
- **Password:** Admin@123

## 🗂️ Project Structure

```
revenue-pwa/
├── backend/
│   ├── src/
│   │   ├── config/         # Database connection
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # JWT auth middleware
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routes
│   │   └── utils/          # Seed script
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout components
│   │   ├── lib/            # Auth context, utils
│   │   ├── pages/          # All page components
│   │   ├── services/       # Axios API layer
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml
```

## 🔧 Tech Stack

**Frontend:** React 18 + TypeScript + Vite + TailwindCSS + TanStack Query + Recharts + PWA

**Backend:** Node.js + Express.js + MongoDB + Mongoose + JWT

## 📱 PWA Features

- ✅ Installable on iOS, Android, Desktop
- ✅ Offline capable with service worker
- ✅ Mobile-first responsive design
- ✅ App manifest configured

## 🔑 Environment Variables

```env
# backend/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/revenue-pwa
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@agency.com
ADMIN_PASSWORD=Admin@123
NODE_ENV=development
```

## 📊 Data Models

- **Client** → name, startDate, contractValue, notes
- **Payment** → clientId, amount, paymentDate, paymentMethod, remarks
- **Employee** → name, joiningDate, monthlySalary
- **SalaryPayment** → employeeId, month, year, amountPaid, status
- **Expense** → title, category, amount, expenseDate
- **Loan** → name, originalAmount, monthlyEMI, remainingAmount, status
- **EMIPayment** → loanId, amount, paymentDate
- **MonthlyAccounting** → month, year, openingBalance, reservedAmount

## 🚢 Production Deployment

1. Update `JWT_SECRET` to a strong random string
2. Update `ADMIN_PASSWORD` to a secure password
3. Use MongoDB Atlas for managed database
4. Run `docker-compose up -d` on your server

---


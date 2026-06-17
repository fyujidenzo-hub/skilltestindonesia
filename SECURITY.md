# Tokopedia Kari Indonesia - Order Ops Dashboard

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/Necko0204/tokopediakaririndonesia.git
cd tokopediakaririndonesia
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables (IMPORTANT - SECURITY)
```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and add your actual API keys:
- Firebase credentials
- Resend API key

**⚠️ NEVER commit `.env` or `.env.local` to git. They are in `.gitignore` for a reason.**

### 4. Run development server
```bash
npm run dev
```

## Security Notes

- **Never** add `.env` files to git
- **Never** expose API keys in commits
- Always use environment variables for secrets
- Rotate API keys if accidentally exposed
- Use `.env.local` for local development only
- Use CI/CD secrets for production deployment

## Features

- ✅ React 19 + TypeScript
- ✅ Firestore for data persistence
- ✅ OTP email verification with Resend
- ✅ Multi-role dashboard (Admin, Customer)
- ✅ Product catalog management
- ✅ Member registration & authentication
- ✅ Transaction & order management

## Project Structure

```
src/
  pages/        - Page components (Admin, Customer, Register)
  components/   - Reusable UI components
  services/     - Firestore collection services
  store/        - React Context + Reducer state management
  types.ts      - TypeScript type definitions
  firebase.ts   - Firebase initialization
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

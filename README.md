# payonbase24 💰

> Instant USDC Payment Links on Base Network

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?logo=react)](https://reactjs.org/)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite)](https://vitejs.dev/)
[![Network](https://img.shields.io/badge/Network-Base-0052FF?logo=ethereum)](https://base.org/)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://vercel.com/)

---

## 📖 About

**payonbase24** is a simple and secure platform for creating instant USDC payment links on the **Base Network**.

- 🔗 Create payment links in seconds
- 💳 Payers don't need an account — just connect wallet & pay
- 🔒 Fully secure with wallet signing & RLS policies
- 🌙 Dark/Light mode support
- 📱 QR Code for mobile payments

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Sign up / Login with Supabase |
| 📝 **Create Links** | Generate unique payment links with amount & recipient |
| 📊 **Dashboard** | Manage all your payment links with QR codes |
| 💳 **Payments** | Connect wallet, sign, and pay USDC instantly |
| 🔒 **Security** | Wallet signing with 1-hour validity, RLS policies |
| ⚙️ **Settings** | Update profile name & security settings |
| 🌙 **Theme** | Light / Dark mode with persistent storage |
| 📱 **QR Code** | Scan with phone for easy payments |

---

## 🛠️ Tech Stack

### Frontend
- ⚛️ **React 18** — UI Framework
- ⚡ **Vite** — Build Tool
- 🎨 **Tailwind CSS** — Styling
- 🔀 **React Router** — Navigation
- 🟣 **Ethers.js** — Blockchain Interaction

### Backend
- 🗄️ **Supabase** — Authentication & Database
- 🔐 **RLS** — Row Level Security Policies
- 📦 **PostgreSQL** — Database

### Blockchain
- ⛓️ **Base Network** — Layer 2 Ethereum
- 💵 **USDC** — Payment Token

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- MetaMask or Web3 wallet

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/payonbase24.git
cd payonbase24

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Fill in your Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev

```
 Environment Variables
Create a .env file in the root directory:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

```
###  Database Schema
```

CREATE TABLE payment (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE,
  recipient text,
  amount numeric,
  created_at timestamptz DEFAULT now(),
  paid boolean DEFAULT false,
  tx_hash text,
  user_id uuid REFERENCES auth.users,
  payer_address text,
  is_active boolean DEFAULT true,
  expires_at timestamptz
);

-- Indexes
CREATE INDEX idx_payment_slug ON payment(slug);
CREATE INDEX idx_payment_user_id ON payment(user_id);
CREATE INDEX idx_payment_created_at ON payment(created_at DESC);


### Wallet Signatures Table

CREATE TABLE wallet_signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL,
  signature text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour'),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_wallet_signatures_address ON wallet_signatures(wallet_address);
CREATE INDEX idx_wallet_signatures_expires ON wallet_signatures(expires_at);
```
### RLS Policies
```
-- Payment RLS
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own payments" ON payment
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "create own payments" ON payment
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete own payments" ON payment
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "update payment status" ON payment
  FOR UPDATE TO authenticated, anon
  USING (paid = false)
  WITH CHECK (paid = true AND tx_hash IS NOT NULL);

CREATE POLICY "public read payment page" ON payment
  FOR SELECT TO anon USING (true);

-- Wallet Signatures RLS
ALTER TABLE wallet_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert their own signatures" ON wallet_signatures
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can view their own signatures" ON wallet_signatures
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "anon can insert signatures" ON wallet_signatures
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can view their own signatures" ON wallet_signatures
  FOR SELECT TO anon USING (true);

  ```

  ### 🔒 Security
  ```
Implemented Security Features
RLS Policies — Data isolation between users

Wallet Signing — 1-hour validity for verified sessions

Rate Limiting — Prevent spam (10 links per day)

Input Validation — Wallet address format validation

Supabase Auth — Secure authentication

Security Flow
User connects wallet

User signs a verification message (valid for 1 hour)

Signature stored in database

User can pay while signature is valid

After 1 hour, re-sign required

```

### 🚢 Deployment
```

Deploy on Vercel
Push code to GitHub

Import repository in Vercel

Add environment variables

Deploy

###   Environment Variables (Vercel)
   Name	                          Value
VITE_SUPABASE_URL         	Your Supabase URL
VITE_SUPABASE_ANON_KEY     	Your Supabase Anon Key

```

### 🤝 Contributing
Contributions are welcome! Here's how:

1-Fork the repository

2-Create your feature branch:
git checkout -b feature/amazing-feature

3-Commit your changes:
git commit -m 'Add amazing feature'

4-Push to the branch:
git push origin feature/amazing-feature

5-Open a Pull Request
------------------------

### Guidelines
Follow the existing code style

Write clear commit messages

Test your changes

Update documentation as needed


-------
### 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.
```
MIT License

Copyright (c) 2024 payonbase24

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
🙏 Acknowledgments
Base Network — Ethereum L2 blockchain

Supabase — Backend as a Service

Vercel — Hosting platform

Tailwind CSS — Utility-first CSS framework

Ethers.js — Ethereum library

React — UI framework

--------
###  📬 Contact
Project Links
GitHub: https://github.com/majidpm/payonbase

Social Media
Twitter/X: @pmnmajid
Email: majid.pmn1@gmail.com

------
⭐ Show Your Support
If you found this project helpful, please consider:

Starring the repository ⭐

Sharing with others 📤

Contributing to the project 🤝

-----

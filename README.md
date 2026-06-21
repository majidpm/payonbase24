# PayOnBase 💰

> Instant USDC Payment Links on Base Network

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?logo=react)](https://reactjs.org/)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite)](https://vitejs.dev/)
[![Network](https://img.shields.io/badge/Network-Base-0052FF?logo=ethereum)](https://base.org/)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel)](https://vercel.com/)

---

## 📖 About

**PayOnBase** is a simple and secure platform for creating instant USDC payment links on the **Base Network**. 

Whether you're a freelancer, business owner, or just someone who needs to receive payments quickly, PayOnBase makes it easy:

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
| 🛡️ **Anti-spam** | Rate limiting to prevent abuse |

---
## 🛠️ Tech Stack

### Frontend
| Technology | Description |
|------------|-------------|
| ⚛️ **React 18** | UI Framework |
| ⚡ **Vite** | Build Tool |
| 🎨 **Tailwind CSS** | Styling |
| 🔀 **React Router** | Navigation |
| 🟣 **Ethers.js** | Blockchain Interaction |
| 📦 **React QR Code** | QR Code generation |

### Backend
| Technology | Description |
|------------|-------------|
| 🗄️ **Supabase** | Authentication & Database |
| 🔐 **RLS** | Row Level Security Policies |
| 📦 **PostgreSQL** | Database |

### Blockchain
| Technology | Description |
|------------|-------------|
| ⛓️ **Base Network** | Layer 2 Ethereum |
| 💵 **USDC** | Payment Token |


###🚀 Quick Start

Prerequisites
Node.js (v18 or higher)

npm or yarn
Supabase account
MetaMask or Web3 wallet

###Installation
```bash
# Clone the repository
git clone https://github.com/majidpm/payonbase24.git
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

### Environment Variables
Create a .env file in the root directory:

.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key


### Available Scripts
```
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

```

🗄️ Database Schema
```
Payment Table
sql
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
```
Wallet Signatures Table
```
sql
CREATE TABLE wallet_signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL,
  signature text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour'),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);
```
### 🔒 Security
RLS Policies for data isolation

Wallet Signing with 1-hour validity

Rate Limiting to prevent spam

Input Validation for wallet addresses

Supabase Auth for secure authentication

### 🚢 Deployment
Deploy on Vercel
Push code to GitHub

Import repository in Vercel

Add environment variables

Deploy

Environment Variables (Vercel)
Name	                            Value
VITE_SUPABASE_URL         	   Your Supabase URL
VITE_SUPABASE_ANON_KEY	      Your Supabase Anon Key

----------------
🤝 Contributing
Fork the repository

Create your feature branch (git checkout -b feature/amazing)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing)

Open a Pull Request

### 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

```
MIT License

Copyright (c) 2024 PayOnBase24

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
------------
📬 Contact
Project Links
GitHub: https://github.com/majidpm/payonbase24

Live demo :

**🔗 [Visit PayOnBase24](https://payonbase24.vercel.app)**

Social Media
Email: majid.pmn1@gmail.com

GitHub: @majidpm

Issues & Support
Report Issue: GitHub Issues
--------
## 💰 Donate

If you find this project useful, you can support it by sending USDC on Base Network:

| Network | Token | Address |
|---------|-------|---------|
| **Base** | USDC | `0x4D0ce11bafE6fCBD4506A24B52D2b63b688C8332` |

> ⚠️ Make sure you're on **Base Network**. Sending to the wrong network may result in loss of funds.

**Other ways to support:**
- ⭐ Star this repo
- 📤 Share with others
- 🐛 Report issues

---

Made with ❤️ on Base Network



# SANCTUM — Curated Private Stays

A complete, production-ready luxury property booking platform built with React + Vite.

## Pages & Features

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Hero, featured properties, philosophy |
| **Properties** | `/properties` | Full listing with search & filters |
| **Property Detail** | `/property/:id` | Full property page with booking widget |
| **Payment** | `/payment` | Multi-step payment + booking confirmation |
| **Login** | `/login` | Email / phone sign-in |
| **Sign Up** | `/signup` | Guest or Owner registration |
| **My Stays** | `/bookings` | Guest booking history |
| **Owner Portal** | `/owner` | Dashboard: properties, bookings, earnings |
| **Admin / Master** | `/admin` | Full platform control |
| **Submit Property** | `/list` | Multi-step property application |
| **About** | `/about` | Brand story and philosophy |

## Role logins (built-in)

These emails receive Admin / Owner roles automatically; use any password with the current auth helper.

| Email | Role |
|-------|------|
| `admin@sanctum.com` | Admin — master console |
| `owner@sanctum.com` | Owner — owner portal |
| Any other email | Guest |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open http://localhost:5173

## Deploy

### Vercel (recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Upload the `dist` folder to Netlify
```

### Any static host
```bash
npm run build
# Deploy the contents of the `dist/` folder
```

## Project Structure

```
sanctum/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx          # Entry point
    ├── App.jsx           # Router
    ├── context/
    │   └── AppContext.jsx # Global state (auth, bookings, toasts)
    ├── data/
    │   └── properties.js  # Property data
    ├── styles/
    │   └── global.css     # Design system / CSS variables
    ├── components/
    │   ├── Navbar.jsx + .module.css
    │   ├── Footer.jsx + .module.css
    │   └── PropertyCard.jsx + .module.css
    └── pages/
        ├── Home.jsx + .module.css
        ├── Properties.jsx + .module.css
        ├── PropertyDetail.jsx + .module.css
        ├── Payment.jsx + .module.css
        ├── Login.jsx (uses Auth.module.css)
        ├── Signup.jsx (uses Auth.module.css)
        ├── Owner.jsx + .module.css
        ├── Admin.jsx + .module.css
        ├── Bookings.jsx + .module.css
        ├── ListProperty.jsx + .module.css
        └── About.jsx + .module.css
```

## Connecting a Real Backend

The app uses React Context for state. To connect a real backend:

1. Replace `src/data/properties.js` with API calls
2. Replace login logic in `Login.jsx` with real auth (JWT / sessions)
3. Replace `addBooking` in `AppContext.jsx` with a POST to your API
4. Add Stripe or Razorpay to the Payment page (replace the mock)

## Design System

All colors, fonts, and spacing are defined as CSS variables in `src/styles/global.css`:

- **Font Serif**: Cormorant Garamond (headings, prices, brand)
- **Font Sans**: Jost (body, labels, UI)
- **Gold**: `#c9a96e` — primary accent
- **Dark**: `#0a0a0a` — background

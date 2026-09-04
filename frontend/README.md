# VALOR — Veteran Recovery Web Frontend

Trauma-informed, gamified veteran recovery & clinical companion web portal for **SAH (SIH 2026)**.

## Design System & Theme

Ported from `shishi-88/SAH_Veteran_Recovery`:
- **Canvas / Surfaces**: Warm Cream (`#FDF6EE`, `#FFFDF9`, `#FFFFFF`)
- **Primary Accent**: Warm Rust (`#D96B27`)
- **Secondary Pill Accent**: Peach (`#F7DFCC`, text `#8C4A1E`)
- **Typography & Labels**: Deep Espresso (`#1C1917`, `#786F68`), Oswald, Space Mono, and DM Sans
- **Surfaces**: Warm glass panels (`#FFFFFF`, border `#E8DCCE`, subtle warm drop shadows)

## Features

- **Veteran Views**: Today's Journey ('Three things, done at your own pace'), Physical & Mental Wellbeing tracking, Progress Journey, Weekly Check-in survey, Crisis Support.
- **Counselor Views**: Counselor Dashboard Overview, Veteran list & detail views, AI Attention Center, Task Management, Communication Hub, Task Engagement metrics.
- **Auth Flow**: Role-based authentication (Veteran vs. Counselor), Registration with service branch, 6-digit OTP verification.

## Getting Started

### Prerequisites
- Node.js 18+

### Setup & Run

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```
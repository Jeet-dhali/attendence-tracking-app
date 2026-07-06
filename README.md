<div align="center">

# 📚 Attendance Tracker

**A modern, beautifully designed attendance tracking application built with Astro**

[![Astro Badge](https://img.shields.io/badge/Astro-7.0.6-FF5D01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

- 🎯 **Dashboard** - Quick overview of your attendance at a glance
- ✅ **Mark Attendance** - Easy attendance marking with date navigation
- 📊 **Advanced Analytics** - Deep insights with heat maps, trends, and predictions
- 🎓 **Bunk Calculator** - Smart planning for your academic freedom
- 📅 **Calendar View** - Visual attendance calendar with color-coded days
- 💾 **Local Storage** - All data stored locally in your browser
- 🌙 **Dark Mode** - Beautiful dark theme by default
- 📱 **Responsive** - Works perfectly on desktop and mobile

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/attendance-tracker.git
cd attendance-tracker

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## 📁 Project Structure

```
attendance-tracker/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images and SVGs
│   ├── components/   # Reusable components
│   ├── layouts/      # Page layouts
│   ├── pages/        # Route pages
│   ├── scripts/      # Utility scripts
│   └── styles/       # Global styles
├── astro.config.mjs  # Astro configuration
├── package.json      # Dependencies
└── tsconfig.json     # TypeScript config
```

## 🎨 Design System

Built with a Vercel-inspired design system featuring:
- Clean, minimal aesthetics
- Smooth animations and transitions
- Accessible color contrasts
- Consistent spacing and typography

## 📱 Pages

- **Dashboard** (`/`) - Overview and quick actions
- **Mark Attendance** (`/mark`) - Daily attendance tracking
- **Analytics** (`/analytics`) - Advanced analytics and insights
- **Bunk Calculator** (`/bunk`) - Smart bunk planning
- **Setup** (`/setup`) - Initial configuration

## 🔧 Configuration

On first launch, you'll be guided through:
1. Adding your courses
2. Setting up your weekly timetable
3. Configuring attendance targets

## 💾 Data Storage

All data is stored locally in your browser's localStorage. No data is sent to any server.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

Built with ❤️ using [Astro](https://astro.build)

</div>

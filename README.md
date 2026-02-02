# Sabong App

A modern Sabong (Cockfighting) management and analytics dashboard built with React, TypeScript, and Vite.

## Features

- **Event Management**: Create and manage sabong events.
- **Match Management**: comprehensive match tracking and history.
- **Analytics**: Real-time analytics for user activity, commissions, and profits.
- **User Management**: Admin tools for managing platform users.

## tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **Backend/Service**: Supabase (Auth, Database)
- **Routing**: React Router 7

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your environment variables:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_OPENROUTER_API_KEY=your_openrouter_key
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

## Building for Production

To build the application for production:

```bash
npm run build
```

The output will be in the `dist` directory.

## License

[Add License Here]

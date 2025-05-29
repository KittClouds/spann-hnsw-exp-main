
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import App from './App'
import Index from './pages/Index'
import EntityBrowserPage from './pages/EntityBrowser'
import { Migration } from './pages/Migration'
import NotFound from './pages/NotFound'
import { Toaster } from "@/components/ui/sonner"
import './index.css'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: 'entities',
        element: <EntityBrowserPage />,
      },
      {
        path: 'migration',
        element: <Migration />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

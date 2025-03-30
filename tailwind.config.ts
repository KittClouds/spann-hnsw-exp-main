
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				galaxy: {
					'dark': '#1A1A1A',           // Charcoal black
					'dark-accent': '#222222',    // Slightly lighter charcoal
					'editor': '#262626',         // Editor background
					'purple': '#6E59A5',         // Darker purple
					'deep-purple': '#4A3B76',    // Even deeper purple for accents
					'light-purple': '#e5deff',   // Light purple for light mode
					'text': '#e0e0e0',           // Light text for dark mode
					'sidebar': '#171717',        // Darker sidebar
					'light': '#ffffff',          // Pure white for light mode
					'light-accent': '#f7f5ff',   // Very light purple tint for light mode
					'highlight': '#8A66CC',      // For highlights and active states
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					from: {
						opacity: '0'
					},
					to: {
						opacity: '1'
					}
				},
				'pulse-subtle': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' },
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'pulse-subtle': 'pulse-subtle 4s ease-in-out infinite',
			},
			boxShadow: {
				'cosmic': '0 4px 20px rgba(0, 0, 0, 0.25)',
				'cosmic-lg': '0 8px 30px rgba(0, 0, 0, 0.3)',
				'inner-glow': 'inset 0 1px 4px 0 rgba(255, 255, 255, 0.05)',
			},
			backgroundImage: {
				'cosmic-gradient': 'linear-gradient(180deg, #1A1A1A 0%, #222222 100%)',
				'cosmic-gradient-light': 'linear-gradient(180deg, #ffffff 0%, #f7f5ff 100%)',
				'purple-glow': 'radial-gradient(circle at center, rgba(110, 89, 165, 0.15) 0%, transparent 70%)',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;


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
					DEFAULT: 'hsl(var(--sidebar))',
					foreground: 'hsl(var(--sidebar-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				galaxy: {
					'dark': '#121212', // Darker charcoal
					'dark-accent': '#1e1e1e', // Slightly lighter charcoal
					'dark-purple': '#403E43', // Dark charcoal with slight purple
					'editor': '#171717', // Nearly black for editor
					'purple': '#6E4DA7', // Darker purple
					'deep-purple': '#4A3B76', // Even darker purple
					'highlight': '#8A62CC', // Highlighted purple
					'light-purple': '#e5deff',
					'text': '#e0e0e0',
					'light': '#ffffff',
					'light-accent': '#f8f6ff',
					'light-editor': '#f5f5f8', // Light editor background
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
				'pulse-glow': {
					'0%, 100%': {
						opacity: '0.6'
					},
					'50%': {
						opacity: '1'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'pulse-glow': 'pulse-glow 3s ease-in-out infinite'
			},
			boxShadow: {
				'cosmic': '0 4px 20px -2px rgba(0, 0, 0, 0.2)',
				'cosmic-dark': '0 4px 20px rgba(90, 60, 160, 0.1)',
				'cosmic-glow': '0 0 15px rgba(138, 98, 204, 0.3)',
				'inner-glow': 'inset 0 0 15px rgba(138, 98, 204, 0.1)'
			},
			backgroundImage: {
				'purple-glow': 'radial-gradient(circle, rgba(138, 98, 204, 0.15) 0%, rgba(138, 98, 204, 0) 70%)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;

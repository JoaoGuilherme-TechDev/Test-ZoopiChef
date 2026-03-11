import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
  		fontFamily: {
  			sans: [
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'sans-serif'
  			],
  			display: [
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'sans-serif'
  			]
  		},
  		fontWeight: {
  			light: '300',
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700'
  		},
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
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
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
  			neon: {
  				green: 'hsl(var(--neon-green))',
  				cyan: 'hsl(var(--neon-cyan))',
  				blue: 'hsl(var(--neon-blue))',
  				teal: 'hsl(var(--neon-teal))',
  				orange: 'hsl(var(--neon-orange))',
  				purple: 'hsl(var(--neon-purple))',
  				pink: 'hsl(var(--neon-pink))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
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
  			'slide-up': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'slide-in-left': {
  				from: {
  					opacity: '0',
  					transform: 'translateX(-20px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			'glow-pulse': {
  				'0%, 100%': {
  					opacity: '0.4',
  					boxShadow: '0 0 22px hsl(var(--primary) / 0.35)'
  				},
  				'50%': {
  					opacity: '1',
  					boxShadow: '0 0 45px hsl(var(--primary) / 0.6)'
  				}
  			},
  			'neon-line': {
  				'0%': {
  					transform: 'translateY(-100%)',
  					opacity: '0'
  				},
  				'50%': {
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'translateY(100%)',
  					opacity: '0'
  				}
  			},
  			'portal-open': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.9) translateX(-20px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1) translateX(0)'
  				}
  			},
  			'power-on': {
  				'0%': {
  					clipPath: 'inset(0 0 100% 0)'
  				},
  				'100%': {
  					clipPath: 'inset(0 0 0 0)'
  				}
  			},
  			'float': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-4px)'
  				}
  			},
  			'icon-glow': {
  				'0%, 100%': {
  					filter: 'drop-shadow(0 0 2px hsl(var(--primary) / 0.45))'
  				},
  				'50%': {
  					filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.85))'
  				}
  			},
  			'slide-neon': {
  				'0%': {
  					left: '-100%',
  					opacity: '0'
  				},
  				'50%': {
  					opacity: '1'
  				},
  				'100%': {
  					left: '100%',
  					opacity: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.5s ease-out',
  			'slide-up': 'slide-up 0.5s ease-out',
  			'slide-in-left': 'slide-in-left 0.3s ease-out',
  			'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
  			'neon-line': 'neon-line 3s ease-in-out infinite',
  			'portal-open': 'portal-open 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'power-on': 'power-on 0.8s ease-out',
  			'float': 'float 3s ease-in-out infinite',
  			'icon-glow': 'icon-glow 2s ease-in-out infinite',
  			'slide-neon': 'slide-neon 2s ease-in-out infinite'
  		}
  	}
  },
  plugins: [tailwindcssAnimate, require("tailwindcss-animate")],
} satisfies Config;

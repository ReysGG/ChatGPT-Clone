---
name: Quiet Luxury AI
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#43474d'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#73777e'
  outline-variant: '#c3c7ce'
  surface-tint: '#436181'
  primary: '#224260'
  on-primary: '#ffffff'
  primary-container: '#3b5979'
  on-primary-container: '#b1cff5'
  inverse-primary: '#abc9ee'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e4e2e1'
  on-secondary-container: '#656464'
  tertiary: '#3e403f'
  on-tertiary: '#ffffff'
  tertiary-container: '#555757'
  on-tertiary-container: '#cccdcc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#abc9ee'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#2a4968'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c7c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style

This design system is built on the principle of "Quiet Luxury"—an aesthetic that prioritizes high-end craft, intentional restraint, and a rejection of typical AI tropes. Instead of glowing gradients and robotic metaphors, the system draws inspiration from premium editorial design and high-end lifestyle brands. 

The target audience is the discerning professional who seeks a tool that feels like a calm, organized workspace. The emotional response should be one of clarity and composure. The style is a blend of **Minimalism** and **Modern Corporate**, utilizing expansive white space, precise typography, and a tactile sense of quality through subtle borders rather than aggressive shadows.

## Colors

The palette is anchored in a warm, stone-based neutral foundation to avoid the sterile coldness of pure white. 

- **Background**: Use the warm off-white (#F9F9F8) for the main application canvas to reduce eye strain.
- **Surfaces**: Primary interactive cards and containers use pure White (#FFFFFF).
- **Text**: Primary content uses Soft Charcoal (#2D2D2D) for high readability with less harshness than pure black. Secondary metadata and labels use Muted Grey (#6B6B6B).
- **Accents**: Elegant Slate (#3B5979) is reserved for meaningful actions, active states, and subtle focus indicators. It should be used sparingly to maintain the "quiet" nature of the interface.

## Typography

The typography system relies on **Inter** for its systematic clarity and neutral, professional tone. 

- **Headings**: Use tight letter-spacing (tracking) for large displays to feel "locked-in" and editorial. For smaller sub-heads, use slightly more generous tracking to improve scannability.
- **Body Text**: Line heights are intentionally set wider than the standard (1.6x) to create a relaxed reading experience, essential for long-form AI chat responses.
- **Hierarchy**: Distinction is made through weight and color (Charcoal vs. Muted Grey) rather than excessive size variations.

## Layout & Spacing

This design system employs a **Fluid Grid** with fixed maximum constraints to ensure the editorial feel isn't lost on ultra-wide monitors.

- **Grid**: A 12-column grid is used for desktop layouts, transitioning to a 4-column grid for mobile.
- **Rhythm**: All spacing follows a 4px baseline, but the system favors "large" increments (24px, 48px) to reinforce the airy, premium feel. 
- **Breathing Room**: Vertical margins between distinct chat blocks or sections should be generous (typically 48px on desktop) to allow the user to focus on one thought at a time.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface Tier 1**: The background (#F9F9F8).
- **Surface Tier 2**: Interactive cards or the chat input field, set in White (#FFFFFF). These elements feature a subtle 1px border (#E5E5E1).
- **Shadows**: When elevation is required (e.g., a floating menu or a primary card), use a single, highly diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.03)`. The goal is for the shadow to be felt rather than seen.
- **Transitions**: Use soft opacity fades (200ms) for hover states rather than abrupt color changes.

## Shapes

The shape language is sophisticated and modern. 

- **Primary Radius**: Standard buttons and small components use a 0.5rem (8px) radius.
- **Large Components**: Cards, chat bubbles, and the main input bar use `rounded-xl` (16px) to create a soft, approachable silhouette that feels architectural.
- **Icons**: Use a consistent 1.5px or 2px stroke weight with rounded caps and joins to match the component corner radius.

## Components

- **Buttons**:
  - **Primary**: Filled Slate (#3B5979) with White text. No gradients.
  - **Secondary**: Outlined with the standard border (#E5E5E1) and Charcoal text. 
  - **States**: On hover, secondary buttons receive a subtle background tint of #F9F9F8.
- **Chat Bubbles**:
  - **User**: Minimalist, right-aligned, using a light tint of the accent color or a simple white card.
  - **AI**: Left-aligned, no containing bubble (plain text on the background) or a very subtle white surface to emphasize the "editorial" layout.
- **Input Fields**: The primary chat input should be a large, rounded-xl white bar. Use the Muted Grey for placeholder text and the Slate Blue for the "Send" icon when active.
- **Lists**: Clean rows with 1px bottom borders only. Avoid zebra-striping; use whitespace to separate items.
- **Chips**: Small, rounded-pill shapes with 12px horizontal padding and Muted Grey text, used for AI suggestions or categories.
# SCP Taskforce Application UI and CSS Design Guidelines

This document is the canonical reference for UI and CSS decisions in the SCP Zombie Checker app. It aligns with security-first and accessibility-first goals.

## Executive principles

- **Security-first and accessibility-first**: Minimize sensitive exposure; keep workflows fast, learnable, and robust under stress and unreliable connectivity.
- **One design language, platform-native expression**: Use one cross-platform design language (tokens + components + interaction rules) expressed through platform-native patterns (e.g. bottom nav on mobile, WCAG 2.1 AA on web).
- **Offline as a product feature**: Critical flows (e.g. incident/patient data) must work offline and sync when connectivity returns; local persistence is a security surface.

## CSS and design system

- **Design tokens**: Single source of truth via semantic tokens (e.g. `--color-surface`, `--color-danger`, `--focus-ring`), not raw colors; support light/dark (and optionally high-contrast) via token mapping.
- **Architecture**: ITCSS-style layering (settings → generic → elements → objects → components → utilities) with BEM or CSS Modules for components to control specificity and avoid global leakage.
- **Utility layer**: Small, for layout primitives only (spacing, grid, flex alignment).
- **Contrast and focus**: WCAG 2.1 AA minimums (4.5:1 normal text, 3:1 large text); visible focus styles; avoid removing focus rings or reducing contrast.

## Security UX and components

- **Destructive actions**: Clear confirmation for irreversible actions (clear agent data, factory reset); explicit "This cannot be undone" where appropriate.
- **Sensitive data**: Prefer minimal display by default; redaction in lists/overviews; no sensitive content in notifications by default.
- **Forms**: Accessible labels, `aria-describedby` for help text, required fields indicated; support autosave/queued status for offline.

## Accessibility (WCAG 2.1 AA+)

- Keyboard operability for all functionality; logical focus order.
- Touch targets: minimum 44×44pt (Apple) / 48×48dp (Material); design to the larger by default for critical actions.
- Use `aria-live`/`role="alert"` appropriately for dynamic updates; prefer native semantics over ARIA where possible.
- **Respect `prefers-reduced-motion`**: reduce or disable non-essential animation.

## Implementation alignment

When adding or changing UI:

- Use tokens from `src/styles/theme.css`; avoid raw hex in new CSS.
- Ensure visible `:focus`/`:focus-visible` for buttons and links.
- Wrap non-essential animations in `@media (prefers-reduced-motion: reduce)`.
- Maintain 44–48px min touch targets for buttons/controls.

## References

- Plan file (`.cursor/plans/` or project plan) for full "SCP Taskforce Application UI and CSS Design Guidelines" reference and implementation alignment table.
- `agentinstructions.md` for project layout, routes, and feature state.

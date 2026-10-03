# Changelog

All notable changes to the **BlockShield** platform (Hyperledger Fabric Identity & Digital Asset Management System) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-10-02

### Added & Re-designed
- **Professional Enterprise Landing Portal** ([CentralPortal.jsx](file:///home/varun/Projects/BLOCKSHIELD/frontend/src/components/CentralPortal.jsx)):
  - **Official BlockShield Logo Restored**: The actual `blockshield-logo.svg` (blue gradient shield with blockchain blocks + wordmark) is now rendered in the navigation bar alongside the `BLOCKSHIELD` title and `Secure Identity & Asset Management` subtitle.
  - **Frosted Glass Navbar**: Sticky top navigation with `backdrop-filter: blur(16px)` translucency, the SVG brand logo, and right-aligned status elements.
  - **Animated Status Indicator**: Concentric ring ping animation on the emerald dot for `System secure` (suppressed for offline state).
  - **User Session Chip**: Circular avatar initial, truncated username, and separated sign-out action when authenticated.
  - **Hero Section**:
    - Gradient mint protection pill: `🛡 BLOCKCHAIN-BACKED PROTECTION`.
    - Fluid headline with `clamp()` sizing: `SECURE. SIMPLE. VERIFIABLE.`
    - Two-line subtitle and gradient-fade section rule divider for `Choose your workspace`.
  - **4 Workspace Cards**: Left-aligned layout with multi-layered box-shadow, focus-visible outlines, and hover lift animation (−6px translateY):
    - **Admin**: Dark slate icon box (`#0f172a`) • shield-check icon • solid dark button.
    - **Manager**: Light slate icon box (`#f1f5f9`) with border • stacked layers icon • ghost button.
    - **Auditor**: Mint icon box (`#ecfdf5`) with border • search icon • ghost button.
    - **User**: Emerald icon box (`#047857`) • user icon • ghost button.
  - **Footer Tokens**: `IDENTITY • ACCESS • ASSETS • AUDIT` with emerald dot separators.
- **Professional CSS Polish** ([index.css](file:///home/varun/Projects/BLOCKSHIELD/frontend/src/index.css)):
  - Subtle diagonal background gradient (`#f8fafc → #eef3f8 → #f1f5f9`).
  - Card elevation system with dual-layer `box-shadow` for depth.
  - Responsive breakpoints at 1024px, 768px, and 540px with graceful degradation.
  - All portal styles scoped to `portal-*` namespace to avoid collisions with dashboard views.
- **Full-Width Viewport**: `App.jsx` conditionally applies `portal-app-wrapper` class to allow edge-to-edge layout on the portal landing while preserving bounded dashboard layouts inside workspaces.

---

## [1.2.0] - 2026-10-01

### Added
- **Direct 4-Role Portal Integration**:
  - Brought the Admin Portal into the primary central portal landing alongside Manager, Auditor, and User.
  - Added dedicated port routing (Port 5174 for Admin, 5175 for Manager, 5176 for Auditor, 5173 for User/Portal).
- **Intelligent Master Setup Script (`start.sh`)**:
  - Automated zero-friction environment bootstrapping across Ubuntu/Debian, Fedora, Arch, and macOS.
  - Automated pre-flight prerequisite verification: Docker, Node.js, npm, Fabric binaries, and cryptogen/configtxgen.
  - Intelligent port conflict resolution and automatic daemon health probing.

---

## [1.1.0] - 2026-09-28

### Added
- **Provenance & Immutable Audit Inspector**:
  - Visual timeline inspection modal for digital assets tracking genesis mint, transfers, and status changes.
  - Real-time security denial alerts and unauthorized transaction logging.
  - Cryptographic DID registry governance with department-based access control.
- **Custodian Transfer & Approval Engine**:
  - Dual-custody tokenized asset model strictly separating legal owner from operational custodian.
  - Assisted multi-stage transfer approvals with verification checks in Fabric smart contracts (chaincode).
  - Role-based communication channel drawer for real-time task dispatch and messaging.

---

## [1.0.0] - 2026-09-20

### Added
- **Core Blockchain Architecture**:
  - Hyperledger Fabric permissioned network with Raft ordering consensus.
  - Go chaincode implementing W3C-compliant Decentralized Identifiers (DIDs) and ERC-721 tokenized digital assets.
  - Node.js Express REST API backend utilizing Fabric Gateway SDK.
  - Role-Based Access Control (RBAC) supporting Admin, Manager, Auditor, and User roles.
  - Initial React + Vite single page application.

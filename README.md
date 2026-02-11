# SafeYou – Cybersecurity SaaS MVP

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React SPA)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Landing  │ │  Auth    │ │Dashboard │ │   Reports    │   │
│  │  Page    │ │  Pages   │ │  Views   │ │   & AI Fix   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│            Tailwind CSS + Shadcn/UI + Framer Motion         │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API (JSON)
┌─────────────────────────┴───────────────────────────────────┐
│                    API GATEWAY (Express.js)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  Auth    │ │  Repos   │ │  Scans   │ │   Reports    │   │
│  │ Routes   │ │  Routes  │ │  Routes  │ │   Routes     │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │             │            │               │           │
│  ┌────┴─────────────┴────────────┴───────────────┴───────┐  │
│  │              SERVICE LAYER                            │  │
│  │  AuthService │ RepoService │ ScanEngine │ ReportSvc   │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                                │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │              DATA LAYER (SQLite via better-sqlite3)   │  │
│  │  Users │ Repos │ Scans │ Vulnerabilities │ Plans      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         SCAN ENGINE (Mock CVE Database)               │  │
│  │  Pattern Matching │ CVE Mapping │ Severity Calc       │  │
│  │  AI Remediation (Mock) │ CVSS Scoring                 │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Backend
```bash
cd server
npm install
npm run dev
```
Server runs on http://localhost:3001

### Frontend
```bash
cd client
npm install
npm run dev
```
App runs on http://localhost:5173

## Database Schema

### Users
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| email | TEXT | Unique email |
| password_hash | TEXT | Bcrypt hash |
| name | TEXT | Display name |
| plan | TEXT | 'trial' / 'pro' / 'enterprise' |
| trial_scans_remaining | INTEGER | Scans left on trial |
| created_at | DATETIME | Account creation |

### Repositories
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | Foreign key → Users |
| name | TEXT | Repository name |
| url | TEXT | Git URL |
| type | TEXT | 'git' / 'binary' |
| status | TEXT | 'active' / 'archived' |
| created_at | DATETIME | Added date |

### Scans
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| repo_id | TEXT | Foreign key → Repositories |
| user_id | TEXT | Foreign key → Users |
| status | TEXT | 'pending'/'scanning'/'completed'/'failed' |
| started_at | DATETIME | Scan start |
| completed_at | DATETIME | Scan end |
| summary | TEXT (JSON) | Severity counts |

### Vulnerabilities
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT (UUID) | Primary key |
| scan_id | TEXT | Foreign key → Scans |
| cve_id | TEXT | CVE identifier |
| title | TEXT | Short title |
| description | TEXT | Full description |
| severity | TEXT | critical/high/medium/low |
| cvss_score | REAL | 0.0 – 10.0 |
| affected_component | TEXT | File or package |
| remediation | TEXT | Fix suggestion |
| patch_guidance | TEXT | Patch instructions |
| ai_fix | TEXT | AI-generated code fix |

### Plans
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Plan identifier |
| name | TEXT | Display name |
| price | REAL | Monthly price |
| scan_limit | INTEGER | Scans per month |
| full_reports | BOOLEAN | Access to full reports |
| ai_remediation | BOOLEAN | AI fix access |

## Scan Engine Logic

1. **Pattern Matching**: Analyzes repo URL or binary filename to determine technology stack
2. **CVE Mapping**: Maps detected stack to known CVEs from mock database (100+ realistic entries)
3. **Severity Calculation**: Uses CVSS v3.1 scoring with weighted random distribution
4. **Report Generation**: Compiles findings into structured report with remediation
5. **AI Remediation**: Generates mock but realistic code fixes and patch guidance

## Pricing Logic

| Feature | Trial | Pro ($29/mo) | Enterprise ($99/mo) |
|---------|-------|-------------|---------------------|
| Scans | 3 total | 50/month | Unlimited |
| Partial Report | ✅ | ✅ | ✅ |
| Full Report | ❌ | ✅ | ✅ |
| AI Remediation | ❌ | ✅ | ✅ |
| PDF Export | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

## Deployment Plan

1. **Build**: `npm run build` in both client and server
2. **Database**: SQLite file auto-created on first run
3. **Environment**: Set `JWT_SECRET`, `NODE_ENV=production`
4. **Suggested Cloud**: Railway, Render, or AWS EC2
5. **CI/CD**: GitHub Actions → Build → Test → Deploy

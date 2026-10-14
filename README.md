<h1 align="center">VIDYA Media Server</h1>

<p align="center">
<b>A self-hosted, open-source media server designed exclusively for educational video content.</b>
</p>
<p align="center">
  <img width="100%" alt="Banner image" src="https://github.com/user-attachments/assets/5d87062c-9366-4f47-8e23-91ca905906a8" />
</p>
<p align="center">
<a href="https://vidya.media">Website</a> •
<a href="https://vidya.media/docs">Documentation</a> •
<a href="https://vidya.media/downloads">Downloads</a> •
<a href="https://github.com/dextify-org/vidya/issues">Report Bug</a>
</p>

<p align="center">
<img alt="License" src="https://img.shields.io/badge/license-GPLv3-blue.svg">
<img alt="Version" src="https://img.shields.io/badge/version-1.0.0-green.svg">
<img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Docker-lightgrey.svg">
</p>

<p align="center">
<a href="https://twitter.com/vidya_server"><img alt="Follow on X" src="https://img.shields.io/badge/X-%40vidya__server-000000" /></a>
<a href="https://discord.gg/uavHJumK5v"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20Server-5865F2?logo=discord&logoColor=white" /></a>
</p>

---

## What is VIDYA?

VIDYA is a self-hosted media server built specifically for video lectures and educational content. Unlike general-purpose media servers, VIDYA automatically scans your local folders and organizes them into structured courses — turning your scattered video files into a private, fully-featured e-learning platform.

### Key Features

- **Course Organization** — Automatically structures video files into organized courses with sections and lectures
- **Progress Tracking** — Track your learning progress across courses and individual lectures
- **Bookmarking & Tagging** — Bookmark important moments and tag content for quick access
- **Study Dashboard** — Dedicated dashboard with daily watch statistics and learning insights
- **Multi-User Support** — Create accounts for multiple users with role-based access
- **Search** — Search across courses, lectures, instructors, and categories
- **Self-Hosted** — Your data stays on your machine, no cloud dependencies
- **Cross-Platform Clients** — Access your content from any device

### Tech Stack

| Component            | Technology                            |
| -------------------- | ------------------------------------- |
| **Frontend**         | React 18, React Router, Framer Motion |
| **Backend**          | Node.js, Express.js                   |
| **Database**         | SQLite (via Sequelize ORM)            |
| **Authentication**   | Passport.js with local strategy       |
| **Media Processing** | FFprobe, Sharp                        |
| **Windows Tray App** | .NET 6.0 (C#)                         |
| **Installer**        | NSIS                                  |
| **Containerization** | Docker                                |

---

## Quick Start

### Windows Installer (Recommended)

Download the latest `VIDYA-x64.exe` installer from [GitHub Releases](https://github.com/dextify-org/vidya/releases) and run it. The installer bundles everything you need — Node.js runtime, server backend, web frontend, and the system tray application.

### Docker

```bash
docker compose up -d
```

Or use `docker run` directly:

```bash
docker run -d \
  --name vidya \
  -p 31415:31415 \
  -v ./data:/data \
  -v /path/to/your/media:/media:ro \
  -e VIDYA_DATA_PATH=/data \
  -e PORT=31415 \
  --restart unless-stopped \
  ghcr.io/dextify-org/vidya:latest
```

Then open `http://localhost:31415` in your browser.

### Docker Compose

```yaml
services:
  vidya:
    image: ghcr.io/dextify-org/vidya:latest
    container_name: vidya
    ports:
      - "31415:31415"
    volumes:
      - ./data:/data
      - /path/to/your/media:/media:ro
    environment:
      - VIDYA_DATA_PATH=/data
      - PORT=31415
    restart: unless-stopped

volumes:
  data:
    driver: local
```

---

## Building from Source

### Prerequisites

| Tool         | Version | Required For                    |
| ------------ | ------- | ------------------------------- |
| **Node.js**  | 20+     | Frontend & Backend              |
| **npm**      | 9+      | Dependency management           |
| **NSIS**     | 3.x     | Windows installer (optional)    |
| **.NET SDK** | 6.0     | Tray app from source (optional) |
| **Docker**   | 20+     | Docker builds (optional)        |

### Clone the Repository

```bash
git clone https://github.com/dextify-org/vidya.git
cd vidya
```

### Install Dependencies

```bash
npm install
```

This installs both frontend and backend dependencies (the project uses npm workspaces).

---

### Build for Windows (Automated — PowerShell Script)

The `build-windows.ps1` script automates the entire Windows build process:

```powershell
.\build-windows.ps1
```

**What the script does:**

1. Auto-downloads the latest Node.js 22 LTS x64 binary into `node/` if `node\node.exe` is not already present
2. Builds the React frontend (`npm run build` → `build/` folder)
3. Cleans and creates a `staging/app/` directory
4. Copies the backend into `staging/app/` (excluding `node_modules`)
5. Installs production-only backend dependencies inside `staging/app/`
6. Runs NSIS to compile the installer (`VIDYA-x64.exe`)

**Requirements:**

- [NSIS](https://nsis.sourceforge.io/Download) installed at `C:\Program Files (x86)\NSIS\` or `C:\Program Files\NSIS\`
- Node.js 20+ and npm on your PATH
- The `tray/` folder must contain pre-built tray app binaries (see [Tray App](#tray-app-windows-system-tray) section below)

---

### Build for Windows (Manual Steps)

If you prefer to build manually instead of using the script, follow these steps:

#### Step 1: Build the Frontend

```bash
npm run build
```

This creates a production-optimized React build in the `build/` directory.

#### Step 2: Prepare the Staging Directory

Create a `staging/app/` directory and copy the backend into it:

```powershell
# Remove old staging if exists
Remove-Item -Recurse -Force staging -ErrorAction SilentlyContinue

# Create staging directory
New-Item -ItemType Directory -Path staging\app

# Copy backend files (exclude node_modules)
robocopy backend staging\app /E /XD node_modules /XF "*.log"
```

#### Step 3: Install Production Dependencies

```bash
cd staging/app
npm install --production
cd ../..
```

#### Step 4: Ensure Tray App Binaries Are Present

The `tray/` folder must contain the pre-built .NET tray application. The following files are required:

```
tray/
├── VIDYA.exe                                          # Main tray executable
├── VIDYA.dll                                          # Core library
├── VIDYA.deps.json                                    # Dependency manifest
├── VIDYA.runtimeconfig.json                           # Runtime configuration
├── VIDYA.pdb                                          # Debug symbols (optional)
├── app.ico                                            # Tray icon
├── System.ServiceProcess.ServiceController.dll        # Service controller dependency
└── runtimes/
    └── win/
        └── lib/
            └── net6.0/
                ├── System.Diagnostics.EventLog.Messages.dll
                └── System.ServiceProcess.ServiceController.dll
```

These binaries are pre-built and included in the repository. If you want to build the tray app from source, see the [Tray App](#tray-app-windows-system-tray) section below.

#### Step 5: Ensure Node.js Binary Is Present

The `node/` folder must contain a Windows x64 Node.js binary:

```
node/
└── node.exe    # Node.js v20 Windows x64 binary
```

Download from [nodejs.org](https://nodejs.org/en/download/) — use the Windows Binary (.zip) for x64, extract `node.exe`, and place it in the `node/` folder.

#### Step 6: Build the Installer (NSIS)

```powershell
# Find NSIS and compile installer
& "C:\Program Files (x86)\NSIS\makensis.exe" installer.nsi
```

This produces `VIDYA-x64.exe` — a full Windows installer that:

- Installs to `C:\Program Files\VIDYA`
- Creates Start Menu and Desktop shortcuts
- Registers in Windows Add/Remove Programs
- Bundles Node.js runtime, backend, frontend build, and tray app
- Stores user data in `%LOCALAPPDATA%\VIDYA`

---

### Build with Docker

```bash
docker build -t vidya .
```

The multi-stage Dockerfile:

1. **Stage 1** — Builds the React frontend
2. **Stage 2** — Installs backend production dependencies
3. **Stage 3** — Assembles the final lightweight runtime image

Run the built image:

```bash
docker run -d \
  --name vidya \
  -p 31415:31415 \
  -v ./data:/data \
  -v /path/to/your/media:/media:ro \
  vidya
```

---

## Tray App (Windows System Tray)

The VIDYA tray application is a .NET 6.0 Windows Forms app that sits in the system tray and manages the Node.js backend process. Pre-built binaries are included in the `tray/` folder.

### Building the Tray App from Source

If you want to build the tray app yourself:

1. **Clone the tray app repository:**

   ```bash
   git clone https://github.com/dextify-org/vidya-tray.git
   ```

2. **Build with .NET SDK 6.0:**

   ```bash
   cd vidya-tray
   dotnet build -c Release
   ```

3. **Copy the output files** from the build output directory into the `tray/` folder of this repository:

   ```
   bin/Release/net6.0/ → tray/
   ```

   Ensure all files listed in [Step 4 of the manual build](#step-4-ensure-tray-app-binaries-are-present) are present.

**Note:** The tray app requires .NET 6.0 Desktop Runtime on the target machine. The NSIS installer expects the pre-built binaries to be present in `tray/` at build time.

---

## Project Structure

```
vidya/
├── backend/                    # Express.js API server
│   ├── config/                 # Database and path configuration
│   │   ├── database.js         # Sequelize SQLite setup
│   │   └── path.js             # Data paths and port config
│   ├── controllers/            # Route handler logic
│   ├── middleware/              # Auth and user middleware
│   ├── models/                 # Sequelize data models
│   │   ├── User.js             # User accounts
│   │   ├── Course.js           # Course definitions
│   │   ├── Lecture.js          # Individual lectures
│   │   ├── Section.js          # Course sections
│   │   ├── CourseProgress.js   # Course-level progress
│   │   ├── LectureProgress.js  # Lecture-level progress
│   │   ├── DailyWatch.js       # Daily watch statistics
│   │   ├── Category.js         # Content categories
│   │   ├── Instructor.js       # Instructor profiles
│   │   ├── TagsAndBookmark.js  # Tags and bookmarks
│   │   └── ...
│   ├── routes/                 # API route definitions
│   │   ├── auth.js             # Authentication endpoints
│   │   ├── admin.js            # Admin management
│   │   ├── course.js           # Course CRUD operations
│   │   ├── drive.js            # File system scanning
│   │   ├── home.js             # Home/feed data
│   │   ├── dashboard.js        # Dashboard statistics
│   │   ├── search.js           # Search functionality
│   │   └── ...
│   ├── index.js                # Server entry point
│   └── package.json            # Backend dependencies
│
├── src/                        # React frontend source
│   ├── components/             # Reusable UI components
│   ├── pages/                  # Page-level components
│   ├── api/                    # API client utilities
│   ├── context/                # React context providers
│   ├── assets/                 # Static assets (images, icons)
│   ├── App.js                  # Root component
│   ├── AnimatedRoutes.js       # Route definitions with animations
│   ├── style.css               # Global stylesheet
│   └── index.js                # React entry point
│
├── public/                     # Static public files
├── assets/                     # Default server assets
├── tray/                       # Pre-built Windows tray app (.NET 6.0)
├── node/                       # Bundled Node.js binary (Windows)
├── resources/                  # Installer resources (icons, bitmaps)
│
├── build-windows.ps1           # Automated Windows build script
├── installer.nsi               # NSIS installer script
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose configuration
├── package.json                # Root package (workspaces)
└── LICENSE.txt                 # GNU GPL v3
```

---

## API Overview

The backend exposes a REST API at `http://localhost:31415/api/`:

| Endpoint                  | Description          |
| ------------------------- | -------------------- |
| `POST /api/auth/login`    | User authentication  |
| `POST /api/auth/register` | User registration    |
| `GET /api/home`           | Home feed data       |
| `GET /api/course/:id`     | Course details       |
| `GET /api/dashboard`      | Dashboard statistics |
| `GET /api/search`         | Search content       |
| `POST /api/drive`         | Scan media folders   |
| `GET /api/category`       | List categories      |
| `GET /api/instructor`     | List instructors     |
| `GET /api/admin`          | Admin operations     |
| `GET /api/user`           | User profile         |

---

## Configuration

### Environment Variables

| Variable          | Default         | Description                              |
| ----------------- | --------------- | ---------------------------------------- |
| `VIDYA_DATA_PATH` | Repository root | Path to store database, keys, and assets |
| `PORT`            | `31415`         | Server port                              |

### Single Sign-On (OIDC)

VIDYA can log users in through any OpenID Connect provider (Authelia, Authentik, Keycloak, ...). SSO is enabled when `OIDC_ISSUER_URL` is set; the login page then shows an extra SSO button.

| Variable                   | Default                       | Description                                                                                                                              |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `OIDC_ISSUER_URL`          | —                             | Issuer URL of the provider (enables SSO)                                                                                                 |
| `OIDC_CLIENT_ID`           | —                             | Client ID (required)                                                                                                                     |
| `OIDC_CLIENT_SECRET`       | —                             | Client secret, sent with `client_secret_basic`; omit for a public client                                                                 |
| `OIDC_REDIRECT_URI`        | —                             | Public callback URL, e.g. `https://vidya.example.com/api/auth/oidc/callback` (required)                                                  |
| `OIDC_SCOPES`              | `openid profile email groups` | Requested scopes                                                                                                                         |
| `OIDC_BUTTON_LABEL`        | `Log in with SSO`             | Text of the login button                                                                                                                 |
| `OIDC_USERNAME_CLAIM`      | `preferred_username`          | Claim used as the VIDYA username                                                                                                         |
| `OIDC_GROUPS_CLAIM`        | `groups`                      | Claim holding the user's groups                                                                                                          |
| `OIDC_ADMIN_GROUP`         | —                             | Members of this group become admins, everyone else becomes a regular user; synced on every SSO login. Unset = roles are managed in VIDYA |
| `OIDC_AUTO_CREATE`         | `true`                        | Create an account on first SSO login; when `false` only existing users can log in                                                        |
| `OIDC_DISABLE_LOCAL_LOGIN` | `false`                       | Disable username/password login (the first-startup setup still works)                                                                    |

On the first SSO login, an existing VIDYA account with the same username is linked to the SSO identity; after that, the user is matched by the provider's `sub`. Only connect a provider whose usernames you trust.

Register VIDYA at the provider as a confidential client using the authorization code flow with PKCE (`S256`) and the redirect URI above. If the provider uses a private CA, add `NODE_EXTRA_CA_CERTS=/path/to/ca.crt`.

### Data Storage

VIDYA stores its data in the following locations:

| Platform                | Location                  |
| ----------------------- | ------------------------- |
| **Windows (Installer)** | `%LOCALAPPDATA%\VIDYA\`   |
| **Docker**              | Mounted `/data` volume    |
| **Development**         | Repository root directory |

Data includes:

- `database.sqlite` — User accounts, courses, progress, settings
- `keys.json` — Auto-generated session secret key
- `assets/` — Thumbnails, cover images, and other media assets

---

## Contributing, Code of Conduct & Development

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation — every contribution matters.

### Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening issues or pull requests.

### Code of Conduct

This project follows the rules described in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

### Development Mode

Run the frontend dev server and backend simultaneously:

```bash
npm run dev
```

This starts:

- **Frontend** at `http://localhost:3000` (with hot reload)
- **Backend** at `http://localhost:31415` (with nodemon auto-restart)

The frontend proxies API requests to the backend via the `proxy` field in `package.json`.

You can also run them individually:

```bash
# Frontend only
npm run start

# Backend only
npm run server

# Backend in dev mode (with nodemon)
npm run dev-server
```

---

### Development Guidelines

- Follow existing code style and conventions
- Test your changes thoroughly before submitting
- Write clear commit messages describing your changes
- Update documentation if your changes affect the user interface or API
- Ensure the app builds successfully with `npm run build`

### Reporting Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/dextify-org/vidya/issues) with:

- Clear description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- System information (OS, Node.js version, browser)

---

## License

VIDYA is free software licensed under the **GNU General Public License v3.0** (GPL-3.0).

You are free to use, modify, and distribute this software under the terms of the GPL v3. Any modified versions must also be distributed under the same license and include the source code.

See [LICENSE.txt](LICENSE.txt) for the full license text.

**Copyright © 2026 [DEXTIFY](https://dextify.org)**

---

## Acknowledgements

VIDYA is built with these excellent open-source projects:

- [React](https://reactjs.org/) — UI framework
- [Express.js](https://expressjs.com/) — Web server framework
- [Sequelize](https://sequelize.org/) — ORM for SQLite
- [Passport.js](http://www.passportjs.org/) — Authentication middleware
- [Sharp](https://sharp.pixelplumbing.com/) — Image processing
- [FFprobe](https://ffmpeg.org/ffprobe.html) — Media analysis
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [NSIS](https://nsis.sourceforge.io/) — Windows installer compiler

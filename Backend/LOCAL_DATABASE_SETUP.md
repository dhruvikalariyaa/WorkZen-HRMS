# Local PostgreSQL Database Setup Guide

This guide will help you set up and run PostgreSQL locally for the WorkZen HRMS application.

## Step 1: Install PostgreSQL

### Windows:
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. **Remember the password** you set for the `postgres` user (default superuser)
4. Note the port (default is `5432`)

### Alternative: Using Chocolatey
```powershell
choco install postgresql
```

### Alternative: Using Docker
```bash
docker run --name postgres-hrms -e POSTGRES_PASSWORD=12345 -e POSTGRES_DB=workzen_hrms -p 5432:5432 -d postgres
```

## Step 2: Verify PostgreSQL Installation

Open PowerShell or Command Prompt and check if PostgreSQL is running:

```powershell
# Check if PostgreSQL service is running
Get-Service postgresql*

# Or check if port 5432 is in use
netstat -an | findstr 5432
```

## Step 3: Create the Database

### Option A: Using psql Command Line

1. Open PowerShell or Command Prompt
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\<version>\bin`)
3. Or add PostgreSQL to your PATH

```powershell
# Connect to PostgreSQL (you'll be prompted for password)
psql -U postgres

# Once connected, create the database
CREATE DATABASE workzen_hrms;

# Exit psql
\q
```

### Option B: Using pgAdmin (GUI Tool)

1. Open pgAdmin (installed with PostgreSQL)
2. Connect to your local server
3. Right-click on "Databases" → "Create" → "Database"
4. Name it: `workzen_hrms`
5. Click "Save"

### Option C: Using SQL Command (if psql is in PATH)

```powershell
# Create database directly from command line
psql -U postgres -c "CREATE DATABASE workzen_hrms;"
```

## Step 4: Update .env File

Your `.env` file should have these settings (already configured):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workzen_hrms
DB_USER=postgres
DB_PASSWORD=12345
```

**Important:** Make sure `DATABASE_URL` is commented out or removed, otherwise it will take precedence over the individual parameters.

## Step 5: Start PostgreSQL Service (if not running)

```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-<version>

# Or using net command
net start postgresql-x64-<version>
```

To check service name:
```powershell
Get-Service | Where-Object {$_.Name -like "*postgres*"}
```

## Step 6: Run the Application

1. Navigate to the Backend directory:
```powershell
cd D:\HRMS\WorkZen-HRMS\Backend
```

2. Install dependencies (if not already done):
```powershell
npm install
```

3. Start the server:
```powershell
npm run dev
```

The application will:
- Connect to your local PostgreSQL database
- Automatically create all required tables
- Start the server on port 5000

## Troubleshooting

### Error: "password authentication failed"
- Check your PostgreSQL password in `.env` matches the one you set during installation
- Try resetting the password:
  ```powershell
  psql -U postgres
  ALTER USER postgres WITH PASSWORD '12345';
  ```

### Error: "database does not exist"
- Make sure you created the database `workzen_hrms` (see Step 3)

### Error: "connection refused" or "could not connect"
- Check if PostgreSQL service is running:
  ```powershell
  Get-Service postgresql*
  ```
- Start the service if it's stopped
- Verify the port (default is 5432)

### Error: "port 5432 is already in use"
- Another PostgreSQL instance might be running
- Check what's using the port:
  ```powershell
  netstat -ano | findstr 5432
  ```

### Can't find psql command
- Add PostgreSQL bin directory to your PATH:
  - Usually: `C:\Program Files\PostgreSQL\<version>\bin`
  - Or use full path: `"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres`

## Quick Test

Test your database connection:
```powershell
psql -U postgres -d workzen_hrms -c "SELECT version();"
```

If this works, your database is ready! 🎉


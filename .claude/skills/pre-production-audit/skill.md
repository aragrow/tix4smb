# Pre-Production Security & Code Quality Audit

**Description**: Comprehensive security and code quality audit before production deployment. Performs 8 audit phases covering 12+ security checks including vulnerabilities, SQL injection, hardcoded secrets, command injection, weak cryptography, and more.

**When to use**: Run this skill before every production deployment to ensure security and code quality standards.

**Tools**: Read, Grep, Bash, Glob

---

## What this skill does

This skill performs a complete pre-production audit in 8 optimized phases:

### Phase 1: Dependency Security Scan
- Python package vulnerabilities (using `pip-audit` or `safety`)
- Known CVEs in dependencies
- Outdated packages with security patches

### Phase 2: Unified Code Security Scan (6 Sub-Checks)
This phase performs 6 security checks in a single optimized file pass:

**2.1 SQL Injection Prevention**
- Scans all Python files for raw SQL statements
- Identifies unsanitized user input in SQL queries
- Checks for proper parameterization and ORM usage

**2.2 Hardcoded Secrets Detection**
- Scans for API keys, passwords, tokens in source code
- Detects AWS keys, database credentials, private keys
- Identifies secrets that should be in environment variables

**2.3 Insecure Deserialization**
- Detects unsafe pickle, YAML, eval(), exec() usage
- Identifies dynamic imports with potential user input
- Prevents arbitrary code execution vulnerabilities

**2.4 Command Injection**
- Scans for shell=True in subprocess calls
- Detects os.system(), os.popen() usage
- Identifies potential command injection vectors

**2.5 Weak Cryptography**
- Detects MD5, SHA1 (weak hashing algorithms)
- Identifies DES, RC4 (broken encryption)
- Finds weak random number generation (random.random)

**2.6 Data Encryption & Leaks**
- Checks for encryption at rest (database fields)
- Verifies sensitive data handling
- Checks for proper masking in logs and UI

### Phase 3: Code Organization Analysis
- Analyzes file sizes (line counts)
- Identifies files that should be split (>500 lines)
- Suggests refactoring opportunities

### Phase 4: CSS/JS Separation Check
- Detects inline styles in HTML templates
- Detects inline JavaScript in templates
- Ensures proper separation of concerns

### Phase 5: CSRF Protection Verification
- Checks all forms for CSRF tokens
- Verifies CSRF middleware is enabled
- Identifies unprotected POST/PUT/DELETE endpoints

### Phase 6: Production Configuration Check
- Checks for DEBUG=True in production
- Verifies database configuration
- Ensures environment variables are properly set

### Phase 7: Security Headers Check
- Verifies CORS configuration (not too permissive)
- Checks for Content-Security-Policy (CSP)
- Ensures HSTS (Strict-Transport-Security) is enabled

### Phase 8: Report Generation
- Generates comprehensive audit report
- Categorizes issues by severity
- Provides deployment recommendation

---

## Audit Coverage (12 Security Areas)

This audit covers the following security areas:

1. **Security Vulnerabilities** - Python package CVEs and outdated dependencies
2. **SQL Injection Prevention** - Raw SQL, string formatting, parameterization
3. **Hardcoded Secrets Detection** - API keys, passwords, tokens in code
4. **Insecure Deserialization** - pickle, YAML, eval(), exec() risks
5. **Command Injection** - subprocess shell=True, os.system() usage
6. **Weak Cryptography** - MD5, SHA1, DES, RC4, weak random
7. **Data Encryption & Leaks** - Sensitive fields, log masking, UI display
8. **Code Organization** - File sizes, refactoring opportunities
9. **CSS/JS Separation** - Inline styles/scripts in templates
10. **CSRF Protection** - Form tokens, middleware, endpoint protection
11. **Production Configuration** - DEBUG mode, database settings
12. **Security Headers** - CORS, CSP, HSTS configuration

---

## Audit Process

### Phase 1: Dependency Security Scan

```bash
# Install security audit tools if needed
pip install pip-audit safety

# Run pip-audit (official Python package vulnerability scanner)
pip-audit --desc --format json -o /tmp/pip-audit-report.json

# Run safety check (alternative scanner)
safety check --json --output /tmp/safety-report.json

# Check for outdated packages
pip list --outdated --format json > /tmp/outdated-packages.json
```

**Critical findings**: Any HIGH or CRITICAL vulnerabilities must be fixed before deployment.

---

### Phase 2: SQL Injection Vulnerability Scan

Search for potential SQL injection vulnerabilities:

1. **Raw SQL with string formatting**
   ```python
   # BAD - String formatting
   query = f"SELECT * FROM users WHERE id = {user_id}"
   query = "SELECT * FROM users WHERE id = %s" % user_id
   query = "SELECT * FROM users WHERE id = " + user_id
   ```

2. **Raw execute() without parameters**
   ```python
   # BAD - Direct string interpolation
   conn.execute(f"SELECT * FROM {table_name}")

   # GOOD - Parameterized
   conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
   ```

3. **Patterns to scan for**:
   - `execute(f"` - f-string in execute
   - `execute(".*%s.*".*%` - % formatting
   - `execute(".*\+.*"` - String concatenation
   - `.format\(.*\)` in SQL context
   - Raw SQL in `.query()` methods

**Scan locations**:
- `api/` directory (all Python files)
- `src/` directory (all Python files)
- Look for: `execute`, `executemany`, `raw`, `.query(`, `text(`

---

### Phase 3: Code Organization Analysis

Analyze file sizes and suggest refactoring:

```bash
# Find large files (>500 lines)
find . -name "*.py" -not -path "./.venv/*" -not -path "./.*" -exec wc -l {} \; | \
  awk '$1 > 500 {print $1, $2}' | sort -rn

# Identify overly complex files
# - Files with >1000 lines should be split
# - Files with >500 lines should be reviewed
```

**Recommended file size limits**:
- **Models**: <300 lines per model file
- **Views/Routes**: <500 lines per route file
- **Services**: <400 lines per service file
- **Utilities**: <200 lines per utility file

**Refactoring suggestions**:
- Split large route files into separate modules
- Extract business logic into service classes
- Create utility modules for helper functions
- Use inheritance/composition for large models

---

### Phase 4: CSS/JS Separation Check

Scan templates for inline styles and scripts:

**Check for inline styles**:
```html
<!-- BAD -->
<div style="color: red;">...</div>
<button style="width: 100px;">...</button>

<!-- GOOD -->
<div class="text-red">...</div>
<button class="btn-primary">...</button>
```

**Check for inline JavaScript**:
```html
<!-- BAD -->
<button onclick="alert('hi')">Click</button>
<script>
  function doSomething() { ... }
</script>

<!-- GOOD -->
<button id="myButton">Click</button>
<!-- External JS file -->
<script src="/static/js/script.js"></script>
```

**Scan patterns**:
- Templates: `api/admin/templates/**/*.html`
- Look for: `style="`, `onclick="`, `onload="`, `<script>` (not src)
- Exceptions: `<script src=` (external) is OK

---

### Phase 5: CSRF Protection Verification

Check all forms and endpoints:

**1. Form CSRF Tokens**
```html
<!-- All forms MUST have CSRF token -->
<form method="post" action="/submit">
  <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
  <!-- or -->
  {{ csrf_token_input() }}
</form>
```

**2. Middleware Configuration**
```python
# Check that CSRF middleware is enabled
# In api/main.py or middleware config
from starlette.middleware.csrf import CSRFMiddleware
app.add_middleware(CSRFMiddleware, ...)
```

**3. API Endpoints**
- All POST/PUT/DELETE/PATCH routes must check CSRF
- Exceptions: `/api/v1/auth/login` (may use alternative auth)
- API endpoints should use token-based auth instead

**Scan for**:
- Forms without `csrf_token`
- POST routes without CSRF verification
- Unprotected state-changing endpoints

---

### Phase 6: Data Encryption & Sensitive Data Handling

**6.1 Encryption at Rest**

Check for sensitive fields that should be encrypted:
```python
# Sensitive data that MUST be encrypted
SENSITIVE_FIELDS = [
    'password',
    'api_key',
    'secret_key',
    'token',
    'access_token',
    'refresh_token',
    'credit_card',
    'ssn',
    'private_key',
]
```

Verify encryption:
```python
# GOOD - Hashed password
password = Column(String(255))  # with bcrypt/argon2

# GOOD - Encrypted field
from sqlalchemy_utils import EncryptedType
api_key = Column(EncryptedType(String, SECRET_KEY))

# BAD - Plain text password
password = Column(String(255))  # stored as plain text
```

**6.2 Sensitive Data in Logs**

Check for sensitive data leakage:
```python
# BAD - Logging sensitive data
logger.info(f"User logged in: {user.password}")
logger.debug(f"API key: {api_key}")
print(f"Token: {token}")

# GOOD - Masked or excluded
logger.info(f"User logged in: {user.email}")
logger.debug(f"API key: {'*' * 8}")
```

**Scan for**:
- Password/token/key in log statements
- Sensitive data in print() statements
- Exception handlers exposing secrets

**6.3 UI Data Masking**

Check templates for proper data masking:
```html
<!-- BAD - Showing full API key -->
<input type="text" value="{{ user.api_key }}">

<!-- GOOD - Masked -->
<input type="text" value="{{ user.api_key[:8] }}********">

<!-- BAD - Credit card in plain text -->
<span>{{ user.credit_card }}</span>

<!-- GOOD - Masked -->
<span>**** **** **** {{ user.credit_card[-4:] }}</span>
```

**Scan templates for**:
- API keys, tokens, passwords displayed without masking
- Credit card numbers
- SSN or sensitive ID numbers

---

### Phase 7: Hardcoded Secrets Detection (NEW)

Scan for hardcoded credentials and secrets in source code:

**7.1 Secret Patterns to Detect**

```python
# CRITICAL - Hardcoded API keys
api_key = "sk_live_51H7qR2SB..."
SECRET_KEY = "a1b2c3d4e5f6..."
AWS_ACCESS_KEY = "AKIA..."

# CRITICAL - Hardcoded passwords
password = "MyP@ssw0rd123"
DB_PASSWORD = "admin123"

# CRITICAL - Database credentials in URLs
DATABASE_URL = "mysql://user:password@localhost/db"
SQLALCHEMY_DATABASE_URI = "postgres://admin:secret@db:5432/prod"

# CRITICAL - Private keys
private_key = "-----BEGIN PRIVATE KEY-----\n..."
```

**7.2 Scan Locations**
- All Python files (`.py`)
- All JavaScript files (`.js`)
- Configuration files
- Exclude: `.env.example`, templates, test files with obvious placeholders

**7.3 False Positive Filtering**
- Skip lines with: `example`, `placeholder`, `your_`, `xxx`, `todo`, `changeme`
- Skip comments (lines starting with `#` or `//`)

---

### Phase 8: Insecure Deserialization (NEW)

Check for dangerous deserialization that can lead to remote code execution:

**8.1 Dangerous Patterns**

```python
# CRITICAL - Unsafe pickle (arbitrary code execution)
import pickle
data = pickle.loads(user_input)  # NEVER do this with untrusted data

# HIGH - Unsafe YAML load
import yaml
config = yaml.load(file)  # Use yaml.safe_load() instead

# CRITICAL - eval() with user input
result = eval(user_expression)  # NEVER use eval() with user input

# HIGH - exec() with user input
exec(user_code)  # Extremely dangerous

# HIGH - Dynamic imports
module = __import__(user_module_name)  # Validate module names
```

**8.2 Safe Alternatives**
- `pickle`: Only deserialize trusted data, use JSON for untrusted data
- `yaml`: Use `yaml.safe_load()` instead of `yaml.load()`
- `eval/exec`: Avoid entirely, use ast.literal_eval() for literals only
- `__import__`: Whitelist allowed modules

---

### Phase 9: Command Injection (NEW)

Scan for shell command injection vulnerabilities:

**9.1 Dangerous Patterns**

```python
# CRITICAL - subprocess with shell=True
import subprocess
subprocess.run(f"ls {user_directory}", shell=True)  # VULNERABLE

# CRITICAL - os.system()
import os
os.system(f"rm {user_file}")  # VULNERABLE

# CRITICAL - os.popen()
result = os.popen(f"cat {user_file}").read()  # VULNERABLE
```

**9.2 Safe Alternatives**

```python
# SAFE - subprocess with list arguments
subprocess.run(["ls", user_directory], shell=False)

# SAFE - Use pathlib for file operations
from pathlib import Path
Path(user_file).unlink()
```

**9.3 Risk Assessment**
- CRITICAL if user input detected (`input`, `request`, `user`, `param`, `query`)
- HIGH otherwise (still dangerous practice)

---

### Phase 10: Weak Cryptography (NEW)

Identify use of broken or weak cryptographic algorithms:

**10.1 Weak Hashing Algorithms**

```python
# HIGH - MD5 (collision attacks possible)
import hashlib
hash = hashlib.md5(data).hexdigest()  # Use SHA256 or better

# MEDIUM - SHA1 (deprecated, collision attacks)
hash = hashlib.sha1(data).hexdigest()  # Use SHA256 or better

# GOOD - SHA256 or better
hash = hashlib.sha256(data).hexdigest()
hash = hashlib.sha3_256(data).hexdigest()
```

**10.2 Weak Encryption**

```python
# CRITICAL - DES (broken, 56-bit key)
from Crypto.Cipher import DES
cipher = DES.new(key)

# CRITICAL - RC4 (broken stream cipher)
from Crypto.Cipher import ARC4
cipher = ARC4.new(key)

# GOOD - AES-256-GCM
from Crypto.Cipher import AES
cipher = AES.new(key, AES.MODE_GCM)
```

**10.3 Weak Random Number Generation**

```python
# MEDIUM - Not cryptographically secure
import random
token = random.random()

# GOOD - Cryptographically secure
import secrets
token = secrets.token_bytes(32)
random_int = secrets.SystemRandom().randint(0, 100)
```

**10.4 Exceptions**
- MD5/SHA1 OK for checksums, ETags (non-security purposes)

---

### Phase 11: Production Configuration (NEW)

Verify production-ready configuration:

**11.1 Debug Mode Check**

```bash
# Check .env files
DEBUG=True  # CRITICAL - Must be False in production
DEBUG=1     # CRITICAL
DEBUG=yes   # CRITICAL

# Check settings.py
DEBUG = True  # HIGH - Should use environment variable
```

**11.2 Database Configuration**

```bash
# MEDIUM - Localhost database in production config
DATABASE_URL=mysql://localhost:3306/db
DB_HOST=127.0.0.1
```

**11.3 Recommendations**
- DEBUG must be False or from environment variable
- Production database should not be localhost
- All secrets should be in environment variables

---

### Phase 12: Security Headers (NEW)

Check for essential security headers:

**12.1 CORS Configuration**

```python
# HIGH - Overly permissive CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DANGEROUS - allows all origins
)

# GOOD - Specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
)
```

**12.2 Content-Security-Policy (CSP)**

```python
# MEDIUM - Missing CSP
# Add CSP middleware to prevent XSS attacks

# GOOD
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    return response
```

**12.3 HSTS (Strict-Transport-Security)**

```python
# MEDIUM - Missing HSTS
# Add HSTS to force HTTPS connections

# GOOD
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
```

---

## Execution Steps

When this skill is invoked, perform these steps:

### Step 1: Setup & Dependencies
```bash
# Ensure audit tools are available
pip install pip-audit safety bandit semgrep -q
```

### Step 2: Run Security Scans
```bash
# Python package vulnerabilities
pip-audit --desc --format json

# Additional security check
safety check --json

# Code security scan
bandit -r api/ src/ -f json -o /tmp/bandit-report.json
```

### Step 3: SQL Injection Scan
```bash
# Search for dangerous SQL patterns
grep -r "execute(f\"" api/ src/
grep -r "execute(\".*%s.*\"" api/ src/
grep -r "\.format(" api/ src/ | grep -i "select\|insert\|update\|delete"

# Use semgrep for advanced patterns
semgrep --config=p/sql-injection api/ src/
```

### Step 4: Code Organization Analysis
```bash
# Find files >500 lines
find api/ src/ -name "*.py" -exec wc -l {} \; | \
  awk '$1 > 500' | sort -rn > /tmp/large-files.txt

# Analyze complexity
find api/ src/ -name "*.py" -exec python -c "
import ast
import sys
with open(sys.argv[1]) as f:
    tree = ast.parse(f.read())
    functions = [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
    classes = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
    print(f'{sys.argv[1]}: {len(classes)} classes, {len(functions)} functions')
" {} \;
```

### Step 5: Template Analysis (CSS/JS Separation)
```bash
# Find inline styles
grep -r "style=\"" api/admin/templates/ | wc -l

# Find inline JavaScript
grep -r "onclick=\"\|onload=\"\|<script>" api/admin/templates/ | \
  grep -v "script src=" | wc -l

# Find inline script tags
find api/admin/templates/ -name "*.html" -exec grep -l "<script>" {} \; | \
  xargs grep -L "script src="
```

### Step 6: CSRF Protection Check
```bash
# Find forms without CSRF tokens
find api/admin/templates/ -name "*.html" -exec grep -l "<form" {} \; | \
  xargs grep -L "csrf_token"

# Check POST endpoints
grep -r "@router.post\|@app.post\|@router.put\|@app.put" api/ | \
  grep -v "Depends.*csrf"
```

### Step 7: Encryption & Sensitive Data Check
```bash
# Find password fields without hashing
grep -r "Column.*password" api/database/

# Find potential plain text secrets
grep -ri "api_key\|secret\|password\|token" api/database/models/ | \
  grep "Column" | grep -v "Encrypted\|Hash"

# Check for secrets in logs
grep -r "logger.*password\|logger.*token\|logger.*key\|print.*password" api/ src/
```

---

## Report Format

Generate a comprehensive report with:

### 1. Executive Summary
- Total issues found
- Critical issues (must fix)
- High priority issues (should fix)
- Medium/Low priority issues

### 2. Security Vulnerabilities
- Package name
- Current version
- Vulnerable version
- CVE ID
- Severity
- Fix version
- Recommendation

### 3. SQL Injection Risks
- File path
- Line number
- Code snippet
- Risk level
- Recommendation

### 4. Code Organization Issues
- File path
- Line count
- Suggested split points
- Refactoring suggestions

### 5. CSS/JS Separation Violations
- Template file
- Line number
- Violation type (inline style/script)
- Recommendation

### 6. CSRF Protection Gaps
- Form/endpoint location
- Protection status
- Recommendation

### 7. Encryption & Data Security Issues
- Field/variable name
- Location
- Issue type
- Recommendation

---

## Pass/Fail Criteria

### ❌ DEPLOYMENT BLOCKED - Critical Issues

1. **High/Critical CVEs** in dependencies
2. **SQL injection vulnerabilities** (confirmed)
3. **Missing CSRF protection** on state-changing endpoints
4. **Passwords stored in plain text**
5. **API keys/tokens logged** in plain text

### ⚠️ DEPLOYMENT WITH CAUTION - High Priority

1. Medium severity CVEs
2. Files >1000 lines (technical debt)
3. Extensive inline styles/scripts (>10 instances)
4. Sensitive data displayed without masking

### ✅ DEPLOYMENT APPROVED - Low Priority

1. Low severity CVEs (with plan to fix)
2. Files 500-1000 lines (monitor)
3. Minor inline style/script issues (<10)
4. No critical security issues

---

## Example Report

```
╔═══════════════════════════════════════════════════════════════╗
║          Pre-Production Security & Quality Audit              ║
║                     WarpInsights v1.4.0                       ║
╚═══════════════════════════════════════════════════════════════╝

Scan Date: 2026-02-02 01:30:00 UTC
Total Issues: 23 (3 Critical, 5 High, 10 Medium, 5 Low)

═══════════════════════════════════════════════════════════════

CRITICAL ISSUES (3) - DEPLOYMENT BLOCKED ❌

1. [SQL-INJECTION] Potential SQL injection vulnerability
   File: api/admin/route_modules/reports.py:145
   Code: conn.execute(f"SELECT * FROM {table_name} WHERE id = {user_id}")
   Risk: HIGH
   Fix: Use parameterized queries: conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))

2. [CSRF] Missing CSRF protection on POST endpoint
   File: api/admin/routes.py:234
   Route: @router.post("/api/users/update")
   Fix: Add CSRF validation or require API token

3. [ENCRYPTION] Plain text API key storage
   File: api/database/models/user.py:45
   Field: api_key = Column(String(255))
   Fix: Use EncryptedType or hash before storage

═══════════════════════════════════════════════════════════════

HIGH PRIORITY ISSUES (5) - REVIEW REQUIRED ⚠️

1. [VULNERABILITY] urllib3 vulnerability CVE-2024-1234
   Package: urllib3==1.26.5
   Severity: HIGH
   Fix: Upgrade to urllib3>=1.26.18

2. [CODE-SIZE] Large file detected
   File: api/admin/route_modules/accessibility_data.py
   Lines: 1,234
   Suggestion: Split into multiple modules by feature

... (continued)

═══════════════════════════════════════════════════════════════

DEPLOYMENT STATUS: ❌ BLOCKED

Critical issues must be resolved before production deployment.
Please fix the 3 critical issues and re-run this audit.

═══════════════════════════════════════════════════════════════
```

---

## Usage

```bash
# Run the audit
/pre-production-audit

# Run with specific focus
/pre-production-audit --focus=security
/pre-production-audit --focus=code-quality
/pre-production-audit --focus=sql-injection

# Generate detailed report
/pre-production-audit --detailed --output=audit-report.txt
```

---

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Pre-Production Audit
        run: |
          pip install pip-audit safety bandit semgrep
          python scripts/pre_production_audit.py
      - name: Check for Critical Issues
        run: |
          if grep -q "CRITICAL" audit-report.txt; then
            echo "Critical security issues found. Deployment blocked."
            exit 1
          fi
```

---

## Maintenance

Update this skill when:
- New security tools become available
- New vulnerability types are discovered
- Security standards change
- Compliance requirements are updated

Last Updated: 2026-02-01
Version: 2.0.0 (Enhanced with 6 additional security checks)

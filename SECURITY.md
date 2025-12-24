# Security Policy

## 🔒 Security Measures

This project implements comprehensive security measures to protect both users and server operators.

### Backend Security

| Feature | Implementation | Purpose |
|---------|---------------|---------|
| **Security Headers** | Helmet.js | XSS, clickjacking, MIME sniffing protection |
| **Rate Limiting** | express-rate-limit | Prevent DoS and brute force attacks |
| **Input Validation** | express-validator | Prevent injection attacks |
| **File Validation** | Multer filters | Prevent malicious file uploads |
| **CORS** | Configured origins | Prevent unauthorized cross-origin requests |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| File Upload | 10 requests | 15 minutes |
| Media Download | 20 requests | 15 minutes |

### Allowed File Types

| Category | Extensions |
|----------|------------|
| Video | .mp4, .mov, .mkv, .avi, .webm |
| Audio | .mp3, .wav, .aac, .flac |
| Image | .jpg, .jpeg, .png, .webp, .gif |
| Subtitle | .srt, .vtt |

### File Size Limits

| Type | Max Size |
|------|----------|
| Video | 500 MB |
| Image | 10 MB |
| Studio Upload | 2 GB |

---

## 🛡️ Reporting a Vulnerability

If you discover a security vulnerability, please follow responsible disclosure:

1. **Do NOT** create a public GitHub issue
2. Email the maintainer directly with details
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Stage | Timeframe |
|-------|-----------|
| Acknowledgment | 48 hours |
| Initial Assessment | 1 week |
| Fix Development | 2-4 weeks |
| Public Disclosure | After fix is released |

---

## 🔐 Security Best Practices for Operators

### When Running Publicly

1. **Use HTTPS** - Cloudflare Tunnel provides this automatically
2. **Monitor Logs** - Watch for suspicious activity
3. **Update Regularly** - Keep yt-dlp and dependencies updated
4. **Limit Access** - Don't expose unnecessary endpoints

### Environment Variables

Never commit sensitive data. Use environment variables:

```bash
# ❌ Bad
const API_KEY = 'sk-12345';

# ✅ Good
const API_KEY = process.env.API_KEY;
```

### Running Security Audit

```powershell
# Check for known vulnerabilities
npm run security:audit

# Update vulnerable packages
npm audit fix
```

---

## 📋 Security Checklist

Before deploying publicly, verify:

- [ ] All dependencies are up to date
- [ ] `npm audit` shows no HIGH/CRITICAL issues
- [ ] Rate limiting is enabled
- [ ] CORS is configured correctly
- [ ] File upload limits are set
- [ ] No secrets in code or logs
- [ ] HTTPS is enabled (via Cloudflare Tunnel)

---

## 🔧 Security Configuration

### Customizing Rate Limits

Edit `backend/src/middleware/security.js`:

```javascript
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: 'Too many requests, please try again later'
});
```

### Customizing CORS

Edit `backend/src/middleware/security.js`:

```javascript
const corsOptions = {
  origin: [
    'http://localhost:8080',
    /\.trycloudflare\.com$/
  ],
  credentials: true
};
```

---

## 📜 Version History

| Version | Security Updates |
|---------|-----------------|
| 1.0.0 | Initial security implementation |

---

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

/**
 * Security Middleware
 * Centralized security configuration for the backend
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Helmet security headers configuration
 */
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            mediaSrc: ["'self'", "blob:"],
            connectSrc: ["'self'", "https://*.trycloudflare.com"],
        },
    },
    crossOriginEmbedderPolicy: false, // Required for media playback
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin media access
});

/**
 * CORS configuration - allows localhost and Cloudflare tunnels
 */
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // Allowed origins
        const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,
            /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
        ];

        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

/**
 * Rate limiters for different endpoints
 */
const createRateLimiter = (windowMs, max, message) => rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`[Rate Limit] Exceeded for IP: ${req.ip}`);
        res.status(429).json({ error: message });
    },
});

// General API rate limiter
const generalLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    'Too many requests. Please try again later.'
);

// File upload rate limiter (stricter)
const uploadLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    10, // 10 uploads
    'Too many uploads. Please try again later.'
);

// Media download rate limiter
const downloadLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    20, // 20 downloads
    'Too many download requests. Please try again later.'
);

// Media analysis rate limiter
const analyzeLimiter = createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    30, // 30 analyses
    'Too many analysis requests. Please try again later.'
);

/**
 * Input validation middleware
 */
const validateUrl = [
    body('url')
        .trim()
        .notEmpty().withMessage('URL is required')
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('Invalid URL format'),
];

const validateDownload = [
    body('url')
        .trim()
        .notEmpty().withMessage('URL is required'),
    body('format_id')
        .optional()
        .trim()
        .isString().withMessage('Format ID must be a string'),
    body('audio_only')
        .optional()
        .isBoolean().withMessage('audio_only must be a boolean'),
];

const validateJobId = [
    param('jobId')
        .trim()
        .notEmpty().withMessage('Job ID is required')
        .isUUID().withMessage('Invalid Job ID format'),
];

/**
 * Validation error handler
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.warn('[Validation] Failed:', errors.array());
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(e => e.msg),
        });
    }
    next();
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
    // Remove any potentially dangerous properties
    if (req.body) {
        delete req.body.__proto__;
        delete req.body.constructor;
        delete req.body.prototype;
    }
    next();
};

/**
 * Security logging middleware
 */
const securityLogger = (req, res, next) => {
    // Log suspicious patterns
    const suspiciousPatterns = [
        /\.\./,  // Path traversal
        /<script/i,  // XSS attempt
        /javascript:/i,  // JS injection
        /on\w+=/i,  // Event handlers
    ];

    const checkValue = (value) => {
        if (typeof value === 'string') {
            return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        return false;
    };

    const isSuspicious =
        Object.values(req.body || {}).some(checkValue) ||
        Object.values(req.query || {}).some(checkValue);

    if (isSuspicious) {
        console.warn(`[Security] Suspicious request from ${req.ip}: ${req.method} ${req.path}`);
    }

    next();
};

module.exports = {
    helmetConfig,
    corsOptions,
    generalLimiter,
    uploadLimiter,
    downloadLimiter,
    analyzeLimiter,
    validateUrl,
    validateDownload,
    validateJobId,
    handleValidationErrors,
    sanitizeRequest,
    securityLogger,
};

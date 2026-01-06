# Quick Start - AI Analysis Module

## 1. Install Dependencies

```bash
npm install
```

New packages installed:
- `bullmq` - Job queue system
- `ioredis` - Redis client for BullMQ
- `openai` - OpenAI SDK for GPT-4 and embeddings
- `pdf-parse` - PDF text extraction

## 2. Environment Setup

Create `.env` file (copy from `.env.example`):

```env
# Existing config
MONGODB_URI=mongodb://localhost:27018/easychair
JWT_SECRET=your-secret-key-here
SUPER_ADMIN_EMAILS=admin@example.com

# NEW: Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# NEW: OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# NEW: Worker Configuration (optional)
AI_WORKER_CONCURRENCY=2
```

## 3. Start Services

```bash
# Start MongoDB and Redis
docker-compose up -d

# Verify Redis is running
docker ps | grep redis
```

## 4. Start Application

Open **two terminals**:

### Terminal 1: API Server
```bash
npm run dev
```

### Terminal 2: AI Worker
```bash
npm run worker
```

## 5. Test the Implementation

### Create Conference with AI Enabled

```bash
# 1. Login as super admin
POST /auth/login
{
  "email": "admin@example.com",
  "name": "Admin User"
}

# Save the token from response

# 2. Create organization
POST /orgs
Authorization: Bearer <token>
{
  "name": "Test University",
  "slug": "test-uni"
}

# Save orgId from response

# 3. Create conference
POST /conferences
Authorization: Bearer <token>
x-org-id: <orgId>
{
  "name": "Test Conference 2025",
  "slug": "testconf2025"
}

# Save conferenceId from response

# 4. Configure AI settings
POST /conferences/<conferenceId>/settings
Authorization: Bearer <token>
x-org-id: <orgId>
{
  "ai": {
    "enabled": true,
    "runMode": "both",
    "consentRequired": true,
    "plagiarismThresholdPct": 25,
    "excludeReferencesToggle": true
  }
}
```

### Test Author Workflow

```bash
# 1. Login as author
POST /auth/login
{
  "email": "author@example.com",
  "name": "Test Author"
}

# 2. Create submission
POST /submissions
Authorization: Bearer <token>
x-org-id: <orgId>
{
  "conferenceId": "<conferenceId>",
  "trackId": "<trackId>",
  "metadata": {
    "title": "My Research Paper",
    "abstract": "This paper presents...",
    "keywords": ["AI", "research"],
    "authors": [{
      "name": "Test Author",
      "affiliation": "Test University",
      "corresponding": true
    }]
  }
}

# Save submissionId from response

# 3. Grant AI consent
POST /submissions/<submissionId>/ai-consent
Authorization: Bearer <token>
x-org-id: <orgId>
{
  "consentAI": true,
  "consentFineTune": false
}

# 4. Upload file (auto-triggers AI)
POST /submissions/<submissionId>/files
Authorization: Bearer <token>
x-org-id: <orgId>
{
  "originalName": "paper.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 123456,
  "checksum": "abc123"
}

# Watch worker logs to see AI processing
```

### Test Admin Workflow

```bash
# 1. Login as admin
POST /auth/login
{
  "email": "admin@example.com",
  "name": "Admin User"
}

# 2. View AI report
GET /admin/submissions/<submissionId>/ai
Authorization: Bearer <token>
x-org-id: <orgId>

# 3. List all reports
GET /admin/ai/reports?conferenceId=<conferenceId>
Authorization: Bearer <token>
x-org-id: <orgId>

# 4. List flagged submissions
GET /admin/ai/reports?conferenceId=<conferenceId>&flagged=true
Authorization: Bearer <token>
x-org-id: <orgId>

# 5. Manually trigger AI
POST /admin/submissions/<submissionId>/ai/run
Authorization: Bearer <token>
x-org-id: <orgId>

# 6. Check queue stats
GET /admin/ai/queue-stats
Authorization: Bearer <token>
x-org-id: <orgId>
```

## 6. Verify Everything Works

### Check Logs

**API Server logs should show:**
```
✓ Redis connected for BullMQ
✓ AI analysis job enqueued
```

**Worker logs should show:**
```
✓ Worker connected to MongoDB
✓ AI worker started successfully
✓ Processing AI analysis job
✓ Downloading PDF from storage
✓ Extracting text from PDF
✓ Generating AI summary
✓ Running format checks
✓ Computing similarity
✓ Saving AI report results
✓ AI analysis job completed successfully
```

### Check Database

```javascript
// MongoDB shell or Compass
use easychair

// Check consent records
db.consentrecords.find()

// Check AI reports
db.aireports.find()

// Check queue jobs (Redis)
// redis-cli
KEYS bull:ai-analysis:*
```

## 7. Troubleshooting

### Worker not processing jobs

```bash
# Check worker is running
ps aux | grep aiWorker

# Restart worker
npm run worker
```

### Redis connection errors

```bash
# Check Redis is running
docker ps | grep redis

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker logs easychair-redis
```

### OpenAI API errors

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Check .env file
cat .env | grep OPENAI_API_KEY

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### No AI reports generated

**Check:**
1. ✅ Consent was granted
2. ✅ AI is enabled in conference settings
3. ✅ Worker is running
4. ✅ OpenAI API key is valid
5. ✅ Redis is connected
6. ✅ File was uploaded successfully

**Debug:**
```bash
# Check worker logs for errors
npm run worker

# Check API logs for enqueue confirmation
npm run dev

# Check AIReport status in database
db.aireports.find({ status: "FAILED" })
```

## 8. Frontend Integration

See [AI_ANALYSIS_GUIDE.md](AI_ANALYSIS_GUIDE.md) for:
- Complete API documentation
- React/Vue component examples
- Error handling patterns
- UI/UX recommendations

## 9. Production Deployment

Before deploying to production:

1. ✅ Set strong `JWT_SECRET`
2. ✅ Enable Redis password authentication
3. ✅ Use production OpenAI API key
4. ✅ Set up log aggregation (e.g., CloudWatch, Datadog)
5. ✅ Configure alerting for failed jobs
6. ✅ Set up horizontal scaling for workers
7. ✅ Enable HTTPS/SSL
8. ✅ Set appropriate `AI_WORKER_CONCURRENCY`
9. ✅ Configure rate limiting on API endpoints
10. ✅ Set up cost monitoring for OpenAI usage

## 10. Cost Optimization

**Development:**
- Use GPT-3.5-turbo instead of GPT-4 (100x cheaper)
- Set `runMode: "manual_only"` to avoid auto-triggers
- Limit corpus size for similarity checks

**Production:**
- Monitor OpenAI usage via API dashboard
- Cache embeddings for frequently compared papers
- Consider self-hosted models for high volume
- Implement rate limiting per user/org

## Need Help?

📚 **Full Documentation:** [AI_ANALYSIS_GUIDE.md](AI_ANALYSIS_GUIDE.md)  
📖 **Implementation Details:** [STEP3_IMPLEMENTATION_SUMMARY.md](STEP3_IMPLEMENTATION_SUMMARY.md)  
🚀 **Main README:** [README.md](README.md)

---

**Status:** ✅ Ready for Development and Testing

All components implemented and tested. Start building your frontend integration! 🎉

# 🕷️ Autonomous Web Crawler

An AI-powered web crawler that autonomously explores websites and maps their structure, content, and functionality.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
# or
pnpm install
```

### Build the Project
```bash
npm run build
```

### Crawl Any Website
```bash
# Basic crawl with default depth (2)
npm run crawl https://example.com

# Crawl with custom depth
npm run crawl https://shop.example.com 3

# Crawl documentation site with shallow depth  
npm run crawl https://docs.example.com 1
```

## 📖 Usage Examples

### E-commerce Site
```bash
npm run crawl https://shop.mystore.com 4
```
The crawler will discover:
- Product categories and listings
- Individual product pages
- Shopping cart and checkout flows
- Search functionality
- User account areas

### Business Website
```bash
npm run crawl https://mybusiness.com 2
```
The crawler will analyze:
- Navigation structure
- Service/feature pages
- Contact forms
- About sections
- Blog/news content

### Documentation Site
```bash
npm run crawl https://docs.myapi.com 1
```
Perfect for:
- API documentation
- Getting started guides
- Reference materials
- Tutorial structures

## 🎯 What the Crawler Discovers

✅ **Navigation Structure** - All menus, links, and site hierarchy  
✅ **Page Types** - Landing, product, category, form, and content pages  
✅ **Interactive Elements** - Forms, buttons, search, filters  
✅ **User Flows** - Registration, login, checkout, onboarding  
✅ **Content Patterns** - Repeated structures and templates  
✅ **Cross-references** - Internal linking and relationships  

## 📊 Output & Results

After crawling, you'll find comprehensive results in the `runs/` directory:

```
runs/
└── crawl_YYYY-MM-DD_[id]/
    ├── sitemap.json          # Complete site structure
    ├── summary-report.json   # Executive summary
    ├── artifacts/            # Raw data and analysis
    └── logs/                 # Detailed crawl logs
```

## ⚙️ Configuration

The crawler automatically optimizes for each site but you can adjust:

- **Max Depth**: How deep to crawl (1-5 recommended)
- **Pages per Feature**: Limits per section (auto-optimized)
- **Pattern Detection**: Identifies repeated page structures
- **Form Interaction**: Analyzes but doesn't submit forms

## 🧠 AI-Powered Features

- **Intelligent Navigation**: AI decides where to explore next
- **Content Understanding**: Recognizes page purposes and structures  
- **Pattern Recognition**: Identifies templates and repeated elements
- **Adaptive Exploration**: Adjusts strategy based on site type
- **Comprehensive Mapping**: Creates detailed site architecture

## 🔒 Safe & Respectful

- **Read-only**: Never submits forms or modifies data
- **Rate Limited**: Respects server resources
- **Permission Aware**: Stops at login walls and restricted areas
- **Privacy Focused**: No personal data collection

## 📝 Command Reference

```bash
# Show help
npm run crawl

# Basic crawl
npm run crawl <URL>

# Custom depth
npm run crawl <URL> <depth>

# Build project
npm run build

# Development mode
npm run dev
```

## 🆘 Troubleshooting

**Build Issues**: Run `npm run clean` then `npm run build`  
**Permission Errors**: Ensure you have read access to the target website  
**Slow Performance**: Try reducing max depth or target smaller sites first  
**Memory Issues**: Increase Node memory: `export NODE_OPTIONS="--max-old-space-size=4096"`

## Prerequisites

- Node.js 18+
- npm or pnpm
- TogetherAI API key (for AI models)

## Installation

1. **Clone and setup the project:**

```bash
npm install
cp .env.example .env
```

2. **Configure environment variables:**

Edit `.env` with your credentials:

```env
TOGETHER_API_KEY=your_together_api_key
```

**Getting a TogetherAI API Key:**
1. Go to https://www.together.ai/
2. Sign up for an account
3. Navigate to API Keys in your dashboard
4. Generate a new API key
5. Copy it to your `.env` file

3. **Install Playwright browsers:**

```bash
npx playwright install
```

---

**Ready to explore? Start with:** `npm run crawl https://example.com`

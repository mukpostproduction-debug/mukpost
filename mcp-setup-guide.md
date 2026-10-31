# Antigravity MCP Setup Guide — `mcp-seo` & `mcp-gsc`

This guide provides the exact JSON configuration to register **`sparrow84001/mcp-seo`** (Technical SEO, AEO & GEO Growth Auditor) and **`AminForou/mcp-gsc`** (Google Search Console MCP Server) in your Antigravity (`agy`) MCP settings.

> **Note:** `sparrow84001/mcp-seo` has already been cloned locally for you at:
> `/Users/jacksonmcmurdo/Desktop/Muk_Post/06_STUDIO_SOFTWARE_&_LABS/mcp-seo`

---

## 1. Exact Antigravity MCP Configuration (`mcp_config.json`)

Add the following two server blocks (`seo-growth-auditor` and `mcp-search-console`) to your global Antigravity MCP config at `~/.gemini/antigravity/mcp_config.json` (or workspace `.agy/mcp.json`):

```json
{
  "mcpServers": {
    "seo-growth-auditor": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/Users/jacksonmcmurdo/Desktop/Muk_Post/06_STUDIO_SOFTWARE_&_LABS/mcp-seo/src/index.ts"
      ]
    },
    "mcp-search-console": {
      "command": "uvx",
      "args": [
        "mcp-search-console"
      ],
      "env": {
        "GSC_OAUTH_CLIENT_SECRETS_FILE": "/Users/jacksonmcmurdo/Desktop/Muk_Post/02_BUSINESS_&_OPERATIONS/APPLY_AGENT/credentials/gsc_client_secrets.json",
        "GSC_CREDENTIALS_PATH": "/Users/jacksonmcmurdo/Desktop/Muk_Post/02_BUSINESS_&_OPERATIONS/APPLY_AGENT/credentials/gsc_service_account.json",
        "GSC_DATA_STATE": "all"
      }
    }
  }
}
```

*(If you have `bun` installed, you can also run `seo-growth-auditor` with `"command": "bun", "args": ["/Users/jacksonmcmurdo/Desktop/Muk_Post/06_STUDIO_SOFTWARE_&_LABS/mcp-seo/src/index.ts"]`.)*

---

## 2. One-Time Dependencies & Auth Setup

### A. Install dependencies for `sparrow84001/mcp-seo`
```bash
cd "/Users/jacksonmcmurdo/Desktop/Muk_Post/06_STUDIO_SOFTWARE_&_LABS/mcp-seo"
npm install
```

### B. Authenticate `AminForou/mcp-gsc` with Google Search Console (`sc-domain:mukpost.com`)
1. In Google Cloud Console → **APIs & Services** → **Library**, enable **Google Search Console API**.
2. Go to **Credentials** → **Create Credentials** → **OAuth client ID** → **Desktop app** and save to `/Users/jacksonmcmurdo/Desktop/Muk_Post/02_BUSINESS_&_OPERATIONS/APPLY_AGENT/credentials/gsc_client_secrets.json`.
3. On first tool call in Antigravity, authorize `mcmurdo.jackson@gmail.com` for `sc-domain:mukpost.com`.


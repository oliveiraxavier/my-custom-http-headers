# How to send to Addons Mozilla

```bash
cd firefox 
export WEB_EXT_API_KEY=""
export WEB_EXT_API_SECRET=""
web-ext build
web-ext sign --api-key $WEB_EXT_API_KEY \
--api-secret $WEB_EXT_API_SECRET \
--amo-metadata metadata.json \
--source-dir . --channel listed # or unlisted
```

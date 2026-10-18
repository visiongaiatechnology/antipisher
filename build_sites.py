"""
VGT Antipisher: Site Database Builder
Generates shared/sites.js and sites-100.json with the curated brand/official-domain map
(187 brands). Enforces that shared-hosting / public-suffix roots are never listed as
exclusive official domains (they would whitelist customer-controlled subdomains).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Roots where customers, not the brand, own the subdomain. Listing one of these as an
# "official domain" would make every tenant URL look official (e.g. paypal.force.com).
SHARED_HOST_ROOTS = {
    'github.io', 'gitlab.io', 'pages.dev', 'vercel.app', 'webflow.io', 'netlify.app',
    'firebaseapp.com', 'blogspot.com', 'wordpress.com', 'myshopify.com',
    'azurewebsites.net', 'cloudfront.net', 's3.amazonaws.com', 'force.com',
    'my.salesforce.com', 'my.site.com', 'notion.site',
}

raw = """
Google|google|google.com google.de google.co.uk google.fr google.es google.it google.ca google.com.br google.co.in google.com.au google.ch google.at googleapis.com google.github.io google.co.jp google.co.kr google.com.mx google.com.ar google.co.za google.com.sg google.co.id google.se google.nl google.pl google.be google.com.tr
YouTube|youtube|youtube.com youtu.be
Facebook|facebook|facebook.com fb.com facebook.github.io
Instagram|instagram|instagram.com
WhatsApp|whatsapp|whatsapp.com whatsapp.net
TikTok|tiktok|tiktok.com
X (Twitter)|twitter|twitter.com x.com
Threads|threads|threads.net
Bluesky|bluesky|bsky.app bsky.social
Reddit|reddit|reddit.com redd.it
Wikipedia|wikipedia|wikipedia.org wikimedia.org wikipedia.de
Amazon|amazon|amazon.com amazon.de amazon.co.uk amazon.fr amazon.es amazon.it amazon.ca amazon.in amazon.co.jp amazon.com.au amazon.com.br aws.amazon.com amazon.se amazon.nl amazon.pl amazon.sg amazon.ae amazon.com.mx amazon.com.tr
Apple|apple|apple.com apple.de apple.news icloud.com apple.com.cn apple.co.uk apple.fr apple.it apple.es apple.ca apple.com.au
Microsoft|microsoft|microsoft.com microsoftonline.com live.com microsoft.github.io microsoft.co.jp microsoft.de microsoft.co.uk microsoft.fr microsoft.es microsoft.it microsoft.ca microsoft.com.au
Bing|bing|bing.com
Outlook|outlook|outlook.com outlook.live.com
Microsoft 365|office|office.com office365.com
GitHub|github|github.com github.blog
GitLab|gitlab|gitlab.com
Bitbucket|bitbucket|bitbucket.org
LinkedIn|linkedin|linkedin.com
Netflix|netflix|netflix.com
Twitch|twitch|twitch.tv
Discord|discord|discord.com discord.gg
Telegram|telegram|telegram.org t.me
Signal|signal|signal.org
Pinterest|pinterest|pinterest.com pinterest.co.uk pinterest.de pinterest.fr
Snapchat|snapchat|snapchat.com
Spotify|spotify|spotify.com
Steam|steam|steampowered.com steamcommunity.com
Epic Games|epicgames|epicgames.com unrealengine.com
Roblox|roblox|roblox.com
PlayStation|playstation|playstation.com sonyentertainmentnetwork.com
Xbox|xbox|xbox.com
Nintendo|nintendo|nintendo.com nintendo.de nintendo.co.jp
eBay|ebay|ebay.com ebay.de ebay.co.uk
PayPal|paypal|paypal.com paypal.me
AliExpress|aliexpress|aliexpress.com alibaba.com
Temu|temu|temu.com
SHEIN|shein|shein.com
Booking.com|booking|booking.com
Airbnb|airbnb|airbnb.com airbnb.de
Uber|uber|uber.com
Lyft|lyft|lyft.com
Target|target|target.com
Walmart|walmart|walmart.com walmart.ca walmart.com.mx
Best Buy|bestbuy|bestbuy.com bestbuy.ca
Etsy|etsy|etsy.com
Shopify|shopify|shopify.com
Cloudflare|cloudflare|cloudflare.com
Fastly|fastly|fastly.com
Dropbox|dropbox|dropbox.com
Box|box|box.com
Zoom|zoom|zoom.us zoom.com
Notion|notion|notion.so notion.com
Slack|slack|slack.com
Canva|canva|canva.com
Adobe|adobe|adobe.com
Figma|figma|figma.com
OpenAI|openai|openai.com
ChatGPT|chatgpt|chatgpt.com
Claude|claude|claude.ai anthropic.com
Gemini|gemini|gemini.google.com
Perplexity|perplexity|perplexity.ai
DeepSeek|deepseek|deepseek.com
Hugging Face|huggingface|huggingface.co
Midjourney|midjourney|midjourney.com
Cursor|cursor|cursor.com cursor.sh
Atlassian|atlassian|atlassian.com jira.com trello.com
Asana|asana|asana.com
Monday.com|monday|monday.com
Stack Overflow|stackoverflow|stackoverflow.com stackexchange.com
npm|npm|npmjs.com
PyPI|pypi|pypi.org
Docker|docker|docker.com docker.io
WordPress.com|wordpress|wordpress.org
Medium|medium|medium.com
Substack|substack|substack.com
Quora|quora|quora.com
Yahoo|yahoo|yahoo.com yahoo.de yahoo.co.jp
Yandex|yandex|yandex.ru yandex.com
Baidu|baidu|baidu.com
Weibo|weibo|weibo.com
VK|vk|vk.com
Mail.ru|mailru|mail.ru
Naver|naver|naver.com
LINE|line|line.me
Rakuten|rakuten|rakuten.co.jp
Mercado Libre|mercadolibre|mercadolibre.com mercadolibre.com.mx mercadolivre.com.br
Zalando|zalando|zalando.de zalando.com
Otto|otto|otto.de
Samsung|samsung|samsung.com
Huawei|huawei|huawei.com
Xiaomi|xiaomi|xiaomi.com
NVIDIA|nvidia|nvidia.com
Intel|intel|intel.com
AMD|amd|amd.com
Sony|sony|sony.com sony.de
Dell|dell|dell.com
Lenovo|lenovo|lenovo.com
HP|hp|hp.com
Asus|asus|asus.com
Salesforce|salesforce|salesforce.com
Oracle|oracle|oracle.com
SAP|sap|sap.com
IBM|ibm|ibm.com
Cisco|cisco|cisco.com
DigitalOcean|digitalocean|digitalocean.com
Hetzner|hetzner|hetzner.com hetzner.de
Vercel|vercel|vercel.com
Netlify|netlify|netlify.com
DHL|dhl|dhl.com dhl.de dhl.co.uk dhl.fr dhl.es dhl.it
FedEx|fedex|fedex.com
UPS|ups|ups.com
USPS|usps|usps.com
Deutsche Post|deutschepost|deutschepost.de
Hermes|hermes|myhermes.de hermesworld.com hermes.com
DPD|dpd|dpd.com dpd.de
GLS|gls|gls-group.com gls-pakete.de gls.de
Deutsche Bank|deutschebank|deutsche-bank.de db.com
Sparkasse|sparkasse|sparkasse.de sparkasse.at
Postbank|postbank|postbank.de
Comdirect|comdirect|comdirect.de
ING|ing|ing.de ing.com ing.nl ing.be ing.lu
Commerzbank|commerzbank|commerzbank.de
DKB|dkb|dkb.de
N26|n26|n26.com
Targobank|targobank|targobank.de
Sparda-Bank|sparda|sparda.de
Hanseatic Bank|hanseatic|hanseaticbank.de
PSD Bank|psd|psd-bank.de
AOK|aok|aok.de
Techniker Krankenkasse|tk|tk.de
Deutsche Rentenversicherung|rentenversicherung|deutsche-rentenversicherung.de
Check24|check24|check24.de
ImmobilienScout24|immobilienscout24|immobilienscout24.de
Immoscout24|immoscout24|immoscout24.de
Kleinanzeigen|kleinanzeigen|kleinanzeigen.de
Arbeitsagentur|arbeitsagentur|arbeitsagentur.de
Bawag|bawag|bawag.at bawaggroup.com
Raiffeisen|raiffeisen|raiffeisen.at
SBB|sbb|sbb.ch
Swisscom|swisscom|swisscom.ch
Finanzamt|finanzamt|finanzamt.de
Volksbank Raiffeisenbank|volksbank|vr.de volksbank.de vr-bank.de
Consorsbank|consorsbank|consorsbank.de
Trade Republic|traderepublic|traderepublic.com
Scalable Capital|scalable|scalable.capital
Klarna|klarna|klarna.com klarna.de
Revolut|revolut|revolut.com
Wise|wise|wise.com
Stripe|stripe|stripe.com
Adyen|adyen|adyen.com
Square (Block)|squareup|squareup.com block.xyz
Coinbase|coinbase|coinbase.com coinbase.de
Binance|binance|binance.com
Kraken|kraken|kraken.com
OKX|okx|okx.com
Bybit|bybit|bybit.com
KuCoin|kucoin|kucoin.com
Crypto.com|cryptocom|crypto.com
MetaMask|metamask|metamask.io
Ledger|ledger|ledger.com
Trezor|trezor|trezor.io
Bitpanda|bitpanda|bitpanda.com
Uniswap|uniswap|uniswap.org
OpenSea|opensea|opensea.io
Chase|chase|chase.com chase.co.uk
Bank of America|bankofamerica|bankofamerica.com
Wells Fargo|wellsfargo|wellsfargo.com
Citi|citi|citi.com citibank.com
HSBC|hsbc|hsbc.com hsbc.co.uk hsbc.co.jp hsbc.com.hk
Barclays|barclays|barclays.com barclays.co.uk
Santander|santander|santander.com santander.de santander.co.uk santander.com.mx santander.com.br
American Express|americanexpress|americanexpress.com amex.com
Visa|visa|visa.com visa.de visa.co.uk visa.co.jp visa.fr visa.es visa.it visa.ca visa.com.au visa.at visa.ch
Mastercard|mastercard|mastercard.com
Telekom|telekom|telekom.de t-online.de telekom.com
Vodafone|vodafone|vodafone.de vodafone.com vodafone.co.uk vodafone.it vodafone.es vodafone.nl vodafone.ie
O2 Telefonica|o2online|o2online.de telefonica.de
Elster|elster|elster.de elster.com
BundID|bundid|id.bund.de bund.de
Gov.uk|govuk|gov.uk
Gmail|gmail|gmail.com
Azure|azure|azure.com portal.azure.com
Disney+|disneyplus|disneyplus.com disney.com
Alipay|alipay|alipay.com
""".strip()

records = []
for line in raw.splitlines():
    line = line.strip()
    if not line or line.startswith('#'):
        continue
    name, brand, hosts = line.split('|')
    records.append(dict(name=name.strip(), brand=brand.strip(), domains=hosts.split()))

print(f"Total curated brands: {len(records)}")
assert len(records) >= 165, f"Expected >= 165 brands, got {len(records)}"
brands = [r['brand'] for r in records]
assert len(brands) == len(set(brands)), f"Duplicate brand found: {[b for b in brands if brands.count(b) > 1]}"

# Data-integrity guard: never treat a shared-hosting root as an exclusive brand domain.
for r in records:
    for domain in r['domains']:
        assert domain not in SHARED_HOST_ROOTS, (
            f"Shared-host root listed as official domain: {r['name']} -> {domain}"
        )

all_domains = [d for r in records for d in r['domains']]
assert len(all_domains) == len(set(all_domains)), "Duplicate official domain across brands"

# Write to shared/sites.js and sites-100.json
sites_js_content = (
    "/* Curated high-usage and high-risk phishing-targeted services. */\n"
    "globalThis.VGT_SITES = " + json.dumps(records, ensure_ascii=False, indent=2) + ";\n"
)
(ROOT / 'shared/sites.js').write_text(sites_js_content, encoding='utf-8')
(ROOT / 'sites-100.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print("Successfully generated shared/sites.js and sites-100.json")

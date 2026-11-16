# Liquidation Lens — সেটআপ গাইড

এটি CoinGlass-এর অফিসিয়াল API ব্যবহার করে liquidation heatmap দেখানোর একটি ছোট ওয়েব অ্যাপ। Heatmap-এর সঙ্গে price candles, বর্তমান দামের তুলনায় উপরের/নিচের liquidation concentration, percentage distance এবং সহজ market summary দেখায়।

## কী লাগবে

1. Node.js 18 বা তার পরের সংস্করণ।
2. BTCUSDT ও ETHUSDT-এর পাশাপাশি XAUUSDT (Gold) নির্বাচন করা যাবে; তবে CoinGlass-এর নির্বাচিত exchange/plan-এ XAUUSDT heatmap সমর্থিত না হলে Live Heatmap আসবে না।
2. CoinGlass API key এবং এমন API subscription যাতে Futures Liquidation Heatmap Model 1/2/3 ব্যবহার করা যায়। CoinGlass-এর বর্তমান API ডকুমেন্টেশন অনুযায়ী এই heatmap endpoint-গুলির জন্য Professional বা Enterprise plan প্রয়োজন।

## মার্কেট সমর্থন

BTCUSDT ও ETHUSDT সাধারণত Futures heatmap-এর জন্য উপযোগী crypto perpetual pair। XAUUSDT-এর availability exchange-ভেদে আলাদা; Gold spot/Forex-এর liquidation data একক কেন্দ্রীয় order book থেকে পাওয়া যায় না। XAUUSDT-এর API request ব্যর্থ হলে অন্য symbol-এ বদলাও—Demo Preview-কে কখনো live data ভেবো না।

## নিজের কম্পিউটারে চালানোর নিয়ম

1. এই ZIP ফাইল Extract করো।
2. Node.js ইনস্টল করো: https://nodejs.org/
3. CoinGlass থেকে নিজের API key নাও: https://www.coinglass.com/api
4. প্রজেক্ট ফোল্ডারের `.env.example` ফাইলটির কপি করে নাম দাও `.env`।
5. `.env` খুলে `COINGLASS_API_KEY=`-এর পরে নিজের API key বসাও। যেমন:

   `COINGLASS_API_KEY=তোমার_নিজের_API_KEY`

6. Windows-এ `start-windows.bat`-এ ডাবল-ক্লিক করো। Mac/Linux-এ টার্মিনালে `./start-mac-linux.sh` চালাও। অথবা ফোল্ডারে টার্মিনাল খুলে `node server.js` চালাও।
7. ব্রাউজারে `http://localhost:3000` খোলো।

**প্রথমে API key না থাকলেও Preview demo চালানো যাবে।** Demo-র তথ্য কৃত্রিম; সেটিকে live market data মনে করবে না।

## অনলাইনে প্রকাশ

এই প্রজেক্টটি Node.js সমর্থিত hosting-এ deploy করতে হবে। Start command: `node server.js`। Hosting-এর Environment Variables/Secrets অংশে `COINGLASS_API_KEY` যোগ করবে। API key কখনো `public/app.js`, HTML, screenshot, GitHub বা সবার দেখা যায় এমন জায়গায় রেখো না।

## কীভাবে পড়বে

- **Price-এর উপরে:** সাধারণভাবে short liquidation-এর modelled concentration।
- **Price-এর নিচে:** সাধারণভাবে long liquidation-এর modelled concentration।
- **Heatmap-এর উজ্জ্বল অংশ:** নির্বাচিত map-এর মধ্যে তুলনামূলক বেশি modelled intensity।
- **Liquidity skew:** উপরে ও নিচে থাকা map-value-র যোগফলের তুলনা। এটি probability বা price-direction forecast নয়।

Liquidation zone কোনো নিশ্চিত target নয়। নিজের market structure, volume, open interest, stop-loss ও risk management-এর সঙ্গে মিলিয়ে দেখবে।

## নিরাপত্তা ও ব্যবহারের সীমা

- `.env` ফাইলে API key রাখবে; এটি অন্য কাউকে পাঠাবে না।
- অ্যাপটি ১০ সেকেন্ডের জন্য একই request cache করে এবং Auto refresh ডিফল্টে বন্ধ থাকে।
- CoinGlass-এর API plan, rate limit ও Terms of Service মেনে ব্যবহার করবে। Commercial/public redistribution-এর আগে CoinGlass-এর কাছ থেকে প্রয়োজনীয় অধিকার নিশ্চিত করবে।

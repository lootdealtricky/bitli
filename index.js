import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* =========================
   CORE UNSHORT FUNCTION
========================= */
async function unshort(url, depth = 0) {
    if (depth > 5) return url; // safety limit

    try {
        const response = await axios.get(url, {
            maxRedirects: 0,
            validateStatus: null,
            headers: {
                "User-Agent": "Mozilla/5.0"
            }
        });

        // 301 / 302 redirect
        if (response.status >= 300 && response.status < 400 && response.headers.location) {
            const nextUrl = response.headers.location;
            return await unshort(nextUrl, depth + 1);
        }

        // Check meta refresh
        const html = response.data;
        const $ = cheerio.load(html);

        const meta = $('meta[http-equiv="refresh"]').attr("content");
        if (meta) {
            const match = meta.match(/url=(.*)/i);
            if (match && match[1]) {
                return await unshort(match[1], depth + 1);
            }
        }

        // Check JS redirect
        const scripts = $("script").html();
        if (scripts) {
            const match = scripts.match(/window\.location\.href\s*=\s*['"](.*?)['"]/);
            if (match && match[1]) {
                return await unshort(match[1], depth + 1);
            }
        }

        return url;

    } catch (error) {
        return url;
    }
}

/* =========================
   API ROUTE
========================= */
app.post("/unshort", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "URL required" });
    }

    const finalUrl = await unshort(url);
    res.json({
        original: url,
        unshorted: finalUrl
    });
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
    res.send("Unshort Service Running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

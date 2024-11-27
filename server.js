const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())
app.use(bodyParser.json());

// Route to generate business names and check domain availability
app.post("/api/generate-names", async (req, res) => {
    console.log("Request received:", req.body); // Debug log
  const { keyword } = req.body;

  if (!keyword) {
    return res.status(400).json({ error: "Keyword is required" });
  }

  try {
    res.json({ message: "API is working!" }); // Temporary response for testing

    // Step 1: Generate business names using Google Gemini API
    const geminiResponse = await axios.post(
      `https://gemini.google.com/v1/generate-names`,
      { keyword },
      {
        headers: { Authorization: `Bearer ${process.env.GOOGLE_GEMINI_API_KEY}` },
      }
    );

    const names = geminiResponse.data.names || [];

    // Step 2: Check domain availability using WhoisXML API
    const domainPromises = names.map((name) =>
      axios.get(process.env.WHOISXML_BASE_URL, {
        params: {
          apiKey: process.env.WHOISXML_API_KEY,
          domainName: `${name}.com`,
          outputFormat: "JSON",
        },
      })
    );

    const domainResponses = await Promise.all(domainPromises);

    // Parse the results
    const results = names.map((name, index) => {
      const domainData = domainResponses[index].data;
      const isAvailable =
        domainData && domainData.WhoisRecord && domainData.WhoisRecord.dataError === "MISSING_WHOIS_DATA";

      return {
        name,
        domainStatus: isAvailable ? "Available" : "Not Available",
      };
    });

    res.json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate names or check domains" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

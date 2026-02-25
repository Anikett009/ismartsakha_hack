const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();


const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected ✅"))
    .catch(err => console.log(err));

// Farmer Schema
const farmerSchema = new mongoose.Schema({
    name: String,
    username: { type: String, unique: true },
    password: String,
    state: String,
    district: String,
    crops: [String]
});

const Farmer = mongoose.model("Farmer", farmerSchema);


// ================= SIGN UP =================
app.post("/signup", async (req, res) => {
    try {
        const { name, username, password, state, district, crops } = req.body;

        const existingUser = await Farmer.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newFarmer = new Farmer({
            name,
            username,
            password: hashedPassword,
            state,
            district,
            crops
        });

        await newFarmer.save();

        res.json({ message: "Account created successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});


// ================= LOGIN =================
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const farmer = await Farmer.findOne({ username });
        if (!farmer) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, farmer.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        res.json({ message: "Login successful", farmer });

    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

const { MongoClient } = require("mongodb");
const { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");

// MongoDB Atlas Client for Vector Search
const mongoClient = new MongoClient(process.env.MONGO_URI);
let vectorStore;

mongoClient.connect().then(() => {
    const database = mongoClient.db("farmerDB");
    const collection = database.collection("schemes");

    vectorStore = new MongoDBAtlasVectorSearch(
        new GoogleGenerativeAIEmbeddings({
            modelName: "gemini-embedding-001",
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        }),
        {
            collection: collection,
            indexName: "vector_index",
            textKey: "text",
            embeddingKey: "embedding",
        }
    );
    console.log("Vector Store Initialized ✅");
}).catch(err => console.error("Vector Store Error:", err));


// ================= RAG ELIGIBILITY CHECK =================
app.post("/api/check-eligibility", async (req, res) => {
    try {
        const { state, district, landholding, crop, category } = req.body;

        if (!vectorStore) {
            return res.status(500).json({ status: "Error", message: "Vector store not initialized yet." });
        }

        // 1. Construct the search query
        const query = `Eligibility criteria scheme benefits agriculture for farmer in ${state} with ${landholding} hectares farming ${crop} category ${category}`;
        console.log("Retrieving documents for query:", query);

        // 2. Retrieve relevant documents (chunks)
        const retrievedDocs = await vectorStore.similaritySearch(query, 4);
        const contextText = retrievedDocs.map(doc => doc.pageContent).join("\n\n");

        if (!contextText.trim()) {
            return res.json({
                status: "Unknown",
                reason: "No relevant scheme documents found in the database.",
                citation: "None"
            });
        }

        // 3. Generate response with LLM
        const llm = new ChatGoogleGenerativeAI({
            model: "gemini-2.5-flash",
            apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
            temperature: 0,
        });

        const prompt = `
You are an expert AI eligibility engine for Indian agricultural schemes.
Based ONLY on the provided Context text below, determine if the farmer is eligible.

Farmer Profile:
- State: ${state || "Not provided"}
- District: ${district || "Not provided"}
- Landholding: ${landholding || 0} hectares
- Crop: ${crop || "Not provided"}
- Category: ${category || "General"}

Context (Excerpts from official schemes):
---
${contextText}
---

Your response MUST be valid JSON containing exactly these three fields:
{
  "status": "Eligible" or "Not Eligible" or "Unknown",
  "reason": "A 1-2 sentence explanation of why they are or are not eligible based on the rules, combining their profile and the rules.",
  "citation": "Quote the exact rule or condition from the text that proves your decision, or say 'None'."
}`;

        console.log("Prompting LLM...");
        const response = await llm.invoke(prompt);
        let rawAnswer = response.content.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log("LLM Response:", rawAnswer);
        const jsonResponse = JSON.parse(rawAnswer);

        res.json(jsonResponse);
    } catch (error) {
        console.error("Error in /api/check-eligibility:", error);
        res.status(500).json({ status: "Error", reason: "Internal server error connecting to AI engine.", citation: "None", errorDetails: error.stack || error.toString() });
    }
});


app.listen(5000, () => console.log("Server running on port 5000 🚀"));

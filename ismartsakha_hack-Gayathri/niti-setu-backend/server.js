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

app.listen(5000, () => console.log("Server running on port 5000 🚀"));

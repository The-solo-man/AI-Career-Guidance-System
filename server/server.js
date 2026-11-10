const express = require("express");
const mongoose = require("mongoose");
const {
    searchCareerKnowledge
} = require("./services/careerKnowledgeService");
const cors = require("cors");
require("dotenv").config();
const multer = require("multer");
const {
    generateCareerEmbeddings
} = require("./services/generateCareerEmbeddings");
const {
    extractResumeText,
    analyzeResume,
    getCareerAlignment
} = require("./services/resumeService");
const {
    generateInterviewQuestion,
    evaluateInterviewAnswer,
    generateInterviewReport
} = require("./services/interviewService");


const Student = require("./models/student");
const StudentAccount = require("./models/StudentAccount");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const StudentProgress = require("./models/StudentProgress");

const {
    getCareerGuidance,
    validateStudentProfile,
    chatWithCareerAgent
} = require("./services/aiservice");
const {
    searchLearningResources
} = require("./mcp/learningResourceClient");

const app = express();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});


// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());
app.use(express.json());


// ========================================
// REQUEST LOGGER
// ========================================

app.use((req, res, next) => {

    console.log("\n========================================");
    console.log("REQUEST RECEIVED");
    console.log("Method:", req.method);
    console.log("URL:", req.url);
    console.log("========================================");

    next();
});


// ========================================
// TEST ROUTE
// ========================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "AI Career Guidance Backend is running!"
    });

});
// ========================================
// STUDENT REGISTRATION API
// ========================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email and password."
            });
        }
        console.log("REGISTER PASSWORD LENGTH:", password.length);
        if (password.length < 4) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 4 characters."
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Check existing account
        const existingAccount = await StudentAccount.findOne({
            email: normalizedEmail
        });

        if (existingAccount) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create account
        const newAccount = await StudentAccount.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword
        });

        // Generate JWT token
        const token = jwt.sign(
            { sub: newAccount._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            token,
            account: {
                id: newAccount._id,
                name: newAccount.name,
                email: newAccount.email
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});
// ========================================
// STUDENT LOGIN API
// ========================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password."
            });
        }

        // Find account
        const normalizedEmail = email.trim().toLowerCase();

        const account = await StudentAccount.findOne({
            email: normalizedEmail
        });

        if (!account) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(
            password,
            account.password
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { sub: account._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            account: {
                id: account._id,
                name: account.name,
                email: account.email,
                studentId: account.studentId
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});
// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

const authenticateStudent = async (req, res, next) => {
    try {
        // Get token from request header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Please log in to continue."
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Find logged-in account
        const account = await StudentAccount.findById(decoded.sub)
            .select("-password");

        if (!account) {
            return res.status(401).json({
                success: false,
                message: "Student account not found."
            });
        }

        // Attach account to request
        req.account = account;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired login session. Please log in again."
        });
    }
};
// ========================================
// GET LOGGED-IN STUDENT ACCOUNT
// ========================================

app.get("/api/auth/me", authenticateStudent, async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            account: {
                id: req.account._id,
                name: req.account.name,
                email: req.account.email,
                studentId: req.account.studentId
            }
        });

    } catch (error) {
        console.error("Account retrieval error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve student account."
        });
    }
});
// ============================================
// RESUME UPLOAD & TEXT EXTRACTION
// ============================================

app.post("/api/resume/upload", upload.single("resume"), async (req, res) => {
    try {
        console.log("\n========================================");
        console.log("📄 RESUME UPLOAD");
        console.log("========================================");

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload a resume."
            });
        }

        console.log("📄 File:", req.file.originalname);
        console.log("📦 Size:", req.file.size, "bytes");

        const resumeText = await extractResumeText(req.file);
        const recommendedCareer = req.body.recommendedCareer || "";

        console.log("🎯 Recommended Career:", recommendedCareer);
        console.log("🤖 Sending resume to Gemini...");

        const resumeAnalysis = await analyzeResume(resumeText);

        console.log("✅ Resume analysis completed");

        const careerAlignment = null;


        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({
                success: false,
                message: "Could not extract enough readable text from the resume."
            });
        }

        console.log("✅ Resume text extracted successfully");
        console.log("📝 Characters:", resumeText.length);

        return res.status(200).json({
            success: true,
            message: "Resume analyzed successfully.",
            fileName: req.file.originalname,
            resumeText,
            resumeAnalysis,
            careerAlignment
        });

    } catch (error) {
        console.error("❌ Resume upload error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to process resume."
        });
    }
});
// MCP Learning Resources API
app.post("/api/learning-resources/search", async (req, res) => {
    try {
        const { career, skills, category, level } = req.body;

        if (!career || typeof career !== "string" || !career.trim()) {
            return res.status(400).json({
                success: false,
                message: "Career name is required."
            });
        }

        const results = await searchLearningResources({
            career: career.trim(),
            skills: Array.isArray(skills) ? skills : [],
            category: category || "all",
            level: level || "beginner"
        });

        return res.status(200).json({
            success: true,
            results
        });

    } catch (error) {
        console.error("Learning Resources MCP Error:", error.message);

        const quotaError = /429|quota|RESOURCE_EXHAUSTED/i.test(error.message);

        return res.status(quotaError ? 429 : 500).json({
            success: false,
            message: quotaError
                ? "Learning resource search is temporarily unavailable because the Gemini search quota has been reached. Please try again later."
                : "Failed to fetch learning resources."
        });
    }
});

// ============================================
// CAREER ALIGNMENT API
// ============================================

app.post(
    "/api/career-alignment",
    upload.single("resume"),
    async (req, res) => {
        try {
            // Check whether resume was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload your resume first."
                });
            }

            // Get student information
            let studentInformation;

            try {
                studentInformation = JSON.parse(
                    req.body.studentInformation
                );
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide valid student information."
                });
            }

            // Extract resume text
            const resumeText = await extractResumeText(req.file);

            if (!resumeText || resumeText.trim().length < 50) {
                return res.status(400).json({
                    success: false,
                    message: "Could not extract enough readable text from the resume."
                });
            }

            // Get recommended career
            const recommendedCareer = req.body.recommendedCareer || "";

            if (!recommendedCareer) {
                return res.status(400).json({
                    success: false,
                    message: "Recommended career is missing. Please complete Career Guidance first."
                });
            }

            console.log("🎯 Starting Career Alignment...");
            console.log("👤 Student:", studentInformation.name);
            console.log("💼 Career:", recommendedCareer);

            // Generate Career Alignment
            const alignment = await getCareerAlignment(
                resumeText,
                studentInformation,
                recommendedCareer
            );

            console.log("✅ Career Alignment completed");

            return res.status(200).json({
                success: true,
                message: "Career Alignment completed successfully.",
                alignment
            });

        } catch (error) {
            console.error("❌ Career Alignment error:", error);

            return res.status(500).json({
                success: false,
                message: error.message || "Career Alignment failed."
            });
        }
    }
);

// ============================================
// AI INTERVIEW - GENERATE QUESTION
// ============================================

app.post("/api/interview/question", async (req, res) => {
    try {
        console.log("\n========================================");
        console.log("🎤 AI INTERVIEW QUESTION");
        console.log("========================================");

        const {
            career,
            difficulty,
            interviewType,
            questionNumber,
            previousQuestions
        } = req.body;

        if (!career) {
            return res.status(400).json({
                success: false,
                message: "Career is required."
            });
        }

        const question = await generateInterviewQuestion({
            career,
            difficulty: difficulty || "Medium",
            interviewType: interviewType || "Technical",
            questionNumber: questionNumber || 1,
            previousQuestions: previousQuestions || []
        });

        console.log("✅ Interview question generated");

        return res.status(200).json({
            success: true,
            question
        });

    } catch (error) {
        console.error("❌ Interview question error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate interview question."
        });
    }
});
// ============================================
// AI INTERVIEW - EVALUATE ANSWER
// ============================================

app.post("/api/interview/evaluate", async (req, res) => {
    try {
        console.log("\n========================================");
        console.log("📝 AI INTERVIEW ANSWER EVALUATION");
        console.log("========================================");

        const {
            career,
            question,
            answer
        } = req.body;

        if (!career || !question || !answer) {
            return res.status(400).json({
                success: false,
                message: "Career, question and answer are required."
            });
        }

        const evaluation = await evaluateInterviewAnswer({
            career,
            question,
            answer
        });

        console.log("✅ Interview answer evaluated");

        return res.status(200).json({
            success: true,
            evaluation
        });

    } catch (error) {
        console.error("❌ Interview evaluation error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to evaluate interview answer."
        });
    }
});
// ============================================
// AI INTERVIEW - FINAL REPORT
// ============================================

app.post("/api/interview/report", async (req, res) => {
    try {
        console.log("\n========================================");
        console.log("🏆 AI INTERVIEW FINAL REPORT");
        console.log("========================================");

        const {
            career,
            questions
        } = req.body;

        if (!career || !questions || !Array.isArray(questions)) {
            return res.status(400).json({
                success: false,
                message: "Career and interview questions are required."
            });
        }

        const report = await generateInterviewReport({
            career,
            questions
        });

        console.log("✅ Final interview report generated");

        return res.status(200).json({
            success: true,
            report
        });

    } catch (error) {
        console.error("❌ Interview report error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate interview report."
        });
    }
});
// ============================================
// AI CAREER AGENT API
// ============================================

app.post("/api/career-agent/chat", async (req, res) => {
    try {
        const { question, student } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please enter your question."
            });
        }

        console.log("🤖 AI Career Agent request received");

        const answer = await chatWithCareerAgent(
            question,
            student || null
        );

        return res.status(200).json({
            success: true,
            answer
        });

    } catch (error) {
        console.error("❌ AI Career Agent error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "AI Career Agent failed."
        });
    }
});
// ========================================
// STUDENT + AI CAREER GUIDANCE
// ========================================

app.post("/api/students", authenticateStudent, async (req, res) => {

    console.log("\n========================================");
    console.log("🎓 STUDENT POST REQUEST RECEIVED");
    console.log("========================================");

    console.log("Student data received:");
    console.log(req.body);


    try {
        // Check whether this account already has a profile
        if (req.account.studentId) {
            return res.status(409).json({
                success: false,
                message: "Your career profile already exists."
            });
        }

        // ========================================
        // 1. SAVE STUDENT TO MONGODB
        // ========================================

        const student = new Student(req.body);

        const savedStudent = await student.save();

        console.log("\n========================================");
        console.log("✅ STUDENT SAVED TO MONGODB");
        console.log("========================================");

        console.log(savedStudent);


        // ========================================
        // 2. SEND STUDENT DATA TO GEMINI
        // ========================================

        console.log("\n========================================");
        console.log("🤖 SENDING DATA TO GEMINI");
        console.log("========================================");
        // ============================================
        // 2. VALIDATE STUDENT PROFILE
        // ============================================

        console.log("\n========================================");
        console.log("🔍 VALIDATING STUDENT PROFILE");
        console.log("========================================");

        const validation = await validateStudentProfile(savedStudent);

        console.log("🔍 Validation result:");
        console.log(validation);

        if (!validation.isValid) {
            console.log("❌ PROFILE VALIDATION FAILED");

            return res.status(400).json({
                success: false,
                message: "Profile validation failed.",
                issues: validation.issues
            });
        }

        console.log("✅ PROFILE VALIDATION PASSED");

        // ============================================
        // 3. SEND STUDENT DATA TO GEMINI
        // ============================================

        console.log("\n========================================");
        console.log("🤖 SENDING DATA TO GEMINI");
        console.log("========================================");

        const aiGuidance = await getCareerGuidance(savedStudent);
        // SAVE AI GUIDANCE TO MONGODB
        savedStudent.aiGuidance = aiGuidance;

        await savedStudent.save();

        console.log("✅ AI Guidance saved to MongoDB");
        // Link career profile to logged-in account
        await StudentAccount.findByIdAndUpdate(
            req.account._id,
            {
                studentId: savedStudent._id
            }
        );

        console.log("✅ Career profile linked to student account");


        // ========================================
        // 3. CHECK AI RESPONSE
        // ========================================

        console.log("\n========================================");
        console.log("🤖 AI GUIDANCE RECEIVED");
        console.log("========================================");

        console.log("AI response type:");
        console.log(typeof aiGuidance);

        console.log("AI response:");
        console.log(aiGuidance);


        // ========================================
        // 4. SEND EVERYTHING TO REACT
        // ========================================

        res.status(201).json({

            success: true,

            message: "Student data saved successfully",

            student: savedStudent,

            aiGuidance: aiGuidance

        });


        console.log("\n========================================");
        console.log("✅ RESPONSE SENT TO FRONTEND");
        console.log("========================================");


    } catch (error) {

        console.error("\n========================================");
        console.error("❌ SERVER ERROR");
        console.error("========================================");

        console.error(error);


        res.status(500).json({

            success: false,

            message: "Failed to process student data",

            error: error.message

        });

    }

});
// ========================================
// ANALYTICS DASHBOARD API
// ========================================

app.get("/api/analytics", async (req, res) => {
    try {
        // Total registered students
        const totalStudents = await Student.countDocuments();

        // Students grouped by career
        const careerDistribution = await Student.aggregate([
            {
                $group: {
                    _id: "$career",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Students grouped by normalized education
        const educationDistribution = await Student.aggregate([
            {
                $project: {
                    educationNormalized: {
                        $replaceAll: {
                            input: {
                                $replaceAll: {
                                    input: {
                                        $toLower: {
                                            $trim: {
                                                input: { $ifNull: ["$education", ""] }
                                            }
                                        }
                                    },
                                    find: ".",
                                    replacement: ""
                                }
                            },
                            find: " ",
                            replacement: ""
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$educationNormalized",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Students grouped by experience
        const experienceDistribution = await Student.aggregate([
            {
                $group: {
                    _id: "$experience",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Students grouped by programming knowledge
        const programmingDistribution = await Student.aggregate([
            {
                $group: {
                    _id: "$programming",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Individual skills distribution
        const skillsDistribution = await Student.aggregate([
            {
                $project: {
                    skillsArray: {
                        $split: [
                            { $ifNull: ["$skills", ""] },
                            ","
                        ]
                    }
                }
            },
            { $unwind: "$skillsArray" },
            {
                $project: {
                    skill: { $trim: { input: "$skillsArray" } }
                }
            },
            {
                $match: {
                    skill: { $ne: "" }
                }
            },
            {
                $group: {
                    _id: "$skill",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Monthly student registration trend
        const registrationTrend = await Student.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$createdAt"
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return res.status(200).json({
            success: true,
            analytics: {
                totalStudents,
                careerDistribution,
                educationDistribution,
                experienceDistribution,
                programmingDistribution,
                skillsDistribution,
                registrationTrend
            }
        });

    } catch (error) {
        console.error("Analytics API Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch analytics data."
        });
    }
});
// ========================================
// GET SAVED STUDENT CAREER GUIDANCE
// ========================================

app.get("/api/students/:studentId/guidance", authenticateStudent, async (req, res) => {
    try {
        const { studentId } = req.params;
        // Verify profile ownership
        if (
            !req.account.studentId ||
            req.account.studentId.toString() !== studentId
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this career profile."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const student = await Student.findById(studentId);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        if (!student.aiGuidance) {
            return res.status(404).json({
                success: false,
                message: "No saved career guidance found."
            });
        }

        return res.status(200).json({
            success: true,
            student,
            aiGuidance: student.aiGuidance
        });

    } catch (error) {
        console.error("Saved guidance retrieval error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve saved career guidance."
        });
    }
});

// ========================================
// STUDENT PROGRESS API
// ========================================

app.get("/api/progress/:studentId", authenticateStudent, async (req, res) => {
    try {
        const { studentId } = req.params;
        // Verify student ownership
        if (
            !req.account.studentId ||
            req.account.studentId.toString() !== studentId
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this progress."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        const progress = await StudentProgress.findOne({
            studentId
        });

        return res.status(200).json({
            success: true,
            completedItems: progress
                ? progress.completedItems
                : []
        });

    } catch (error) {
        console.error("Progress fetch error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve progress."
        });
    }
});


app.put("/api/progress/:studentId", authenticateStudent, async (req, res) => {
    try {
        const { studentId } = req.params;
        // Verify student ownership
        if (
            !req.account.studentId ||
            req.account.studentId.toString() !== studentId
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this progress."
            });
        }
        const { completedItems } = req.body;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID."
            });
        }

        if (!Array.isArray(completedItems)) {
            return res.status(400).json({
                success: false,
                message: "Completed items must be an array."
            });
        }

        const studentExists = await Student.exists({
            _id: studentId
        });

        if (!studentExists) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        const progress = await StudentProgress.findOneAndUpdate(
            { studentId },
            { $set: { completedItems } },
            {
                new: true,
                upsert: true,
                runValidators: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Progress saved successfully.",
            completedItems: progress.completedItems
        });

    } catch (error) {
        console.error("Progress save error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save progress."
        });
    }
});
// UPDATE STUDENT PROFILE
app.put(
    "/api/student/profile/:studentId",
    authenticateStudent,
    async (req, res) => {
        try {
            const { studentId } = req.params;

            // Verify student ownership
            if (
                !req.account ||
                !req.account.studentId ||
                req.account.studentId.toString() !== studentId
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You are not authorized to update this profile."
                });
            }

            const {
                name,
                education,
                skills,
                interests,
                programming,
                experience,
                career
            } = req.body;

            // Validate required fields
            const profileFields = {
                name,
                education,
                skills,
                interests,
                programming,
                experience,
                career
            };

            for (const [field, value] of Object.entries(profileFields)) {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} is required.`
                    });
                }
            }

            const updatedStudent = await Student.findByIdAndUpdate(
                studentId,
                {
                    $set: {
                        name: name.trim(),
                        education: education.trim(),
                        skills: skills.trim(),
                        interests: interests.trim(),
                        programming: programming.trim(),
                        experience: experience.trim(),
                        career: career.trim()
                    }
                },
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!updatedStudent) {
                return res.status(404).json({
                    success: false,
                    message: "Student profile not found."
                });
            }

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully.",
                student: updatedStudent
            });

        } catch (error) {
            console.error("Profile update error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to update student profile."
            });
        }
    }
);
// ========================================
// MONGODB CONNECTION
// ========================================

mongoose
    .connect(process.env.MONGO_URI)

    .then(async () => {

        console.log("\n========================================");
        console.log("✅ MONGODB CONNECTED SUCCESSFULLY");
        console.log("========================================");
        console.log("Generating career embeddings...");
        await generateCareerEmbeddings();


        // ========================================
        // START SERVER
        // ========================================

        const PORT = process.env.PORT || 5000;
        // RAG Career Knowledge Search API
        app.post("/api/career-knowledge/search", async (req, res) => {
            try {
                const { question } = req.body;

                if (!question || !question.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Please provide a question."
                    });
                }

                const results = await searchCareerKnowledge(question);

                res.status(200).json({
                    success: true,
                    totalResults: results.length,
                    results
                });

            } catch (error) {
                console.error("Career Knowledge API Error:", error);

                res.status(500).json({
                    success: false,
                    message: "Unable to search career knowledge."
                });
            }
        });
        app.listen(PORT, '0.0.0.0', () => {
            console.log("SERVER STARTED");
            console.log(`Server running on port ${PORT}`);
        });

    })

    .catch((error) => {

        console.error("\n❌ MONGODB CONNECTION FAILED");

        console.error(error);

    });
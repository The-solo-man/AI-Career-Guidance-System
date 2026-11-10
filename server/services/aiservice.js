const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
    searchCareerKnowledge
} = require("./careerKnowledgeService");

// =====================================================
// GEMINI CONFIGURATION
// =====================================================

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash"
});

async function validateStudentProfile(student) {
    const validationPrompt = `
You are a strict profile validation system for an AI Career Guidance application.

Your job is ONLY to determine whether the student's submitted information
is meaningful and suitable for career guidance.

DO NOT correct, rewrite, replace, improve, or guess any user answer.

Do NOT use a fixed list of valid words.
Use semantic understanding and context.

Student Profile:

Name: ${student.name}
Education: ${student.education}
Skills: ${student.skills}
Interests: ${student.interests}
Programming: ${student.programming}
Experience: ${student.experience}
Career Interest: ${student.career}

Validation rules:

1. Check whether each field contains meaningful information.
2. Check whether the answer belongs to the field where it was entered.
3. Reject meaningless or random text.
4. Reject answers clearly unrelated to their fields.
5. Check whether enough information is available for useful career guidance.
6. Identify obvious contradictions.
7. Do NOT reject an answer merely because it is unusual.
8. Do NOT require a particular career, skill, education, or interest.
9. Different combinations of education, skills, interests and careers can be valid.
10. Do not assume or invent missing information.

Return ONLY valid JSON in exactly this format:

{
    "isValid": true,
    "confidence": 0.95,
    "issues": []
}

If invalid:

{
    "isValid": false,
    "confidence": 0.95,
    "issues": [
        "Explain the problem clearly."
    ]
}

The confidence must be between 0 and 1.
The issues array must contain short explanations.
`;

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(
                `🔍 Validating student profile (${attempt}/${maxAttempts})...`
            );

            const result = await model.generateContent(validationPrompt);



            let responseText = result.response.text().trim();

            responseText = responseText
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

            const validation = JSON.parse(responseText);

            if (typeof validation.isValid !== "boolean") {
                throw new Error(
                    "Gemini returned an invalid profile validation result."
                );
            }

            console.log("✅ Student profile validation completed.");

            return {
                isValid: validation.isValid,
                confidence: Math.max(
                    0,
                    Math.min(1, Number(validation.confidence) || 0)
                ),
                issues: Array.isArray(validation.issues)
                    ? validation.issues
                    : []
            };

        } catch (error) {
            const errorMessage = String(
                error.message || ""
            ).toLowerCase();

            const isTemporaryError =
                errorMessage.includes("503") ||
                errorMessage.includes("service unavailable") ||
                errorMessage.includes("high demand") ||
                errorMessage.includes("temporarily unavailable");

            console.error(
                `⚠️ Profile validation attempt ${attempt} failed:`,
                error.message
            );

            if (!isTemporaryError || attempt === maxAttempts) {
                throw error;
            }

            const waitTime = attempt * 2000;

            console.log(
                `⏳ Gemini is temporarily unavailable. Retrying in ${waitTime / 1000
                } seconds...`
            );

            await new Promise(resolve =>
                setTimeout(resolve, waitTime)
            );
        }
    }
}
// =====================================================
// GET CAREER GUIDANCE
// =====================================================

async function getCareerGuidance(student) {

    const prompt = `
You are an expert AI career counselor and career analytics assistant.

Analyze the student's profile carefully and provide personalized career guidance.

STUDENT PROFILE
---------------

Name:
${student.name}

Education:
${student.education}

Skills:
${student.skills}

Interests:
${student.interests}

Programming:
${student.programming}

Experience:
${student.experience}

Preferred Career:
${student.career}


====================================================
IMPORTANT OUTPUT RULES
====================================================

Return ONLY valid JSON.

Do NOT use Markdown.

Do NOT use code fences.

Do NOT write any explanation outside the JSON.

All scores must be integers between 0 and 100.

Do not return null for any required score.

All scores must be based on the student's actual profile.

Do not simply copy the career match score into every category.

Analyze each category separately.


====================================================
CAREER MATCH SCORE
====================================================

Calculate "careerMatchScore" based on the overall compatibility between:

- Education
- Skills
- Interests
- Programming knowledge
- Experience
- Preferred career

The score must be between 0 and 100.

A higher score means stronger compatibility.


====================================================
PROFILE ANALYSIS
====================================================

Calculate separate scores for:

skillsScore
interestsScore
educationScore
programmingScore
experienceScore

These scores represent how strongly each part of the student's profile supports the recommended career.

For example:

skillsScore:
How well the student's current skills match the career.

interestsScore:
How strongly the student's interests align with the career.

educationScore:
How relevant the student's education is.

programmingScore:
How relevant the student's programming knowledge is.

experienceScore:
How well the student's current experience supports the career.


====================================================
CAREER COMPARISON
====================================================

Provide the recommended career plus several alternative careers.

Each career must have its own compatibility score.

Do not give every career the same score.

Rank careers from highest compatibility to lowest compatibility.


====================================================
SKILL GAP
====================================================

Analyze the student's existing skills and identify important skills needed for the recommended career.

For each skill provide:

- skill
- currentLevel
- requiredLevel
- gap
- priority

Use:

currentLevel: 0-100
requiredLevel: 0-100
gap: 0-100

priority must be:

"High"

"Medium"

or

"Low"


====================================================
LEARNING ROADMAP
====================================================

Create a realistic 6-month learning roadmap.

Each month should contain:

- month
- topics
- practice
- goal


====================================================
PROJECTS
====================================================

Recommend practical portfolio projects.

Projects should match the student's current experience level and recommended career.

Each project should contain:

- title
- difficulty
- technologies
- description


====================================================
CAREER ADVICE
====================================================

Give practical and personalized career advice.

Advice should help the student:

- improve skills
- build projects
- prepare a resume
- prepare for interviews
- become internship/job ready


====================================================
EXACT JSON STRUCTURE
====================================================

Return exactly this structure:

{
    "recommendedCareer": "Data Scientist",

    "careerMatchScore": 82,

    "profileAnalysis": {
        "skillsScore": 82,
        "interestsScore": 88,
        "educationScore": 75,
        "programmingScore": 80,
        "experienceScore": 60
    },

    "careerComparison": [
        {
            "career": "Data Scientist",
            "score": 82
        },
        {
            "career": "Machine Learning Engineer",
            "score": 76
        },
        {
            "career": "Data Analyst",
            "score": 72
        },
        {
            "career": "AI Engineer",
            "score": 68
        }
    ],

    "alternativeCareers": [
        "Machine Learning Engineer",
        "Data Analyst",
        "AI Engineer"
    ],

    "whyThisCareer": "Personalized explanation of why this career matches the student's profile.",

    "skillGapAnalysis": [
        {
            "skill": "Python",
            "currentLevel": 80,
            "requiredLevel": 90,
            "gap": 10,
            "priority": "Low"
        },
        {
            "skill": "SQL",
            "currentLevel": 60,
            "requiredLevel": 85,
            "gap": 25,
            "priority": "Medium"
        },
        {
            "skill": "Machine Learning",
            "currentLevel": 30,
            "requiredLevel": 85,
            "gap": 55,
            "priority": "High"
        }
    ],

    "skillsToLearn": [
        "Python",
        "SQL",
        "Statistics",
        "Machine Learning",
        "Data Visualization",
        "Pandas",
        "Scikit-learn"
    ],

    "learningRoadmap": [
        {
            "month": "Month 1",
            "topics": [
                "Python",
                "NumPy",
                "Programming fundamentals"
            ],
            "practice": "Solve Python programming problems and small exercises.",
            "goal": "Build a strong Python foundation."
        },

        {
            "month": "Month 2",
            "topics": [
                "Pandas",
                "SQL",
                "Data cleaning"
            ],
            "practice": "Work with real datasets and SQL queries.",
            "goal": "Become comfortable working with data."
        },

        {
            "month": "Month 3",
            "topics": [
                "Statistics",
                "Matplotlib",
                "Data visualization"
            ],
            "practice": "Analyze datasets and create dashboards.",
            "goal": "Understand and communicate data."
        },

        {
            "month": "Month 4",
            "topics": [
                "Machine Learning",
                "Regression",
                "Classification"
            ],
            "practice": "Train and evaluate machine learning models.",
            "goal": "Build practical ML knowledge."
        },

        {
            "month": "Month 5",
            "topics": [
                "Advanced Machine Learning",
                "Feature Engineering",
                "Model Evaluation"
            ],
            "practice": "Build an end-to-end machine learning project.",
            "goal": "Develop portfolio-level skills."
        },

        {
            "month": "Month 6",
            "topics": [
                "Portfolio",
                "Resume",
                "Interview preparation"
            ],
            "practice": "Complete projects and practice technical interviews.",
            "goal": "Become internship/job ready."
        }
    ],

    "projectIdeas": [
        {
            "title": "Student Performance Prediction",
            "difficulty": "Beginner",
            "technologies": [
                "Python",
                "Pandas",
                "Scikit-learn"
            ],
            "description": "Build a machine learning system that predicts student performance."
        },
        {
            "title": "Customer Churn Prediction",
            "difficulty": "Intermediate",
            "technologies": [
                "Python",
                "Pandas",
                "Scikit-learn",
                "MongoDB"
            ],
            "description": "Predict customers who are likely to leave a service."
        },
        {
            "title": "AI Recommendation System",
            "difficulty": "Advanced",
            "technologies": [
                "Python",
                "Machine Learning",
                "React",
                "Node.js"
            ],
            "description": "Build a recommendation system using machine learning."
        }
    ],

    "jobRoles": [
        "Data Scientist",
        "Data Analyst",
        "Machine Learning Engineer",
        "AI Engineer",
        "Business Intelligence Analyst"
    ],

    "careerAdvice": [
        "Build at least three strong portfolio projects.",
        "Practice Python and SQL regularly.",
        "Create a professional GitHub profile.",
        "Prepare a resume focused on measurable project outcomes.",
        "Practice technical and behavioral interviews."
    ]
}


====================================================
FINAL REMINDER
====================================================

The example numbers above are ONLY examples of the expected format.

Generate new scores based on the actual student.

Do not always return 82.

Do not always return the same profile scores.

Do not always return the same career comparison scores.

Make the response personalized.
`;


    // =================================================
    // CALL GEMINI
    // =================================================


    try {

        console.log("");

        console.log("================================================");
        console.log("🤖 SENDING DATA TO GEMINI");
        console.log("================================================");

        let result;

        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {

            try {

                console.log(
                    `🤖 Gemini attempt ${attempt}/${maxRetries}`
                );

                result =
                    await model.generateContent(prompt);

                break;

            } catch (error) {

                const isLastAttempt =
                    attempt === maxRetries;

                if (isLastAttempt) {
                    throw error;
                }

                console.log(
                    `⚠️ Gemini request failed. Retrying in 3 seconds...`
                );

                await new Promise(
                    (resolve) =>
                        setTimeout(resolve, 3000)
                );

            }

        }

        const response =
            await result.response;

        let text =
            response.text().trim();


        // =================================================
        // RAW RESPONSE
        // =================================================

        console.log("");
        console.log("==============================================");
        console.log("🤖 GEMINI RAW RESPONSE");
        console.log("==============================================");

        console.log(text);


        // =================================================
        // REMOVE MARKDOWN
        // =================================================

        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


        // =================================================
        // PARSE JSON
        // =================================================

        let guidance;

        try {

            guidance =
                JSON.parse(text);

        } catch (error) {

            console.error(
                "❌ INVALID GEMINI JSON"
            );

            console.error(error);

            throw new Error(
                "Gemini returned invalid JSON"
            );
        }


        // =================================================
        // CAREER MATCH SCORE
        // =================================================

        let score =
            Number(
                guidance.careerMatchScore
            );


        if (!Number.isFinite(score)) {

            score = 50;

            const preferredCareer =
                String(
                    student.career || ""
                ).toLowerCase();

            const recommendedCareer =
                String(
                    guidance.recommendedCareer || ""
                ).toLowerCase();


            if (
                preferredCareer &&
                recommendedCareer &&
                (
                    recommendedCareer.includes(
                        preferredCareer
                    ) ||
                    preferredCareer.includes(
                        recommendedCareer
                    )
                )
            ) {

                score += 20;
            }


            if (
                String(
                    student.skills || ""
                ).trim()
            ) {

                score += 8;
            }


            if (
                String(
                    student.interests || ""
                ).trim()
            ) {

                score += 8;
            }


            if (
                String(
                    student.programming || ""
                ).trim()
            ) {

                score += 7;
            }


            if (
                String(
                    student.education || ""
                ).trim()
            ) {

                score += 5;
            }


            if (
                String(
                    student.experience || ""
                ).toLowerCase() !==
                "beginner"
            ) {

                score += 2;
            }
        }


        score =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(score)
                )
            );


        guidance.careerMatchScore =
            score;


        // =================================================
        // PROFILE ANALYSIS FALLBACK
        // =================================================

        if (
            !guidance.profileAnalysis ||
            typeof guidance.profileAnalysis !==
            "object"
        ) {

            guidance.profileAnalysis = {
                skillsScore: Math.min(
                    100,
                    50 +
                    (
                        String(
                            student.skills || ""
                        ).split(",").length * 8
                    )
                ),

                interestsScore: 70,

                educationScore: 70,

                programmingScore:
                    student.programming
                        ? 75
                        : 40,

                experienceScore:
                    String(
                        student.experience || ""
                    ).toLowerCase() ===
                        "advanced"
                        ? 90
                        : String(
                            student.experience || ""
                        ).toLowerCase() ===
                            "intermediate"
                            ? 70
                            : 50
            };
        }


        // =================================================
        // ENSURE PROFILE SCORES ARE VALID
        // =================================================

        const profile =
            guidance.profileAnalysis;


        const profileKeys = [
            "skillsScore",
            "interestsScore",
            "educationScore",
            "programmingScore",
            "experienceScore"
        ];


        profileKeys.forEach((key) => {

            let value =
                Number(profile[key]);

            if (!Number.isFinite(value)) {
                value = 50;
            }

            profile[key] =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(value)
                    )
                );
        });


        // =================================================
        // CAREER COMPARISON FALLBACK
        // =================================================

        if (
            !Array.isArray(
                guidance.careerComparison
            ) ||
            guidance.careerComparison.length === 0
        ) {

            guidance.careerComparison = [

                {
                    career:
                        guidance.recommendedCareer ||
                        student.career ||
                        "Recommended Career",

                    score:
                        guidance.careerMatchScore
                }

            ];

            if (
                Array.isArray(
                    guidance.alternativeCareers
                )
            ) {

                guidance.alternativeCareers
                    .slice(0, 4)
                    .forEach(
                        (
                            career,
                            index
                        ) => {

                            guidance.careerComparison.push({

                                career,

                                score: Math.max(
                                    40,
                                    guidance.careerMatchScore -
                                    ((index + 1) * 5)
                                )

                            });

                        }
                    );
            }
        }


        // =================================================
        // NORMALIZE CAREER COMPARISON
        // =================================================

        guidance.careerComparison =
            guidance.careerComparison
                .map((item) => {

                    let itemScore =
                        Number(
                            item.score
                        );

                    if (
                        !Number.isFinite(
                            itemScore
                        )
                    ) {

                        itemScore =
                            50;
                    }

                    return {

                        career:
                            item.career ||
                            "Career",

                        score:
                            Math.max(
                                0,
                                Math.min(
                                    100,
                                    Math.round(
                                        itemScore
                                    )
                                )
                            )
                    };

                })
                .sort(
                    (a, b) =>
                        b.score - a.score
                );


        // =================================================
        // SKILL GAP FALLBACK
        // =================================================

        if (
            !Array.isArray(
                guidance.skillGapAnalysis
            )
        ) {

            guidance.skillGapAnalysis = [];
        }


        // =================================================
        // ENSURE ARRAYS
        // =================================================

        if (
            !Array.isArray(
                guidance.alternativeCareers
            )
        ) {

            guidance.alternativeCareers = [];
        }


        if (
            !Array.isArray(
                guidance.skillsToLearn
            )
        ) {

            guidance.skillsToLearn = [];
        }


        if (
            !Array.isArray(
                guidance.learningRoadmap
            )
        ) {

            guidance.learningRoadmap = [];
        }


        if (
            !Array.isArray(
                guidance.projectIdeas
            )
        ) {

            guidance.projectIdeas = [];
        }


        if (
            !Array.isArray(
                guidance.jobRoles
            )
        ) {

            guidance.jobRoles = [];
        }


        if (
            !Array.isArray(
                guidance.careerAdvice
            )
        ) {

            guidance.careerAdvice = [];
        }
        // =================================================
        // FINAL LOG
        // =================================================

        console.log("");
        console.log("==============================================");
        console.log("✅ FINAL AI GUIDANCE");
        console.log("==============================================");

        console.log(
            "Recommended Career:",
            guidance.recommendedCareer
        );

        console.log(
            "Career Match Score:",
            guidance.careerMatchScore
        );

        console.log(
            "Profile Analysis:",
            guidance.profileAnalysis
        );

        console.log(
            "Career Comparison:",
            guidance.careerComparison
        );

        console.log(
            "Skill Gap Analysis:",
            guidance.skillGapAnalysis
        );

        console.log(
            "==============================================");


        return guidance;

    } catch (error) {

        console.error("");
        console.error(
            "=============================================="
        );

        console.error(
            "❌ GEMINI CAREER GUIDANCE ERROR"
        );

        console.error(error);

        console.error(
            "=============================================="
        );

        throw error;
    }
}

// =====================================================
// AI CAREER AGENT
// =====================================================

async function chatWithCareerAgent(question, student) {

    if (!question || !question.trim()) {
        throw new Error("Please enter your question.");
    }

    // 1. Retrieve relevant career knowledge using RAG
    const knowledgeResults = await searchCareerKnowledge(question);

    const knowledgeContext = Array.isArray(knowledgeResults)
        ? knowledgeResults.map((item, index) => `
Knowledge ${index + 1}:
${JSON.stringify(item)}
`).join("\n")
        : "No relevant career knowledge was found.";

    // 2. Prepare student profile
    const studentContext = student
        ? JSON.stringify({
            name: student.name,
            education: student.education,
            skills: student.skills,
            interests: student.interests,
            programming: student.programming,
            experience: student.experience,
            preferredCareer: student.career
        })
        : "Student profile not provided.";

    // 3. Create personalized AI prompt
    const prompt = `
You are an intelligent AI Career Agent.

Your responsibility is to provide personalized career guidance.

STUDENT PROFILE:
${studentContext}

RETRIEVED CAREER KNOWLEDGE:
${knowledgeContext}

STUDENT QUESTION:
${question}

INSTRUCTIONS:
1. Answer the student's question clearly.
2. Personalize the answer using the student profile.
3. Use the retrieved knowledge when relevant.
4. Do not invent facts or claim retrieved information says something it does not.
5. If the knowledge base does not contain the answer, explain that and provide general guidance separately.
6. Give practical examples and actionable suggestions.
7. Use simple, professional language.
8. Do not unnecessarily repeat the student profile.

Provide a helpful response in plain text.
`;

    // 4. Generate response using Gemini
    let result;

    try {
        result = await model.generateContent(prompt);
    } catch (error) {
        if (
            error.message?.includes("429") ||
            error.message?.toLowerCase().includes("quota")
        ) {
            throw new Error(
                "AI Career Agent quota exceeded. Please try again after your Gemini quota resets."
            );
        }

        throw error;
    }

    return result.response.text().trim();
}
// =====================================================
// EXPORT
// =====================================================

module.exports = {
    getCareerGuidance,
    validateStudentProfile,
    chatWithCareerAgent
};
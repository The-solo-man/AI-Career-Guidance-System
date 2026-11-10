const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash"
});

// ============================================
// GEMINI RETRY HANDLER
// ============================================

async function generateWithRetry(prompt, retries = 3) {

    for (let attempt = 1; attempt <= retries; attempt++) {

        try {

            console.log(
                `🤖 Gemini request attempt ${attempt}/${retries}`
            );

            const result = await model.generateContent(prompt);

            console.log("✅ Gemini response received");

            return result;

        } catch (error) {

            console.error(
                `⚠️ Gemini attempt ${attempt} failed:`,
                error.message
            );

            const isTemporaryError =
                error.message?.includes("503") ||
                error.message?.includes("Service Unavailable") ||
                error.message?.includes("429") ||
                error.message?.includes("high demand");

            if (!isTemporaryError || attempt === retries) {
                throw error;
            }

            const waitTime = attempt * 2000;

            console.log(
                `⏳ Retrying in ${waitTime / 1000} seconds...`
            );

            await new Promise(resolve =>
                setTimeout(resolve, waitTime)
            );
        }
    }
}
// ============================================
// CLEAN GEMINI JSON RESPONSE
// ============================================

function cleanJSON(responseText) {
    return responseText
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}


// ============================================
// GENERATE INTERVIEW QUESTION
// ============================================

async function generateInterviewQuestion({
    career,
    difficulty = "Medium",
    interviewType = "Technical",
    questionNumber = 1,
    previousQuestions = []
}) {

    const previousQuestionText =
        previousQuestions.length > 0
            ? previousQuestions.join("\n")
            : "None";

    const prompt = `
You are an AI Interview Simulator for a career guidance platform.

Generate ONE realistic interview question.

Target Career:
${career}

Interview Type:
${interviewType}

Difficulty:
${difficulty}

Question Number:
${questionNumber}

Previous Questions:
${previousQuestionText}

Requirements:

1. Generate only ONE question.
2. The question must be relevant to the selected career.
3. Avoid repeating previous questions.
4. Follow the selected interview type strictly.

Technical:
Ask about programming, databases, algorithms, tools,
technical concepts or practical problem-solving.

HR:
Ask about communication, teamwork, strengths,
weaknesses, leadership, goals or workplace situations.

Mixed:
Generate a combination of technical and HR questions.

5. Keep questions appropriate for entry-level candidates.
6. Do not invent personal information about the candidate.
7. Return ONLY valid JSON.

Return exactly:

{
    "question": "",
    "category": "",
    "difficulty": "${difficulty}"
}
`;

    const result = await generateWithRetry(prompt);

    const responseText = cleanJSON(
        result.response.text()
    );

    return JSON.parse(responseText);
}


// ============================================
// EVALUATE INTERVIEW ANSWER
// ============================================

async function evaluateInterviewAnswer({
    career,
    question,
    answer
}) {

    const prompt = `
You are an AI Interview Evaluator.

Evaluate the candidate's answer objectively.

Career:
${career}

Interview Question:
${question}

Candidate Answer:
${answer}

Rules:

1. Evaluate only the answer provided.
2. Do not invent information about the candidate.
3. Give a score from 0 to 100.
4. Consider correctness, relevance, clarity and depth.
5. For technical questions, evaluate technical accuracy.
6. For behavioral questions, evaluate communication and reasoning.
7. Give constructive feedback.
8. Mention what was done well.
9. Mention what could be improved.
10. Provide a better approach, but do not pretend the candidate actually gave that answer.
11. Return ONLY valid JSON.

Return exactly:

{
    "score": 0,
    "rating": "",
    "strengths": [],
    "improvements": [],
    "feedback": "",
    "betterApproach": ""
}

Rating should be one of:

"Excellent"
"Good"
"Average"
"Needs Improvement"
`;

    const result = await generateWithRetry(prompt);

    const responseText = cleanJSON(
        result.response.text()
    );

    return JSON.parse(responseText);
}


// ============================================
// GENERATE FINAL INTERVIEW REPORT
// ============================================

async function generateInterviewReport({
    career,
    questions
}) {

    const interviewData = questions
        .map((item, index) => `
Question ${index + 1}:
${item.question}

Category:
${item.category}

Candidate Answer:
${item.answer}

Score:
${item.evaluation?.score || 0}

Feedback:
${item.evaluation?.feedback || ""}
`)
        .join("\n");

    const prompt = `
You are an AI Career Interview Coach.

Analyze the complete interview performance.

Career:
${career}

Interview Performance:
${interviewData}

Return ONLY valid JSON.

Return exactly:

{
    "overallScore": 0,
    "overallRating": "",
    "summary": "",
    "strengths": [],
    "weaknesses": [],
    "technicalPerformance": "",
    "communicationPerformance": "",
    "recommendations": [],
    "nextSteps": []
}

Rules:

1. overallScore must be between 0 and 100.
2. Base the report only on the interview answers and scores provided.
3. Identify the candidate's strongest areas.
4. Identify areas requiring improvement.
5. Evaluate technical performance.
6. Evaluate communication and explanation quality.
7. Give practical recommendations.
8. Give actionable next steps for interview preparation.
9. Do not invent qualifications or experience.
`;

    const result = await generateWithRetry(prompt);

    const responseText = cleanJSON(
        result.response.text()
    );

    return JSON.parse(responseText);
}


module.exports = {
    generateInterviewQuestion,
    evaluateInterviewAnswer,
    generateInterviewReport
};
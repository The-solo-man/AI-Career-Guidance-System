const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const { GoogleGenerativeAI } = require("@google/generative-ai");


// ============================================
// GEMINI SETUP
// ============================================

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash"
});


// ============================================
// RESUME TEXT EXTRACTION
// ============================================

async function extractResumeText(file) {

    if (!file || !file.buffer) {
        throw new Error("Resume file was not received.");
    }

    const fileName = file.originalname.toLowerCase();


    // PDF
    if (fileName.endsWith(".pdf")) {

        const data = await pdfParse(file.buffer);

        return data.text.trim();
    }


    // DOCX
    if (fileName.endsWith(".docx")) {

        const result = await mammoth.extractRawText({
            buffer: file.buffer
        });

        return result.value.trim();
    }


    throw new Error(
        "Unsupported resume format. Please upload a PDF or DOCX file."
    );
}


// ============================================
// RESUME ANALYSIS
// ============================================

async function analyzeResume(resumeText) {

    const prompt = `
You are an AI Resume Analyzer.

Analyze the following resume carefully.

Do NOT invent information that is not present in the resume.

Return ONLY valid JSON.

Resume:
${resumeText}

Return exactly this structure:

{
    "resumeScore": 0,
    "summary": "",
    "strengths": [],
    "missingSkills": [],
    "technicalSkills": [],
    "softSkills": [],
    "experienceAnalysis": "",
    "educationAnalysis": "",
    "projectAnalysis": "",
    "improvementSuggestions": [],
    "careerSuggestions": []
}

Rules:

1. resumeScore must be between 0 and 100.
2. Base the score only on information actually present.
3. Identify strengths from the resume.
4. Identify skills that appear to be missing or could be improved.
5. Separate technical skills and soft skills.
6. Analyze education, projects and experience.
7. Give practical resume improvement suggestions.
8. Suggest careers only when supported by the resume.
9. Do not fabricate qualifications, projects, experience or skills.
10. If information is missing, clearly say so.
`;

    const result = await model.generateContent(prompt);

    let responseText = result.response.text().trim();


    // Remove Gemini markdown code fences if present

    responseText = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();


    const analysis = JSON.parse(responseText);

    return analysis;
}


// ============================================
// CAREER ALIGNMENT ANALYSIS
// ============================================

// ============================================
// CAREER ALIGNMENT ANALYSIS
// ============================================

async function getCareerAlignment(
    resumeText,
    studentInformation,
    recommendedCareer
) {

    const prompt = `
You are an AI Career Alignment Analyzer.

Your task is to evaluate how well a student's
education, skills, interests, experience and resume
align with their recommended career.

STUDENT INFORMATION:
${JSON.stringify(studentInformation, null, 2)}

RECOMMENDED CAREER:
${recommendedCareer}

STUDENT RESUME:
${resumeText}

Do NOT invent information that is not provided.

Return ONLY valid JSON.

Return exactly this structure:

{
    "alignmentScore": 0,
    "careerReadiness": "",
    "matchingSkills": [],
    "missingSkills": [],
    "careerSpecificImprovements": []
}

RULES:

1. alignmentScore must be between 0 and 100.
2. Evaluate both student information and resume.
3. Consider education, technical skills, interests,
   programming knowledge and experience.
4. Identify skills supported by the provided information.
5. Identify important career-related skills that are
   missing or not demonstrated.
6. Give practical improvements for the recommended career.
7. Do not invent qualifications, skills or experience.
8. Keep the analysis realistic and useful for a student.
9. Clearly mention when information is insufficient.
`;

    const result = await model.generateContent(prompt);

    let responseText = result.response.text().trim();

    responseText = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    const alignment = JSON.parse(responseText);

    return alignment;
}

// ============================================
// EXPORT SERVICES
// ============================================

module.exports = {
    extractResumeText,
    analyzeResume,
    getCareerAlignment
};
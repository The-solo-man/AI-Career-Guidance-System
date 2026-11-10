import { useState, useEffect, useRef } from "react";
import Navigation from "./Navigation";
import "./Navigation.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InterviewSimulator from "./interviewSimulator";
import ReactMarkdown from "react-markdown";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

import "./App.css";


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const numberValue = (value, fallback = null) => {
  const number = Number(value);

  if (Number.isFinite(number)) {
    return number;
  }

  return fallback;
};


const arrayValue = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [value];
};


const normalizeKey = (key) => {
  return String(key)
    .toLowerCase()
    .replace(/[\s_-]/g, "");
};


const getValue = (
  object,
  possibleKeys,
  fallback = null
) => {

  if (!object || typeof object !== "object") {
    return fallback;
  }

  const normalized = {};

  Object.keys(object).forEach((key) => {
    normalized[normalizeKey(key)] = object[key];
  });

  for (const key of possibleKeys) {

    const value =
      normalized[normalizeKey(key)];

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return fallback;
};


/* =========================================================
   NORMALIZE GEMINI RESPONSE
========================================================= */

const normalizeGuidance = (rawData) => {

  let data = rawData;


  /* -------------------------------------------------------
     Gemini sometimes returns JSON as text
  ------------------------------------------------------- */

  if (typeof data === "string") {

    try {

      data = JSON.parse(data);

    } catch (error) {

      console.error(
        "Unable to parse Gemini response:",
        error
      );

      return null;
    }
  }


  /* -------------------------------------------------------
     Remove possible wrappers
  ------------------------------------------------------- */

  if (data?.aiGuidance) {
    data = data.aiGuidance;
  }

  if (data?.guidance) {
    data = data.guidance;
  }

  if (data?.result) {
    data = data.result;
  }

  if (
    data?.data &&
    typeof data.data === "object"
  ) {
    data = data.data;
  }


  if (!data || typeof data !== "object") {
    return null;
  }


  /* =======================================================
     BASIC INFORMATION
  ======================================================= */

  const recommendedCareer =
    getValue(
      data,
      [
        "recommendedCareer",
        "recommended career",
        "careerRecommendation",
        "primaryCareer"
      ],
      "N/A"
    );


  const careerMatchScore =
    numberValue(
      getValue(
        data,
        [
          "careerMatchScore",
          "career match score",
          "matchScore",
          "compatibilityScore"
        ],
        null
      ),
      null
    );


  const alternativeCareers =
    arrayValue(
      getValue(
        data,
        [
          "alternativeCareers",
          "alternative careers"
        ],
        []
      )
    );


  const whyThisCareer =
    getValue(
      data,
      [
        "whyThisCareer",
        "why this career",
        "careerReason",
        "reason"
      ],
      "N/A"
    );


  /* =======================================================
     PROFILE ANALYSIS
  ======================================================= */

  const profileRaw =
    getValue(
      data,
      [
        "profileAnalysis",
        "profile analysis",
        "profileScores"
      ],
      {}
    );


  const profileAnalysis = {

    skillsScore:
      numberValue(
        getValue(
          profileRaw,
          [
            "skillsScore",
            "skills",
            "skillScore"
          ],
          null
        )
      ),

    interestsScore:
      numberValue(
        getValue(
          profileRaw,
          [
            "interestsScore",
            "interests",
            "interestScore"
          ],
          null
        )
      ),

    educationScore:
      numberValue(
        getValue(
          profileRaw,
          [
            "educationScore",
            "education"
          ],
          null
        )
      ),

    programmingScore:
      numberValue(
        getValue(
          profileRaw,
          [
            "programmingScore",
            "programming",
            "programmingSkillsScore"
          ],
          null
        )
      ),

    experienceScore:
      numberValue(
        getValue(
          profileRaw,
          [
            "experienceScore",
            "experience"
          ],
          null
        )
      )
  };


  /* =======================================================
     CAREER COMPARISON
  ======================================================= */

  const careerComparisonRaw =
    arrayValue(
      getValue(
        data,
        [
          "careerComparison",
          "career comparison",
          "careerMatches"
        ],
        []
      )
    );


  const careerComparison =
    careerComparisonRaw
      .map((item) => {

        if (
          typeof item === "string"
        ) {

          return {
            career: item,
            score: 0
          };

        }


        return {

          career:
            getValue(
              item,
              [
                "career",
                "careerName",
                "name",
                "title"
              ],
              "N/A"
            ),

          score:
            numberValue(
              getValue(
                item,
                [
                  "score",
                  "careerScore",
                  "matchScore",
                  "compatibility"
                ],
                0
              ),
              0
            )
        };
      })
      .filter(
        (item) =>
          item.career !== "N/A"
      );


  /* =======================================================
     SKILL GAP ANALYSIS
  ======================================================= */

  const skillGapRaw =
    arrayValue(
      getValue(
        data,
        [
          "skillGapAnalysis",
          "skill gap analysis",
          "skillGaps",
          "skillGap"
        ],
        []
      )
    );


  const skillGapAnalysis =
    skillGapRaw.map((item) => {

      if (
        typeof item === "string"
      ) {

        return {

          skill: item,

          currentScore: 0,

          requiredScore: 100,

          gap: 100
        };
      }


      const current =
        numberValue(
          getValue(
            item,
            [
              "currentScore",
              "current",
              "currentLevel",
              "yourLevel"
            ],
            0
          ),
          0
        );


      const required =
        numberValue(
          getValue(
            item,
            [
              "requiredScore",
              "required",
              "requiredLevel",
              "targetLevel"
            ],
            100
          ),
          100
        );


      const calculatedGap =
        Math.max(
          0,
          required - current
        );


      return {

        skill:
          getValue(
            item,
            [
              "skill",
              "name",
              "technology",
              "area"
            ],
            "N/A"
          ),

        currentScore:
          current,

        requiredScore:
          required,

        gap:
          numberValue(
            getValue(
              item,
              [
                "gap",
                "gapScore",
                "skillGap"
              ],
              calculatedGap
            ),
            calculatedGap
          )
      };

    });


  /* =======================================================
     SKILLS TO LEARN
  ======================================================= */

  const skillsToLearn =
    arrayValue(
      getValue(
        data,
        [
          "skillsToLearn",
          "skills to learn",
          "skills"
        ],
        []
      )
    );


  /* =======================================================
     LEARNING ROADMAP
  ======================================================= */

  const learningRoadmap =
    arrayValue(
      getValue(
        data,
        [
          "learningRoadmap",
          "learning roadmap",
          "roadmap"
        ],
        []
      )
    );


  /* =======================================================
     PROJECT IDEAS
  ======================================================= */

  const projectIdeas =
    arrayValue(
      getValue(
        data,
        [
          "projectIdeas",
          "project ideas",
          "projects"
        ],
        []
      )
    );


  /* =======================================================
     JOB ROLES
  ======================================================= */

  const jobRoles =
    arrayValue(
      getValue(
        data,
        [
          "jobRoles",
          "job roles",
          "roles"
        ],
        []
      )
    );


  /* =======================================================
     CAREER ADVICE
  ======================================================= */

  const careerAdvice =
    arrayValue(
      getValue(
        data,
        [
          "careerAdvice",
          "career advice",
          "advice",
          "recommendations"
        ],
        []
      )
    );


  return {

    recommendedCareer,

    careerMatchScore,

    alternativeCareers,

    whyThisCareer,

    profileAnalysis,

    careerComparison,

    skillGapAnalysis,

    skillsToLearn,

    learningRoadmap,

    projectIdeas,

    jobRoles,

    careerAdvice
  };
};


/* =========================================================
   MAIN APP
========================================================= */

function App() {

  // ========================================
  // STUDENT AUTHENTICATION STATES
  // ========================================
  const [showPassword, setShowPassword] = useState(false);

  const [authMode, setAuthMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [authToken, setAuthToken] = useState(
    () => sessionStorage.getItem("authToken")
  );

  const [, setAccount] = useState(null);
  // ========================================
  // RESTORE LOGGED-IN STUDENT ACCOUNT
  // ========================================

  useEffect(() => {
    if (!authToken) return;

    const restoreAccount = async () => {
      try {
        const response = await fetch(
          "https://ai-career-guidance-backend.onrender.com/api/auth/me",
          {
            headers: {
              Authorization: `Bearer ${authToken}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Session expired.");
        }

        setAccount(data.account);

        // Restore only this account's linked profile
        setStudentId(data.account.studentId || null);

      } catch (error) {
        console.error("Account restoration error:", error);

        sessionStorage.removeItem("authToken");

        setAuthToken(null);
        setAccount(null);
        setStudentId(null);
        setActiveSection("career");
      }
    };

    restoreAccount();

  }, [authToken]);
  // ========================================
  // HANDLE AUTHENTICATION FORM CHANGES
  // ========================================

  const handleAuthChange = (event) => {
    const { name, value } = event.target;

    setAuthForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };
  // ========================================
  // HANDLE STUDENT LOGIN AND REGISTRATION
  // ========================================

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthMessage("");

    try {
      const endpoint =
        authMode === "register"
          ? "https://ai-career-guidance-backend.onrender.com/api/auth/register"
          : "https://ai-career-guidance-backend.onrender.com/api/auth/login";

      const response = await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
        },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      // Save login token
      sessionStorage.setItem("authToken", data.token);
      setAuthToken(data.token);

      // Save account information
      setAccount(data.account);

      // Restore linked career profile
      const savedStudentId = data.account.studentId;

      setStudentId(savedStudentId || null);

      setAuthForm({
        name: "",
        email: "",
        password: ""
      });

      setAuthMessage(
        authMode === "register"
          ? "Registration successful!"
          : "Login successful!"
      );

      // Open the appropriate page
      setActiveSection(
        savedStudentId ? "dashboard" : "career"
      );

    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };
  const [activeSection, setActiveSection] = useState("career");
  // Knowledge Base States
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");
  const [agentMessage, setAgentMessage] = useState("");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentChatHistory, setAgentChatHistory] = useState([]);
  // AI AGENT VOICE INPUT
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  const recognitionRef = useRef(null);
  // LEARNING RESOURCES STATES
  const [resourceCareer, setResourceCareer] = useState("");
  const [resourceCategory, setResourceCategory] = useState("all");
  const [resourceLevel, setResourceLevel] = useState("beginner");
  const [resourceResults, setResourceResults] = useState(null);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");
  // ANALYTICS DASHBOARD STATES
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  // FETCH ANALYTICS DATA FROM MONGODB
  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");

      const response = await fetch(
        "https://ai-career-guidance-backend.onrender.com/api/analytics"
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch analytics."
        );
      }

      setAnalyticsData(result.analytics);

    } catch (error) {
      console.error("Analytics Fetch Error:", error);
      setAnalyticsError(error.message);

    } finally {
      setAnalyticsLoading(false);
    }
  };
  // LOAD ANALYTICS WHEN ANALYTICS PAGE OPENS
  useEffect(() => {
    if (activeSection === "analytics") {
      fetchAnalytics();
    }
  }, [activeSection]);


  const handleSectionNavigation = (section) => {

    if (
      !guidance &&
      !["career", "resume", "alignment", "agent", "knowledge", "progress", "resources", "analytics",].includes(section)
    ) {
      setActiveSection("career");
      setMessage("Please complete your student profile first.");
      return;
    }

    setActiveSection(section);
    setMessage("");
  };


  const [formData, setFormData] = useState({

    name: "",

    education: "",

    skills: "",

    interests: "",

    programming: "",

    experience: "",

    career: ""
  });


  const [guidance, setGuidance] =
    useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [originalProfileData, setOriginalProfileData] = useState(null);
  const [studentId, setStudentId] = useState(null);
  // RESTORE SAVED CAREER GUIDANCE
  useEffect(() => {
    if (!studentId) return;

    const loadSavedGuidance = async () => {
      try {
        const response = await fetch(
          `https://ai-career-guidance-backend.onrender.com/api/students/${studentId}/guidance`,
          {
            headers: {
              "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to retrieve saved guidance."
          );
        }

        const normalized = normalizeGuidance(data.aiGuidance);

        if (!normalized) {
          throw new Error("Saved career guidance is invalid.");
        }
        setFormData({
          name: data.student.name || "",
          education: data.student.education || "",
          skills: data.student.skills || "",
          interests: data.student.interests || "",
          programming: data.student.programming || "",
          experience: data.student.experience || "",
          career: data.student.career || ""
        });

        setGuidance(normalized);
        setMessage("");

        console.log("✅ Saved career guidance restored");

      } catch (error) {
        console.error("Guidance restoration error:", error);
        setMessage(error.message);
      }
    };

    loadSavedGuidance();

  }, [studentId]);


  const [message, setMessage] =
    useState("");


  const [loading, setLoading] =
    useState(false);

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeMessage, setResumeMessage] = useState("");
  // CAREER ALIGNMENT STATES

  const [alignmentLoading, setAlignmentLoading] = useState(false);
  const [alignmentResult, setAlignmentResult] = useState(null);
  const [alignmentMessage, setAlignmentMessage] = useState("");
  // PROGRESS TRACKING STATES
  const [completedProgressItems, setCompletedProgressItems] = useState([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressLoaded, setProgressLoaded] = useState(false);
  // PROGRESS CALCULATIONS
  const totalSkills =
    guidance?.skillsToLearn?.length || 0;

  const totalRoadmapTopics =
    guidance?.learningRoadmap?.reduce(
      (total, month) =>
        total + (Array.isArray(month.topics) ? month.topics.length : 0),
      0
    ) || 0;

  const totalProgressItems =
    totalSkills + totalRoadmapTopics;

  const validProgressIds = [
    ...(guidance?.skillsToLearn || []).map(
      (_, index) => `skill-${index}`
    ),
    ...(guidance?.learningRoadmap || []).flatMap(
      (month, monthIndex) =>
        (Array.isArray(month.topics) ? month.topics : []).map(
          (_, topicIndex) => `roadmap-${monthIndex}-${topicIndex}`
        )
    )
  ];

  const completedProgressCount =
    validProgressIds.filter(
      (id) => completedProgressItems.includes(id)
    ).length;

  const progressPercentage =
    totalProgressItems > 0
      ? Math.round(
        (completedProgressCount / totalProgressItems) * 100
      )
      : 0;
  // LOAD STUDENT PROGRESS FROM MONGODB
  useEffect(() => {
    if (!studentId) return;

    const loadProgress = async () => {
      setProgressLoading(true);
      setProgressLoaded(false);

      try {
        const response = await fetch(
          `https://ai-career-guidance-backend.onrender.com/api/progress/${studentId}`,
          {
            headers: {
              "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load progress.");
        }

        setCompletedProgressItems(data.completedItems || []);

      } catch (error) {
        console.error("Progress loading error:", error);
        setProgressMessage(error.message);

      } finally {
        setProgressLoading(false);
        setProgressLoaded(true);
      }
    };

    loadProgress();
  }, [studentId]);
  // MANUAL SAVE STUDENT PROGRESS
  const handleSaveProgress = async () => {
    if (!studentId) {
      setProgressMessage("Student ID not found. Please load your profile.");
      return;
    }

    setProgressLoading(true);
    setProgressMessage("");

    try {
      const response = await fetch(
        `https://ai-career-guidance-backend.onrender.com/api/progress/${studentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
          },
          body: JSON.stringify({
            completedItems: completedProgressItems
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save progress.");
      }

      setProgressMessage("Progress saved successfully!");

    } catch (error) {
      console.error("Progress saving error:", error);
      setProgressMessage(error.message);

    } finally {
      setProgressLoading(false);
    }
  };
  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (event) => {

    const {
      name,
      value
    } = event.target;


    setFormData(
      (previous) => ({

        ...previous,

        [name]: value
      })
    );
  };
  // ============================================
  // RESUME UPLOAD & ANALYSIS
  // ============================================

  const handleResumeUpload = async () => {

    if (!resumeFile) {
      setResumeMessage("❌ Please select a PDF or DOCX resume.");
      return;
    }

    const formData = new FormData();

    formData.append("resume", resumeFile);
    if (guidance?.recommendedCareer?.career) {
      formData.append(
        "recommendedCareer",
        guidance.recommendedCareer.career
      );
    }

    try {

      setResumeLoading(true);
      setResumeMessage("");
      setResumeResult(null);

      const response = await fetch(
        "https://ai-career-guidance-backend.onrender.com/api/resume/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Resume analysis failed."
        );
      }

      console.log("📄 Resume analysis:", data);

      setResumeResult(data);

      setResumeMessage(
        "✅ Resume analyzed successfully!"
      );

    } catch (error) {

      console.error(
        "Resume upload error:",
        error
      );


      const errorText = String(error?.message || "");

      if (
        /503|service unavailable|high demand|temporarily unavailable/i.test(errorText)
      ) {
        setResumeMessage(
          "⚠️ Gemini AI is temporarily busy. Your resume is safe. Please try again later."
        );
      } else {
        setResumeMessage(
          "❌ " + errorText
        );
      }

    } finally {

      setResumeLoading(false);

    }
  };
  // CAREER ALIGNMENT HANDLER
  const handleCareerAlignment = async () => {

    // Check both requirements
    if (!guidance && !resumeFile) {
      setAlignmentMessage(
        "Please complete Student Information and upload your resume first."
      );
      return;
    }

    if (!guidance) {
      setAlignmentMessage(
        "Please complete Student Information first."
      );
      return;
    }

    if (!resumeFile) {
      setAlignmentMessage(
        "Please upload your resume in the Resume Analyzer section first."
      );
      return;
    }

    const recommendedCareer = guidance.recommendedCareer;

    if (!recommendedCareer || recommendedCareer === "N/A") {
      setAlignmentMessage(
        "Recommended career is not available. Please complete Career Guidance first."
      );
      return;
    }

    const uploadData = new FormData();

    uploadData.append("resume", resumeFile);
    uploadData.append(
      "studentInformation",
      JSON.stringify(formData)
    );
    uploadData.append(
      "recommendedCareer",
      recommendedCareer
    );

    try {
      setAlignmentLoading(true);
      setAlignmentMessage("");
      setAlignmentResult(null);

      const response = await fetch(
        "https://ai-career-guidance-backend.onrender.com/api/career-alignment",
        {
          method: "POST",
          body: uploadData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Career Alignment failed."
        );
      }

      setAlignmentResult(data.alignment);

      setAlignmentMessage(
        "Career Alignment completed successfully!"
      );

    } catch (error) {

      setAlignmentMessage(
        error.message || "Career Alignment failed."
      );

    } finally {
      setAlignmentLoading(false);
    }
  };
  // ============================================
  // AI CAREER AGENT VOICE INPUT
  // ============================================

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice recognition is not supported in this browser. Please use Google Chrome."
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setShowVoicePanel(true);
      setVoiceError("");
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setAgentMessage((previous) =>
        previous
          ? previous + " " + transcript
          : transcript
      );
    };

    recognition.onerror = (event) => {
      console.log("Voice Recognition Error:", event.error);

      setVoiceError(
        `Voice error: ${event.error}`
      );

      setIsListening(false);
      setShowVoicePanel(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsListening(false);
    setShowVoicePanel(false);
  };
  const handleSaveProfile = async () => {
    if (!studentId) {
      alert("Student ID not found. Please log in again.");
      return;
    }

    const requiredFields = [
      "name",
      "education",
      "skills",
      "interests",
      "programming",
      "experience",
      "career"
    ];

    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        alert(`Please enter ${field}.`);
        return;
      }
    }

    try {
      setIsSavingProfile(true);

      const response = await fetch(
        `https://ai-career-guidance-backend.onrender.com/api/student/profile/${studentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setFormData({
        ...data.student,
        name: data.student.name,
        education: data.student.education,
        skills: data.student.skills,
        interests: data.student.interests,
        programming: data.student.programming,
        experience: data.student.experience,
        career: data.student.career
      });

      setIsEditingProfile(false);
      setOriginalProfileData(null);

      alert("Profile updated successfully!");

    } catch (error) {
      console.error("Profile update error:", error);
      alert(error.message || "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelProfileEdit = () => {
    if (originalProfileData) {
      setFormData(originalProfileData);
    }

    setIsEditingProfile(false);
    setOriginalProfileData(null);
  };
  // ============================================
  // AI CAREER AGENT HANDLER
  // ============================================

  const handleCareerAgent = async () => {

    if (!agentMessage.trim()) {
      return;
    }


    const userMessage = agentMessage.trim();

    setAgentChatHistory(prev => [
      ...prev,
      {
        role: "user",
        text: userMessage
      }
    ]);

    setAgentMessage("");

    try {
      setAgentLoading(true);

      const response = await fetch(
        "https://ai-career-guidance-backend.onrender.com/api/career-agent/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: userMessage,
            student: formData
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "AI Career Agent failed."
        );
      }


      setAgentChatHistory(prev => [
        ...prev,
        {
          role: "assistant",
          text: data.answer
        }
      ]);
    } catch (error) {

      setAgentChatHistory(prev => [
        ...prev,
        {
          role: "assistant",
          text: error.message || "AI Career Agent failed. Please try again."
        }
      ]);

    } finally {
      setAgentLoading(false);
    }
  };
  // ============================================
  // KNOWLEDGE BASE SEARCH HANDLER
  // ============================================

  const handleKnowledgeSearch = async () => {

    if (!knowledgeQuery.trim()) {
      setKnowledgeError("Please enter a career or skill to search.");
      return;
    }

    try {
      setKnowledgeLoading(true);
      setKnowledgeError("");
      setKnowledgeResults([]);

      const response = await fetch(
        "https://ai-career-guidance-backend.onrender.com/api/career-knowledge/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: knowledgeQuery.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Knowledge search failed."
        );
      }
      const results = data.results || [];

      const searchTerm = knowledgeQuery.trim().toLowerCase();

      const sortedResults = [...results].sort((a, b) => {

        const careerA = (a.career?.careerName || "").toLowerCase();
        const careerB = (b.career?.careerName || "").toLowerCase();

        const exactA = careerA === searchTerm;
        const exactB = careerB === searchTerm;

        return Number(exactB) - Number(exactA);
      });

      setKnowledgeResults(sortedResults);

      if (!data.results || data.results.length === 0) {
        setKnowledgeError("No relevant career information found.");
      }

    } catch (error) {

      setKnowledgeError(
        error.message || "Unable to search career knowledge."
      );

    } finally {
      setKnowledgeLoading(false);
    }
  };
  // LEARNING RESOURCES SEARCH HANDLER
  const handleLearningResourceSearch = async () => {
    if (!resourceCareer.trim()) {
      setResourceError("Please enter a career name.");
      return;
    }

    try {
      setResourceLoading(true);
      setResourceError("");
      setResourceResults(null);

      const response = await fetch(
        "https://ai-career-guidance-backend.onrender.com/api/learning-resources/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            career: resourceCareer.trim(),
            skills: (formData.skills || "")
              .split(",")
              .map(skill => skill.trim())
              .filter(Boolean),
            category: resourceCategory,
            level: resourceLevel
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Learning resource search failed."
        );
      }

      const textContent = (data.results || [])
        .filter(item => item.type === "text")
        .map(item => item.text)
        .join("\n");

      try {
        setResourceResults(JSON.parse(textContent));
      } catch {
        setResourceResults({
          recommendations: textContent,
          sources: []
        });
      }

    } catch (error) {
      setResourceError(error.message);
    } finally {
      setResourceLoading(false);
    }
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event) => {

    event.preventDefault();


    setLoading(true);

    setMessage("");

    setGuidance(null);


    try {

      console.log(
        "Sending student data..."
      );


      const response =
        await fetch(
          "https://ai-career-guidance-backend.onrender.com/api/students",
          {

            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              "Authorization": `Bearer ${sessionStorage.getItem("authToken")}`
            },

            body:
              JSON.stringify(
                formData
              )
          }
        );


      const data =
        await response.json();


      console.log(
        "Backend response:",
        data
      );

      if (!response.ok) {
        const validationMessage =
          data.issues && data.issues.length > 0
            ? `${data.message || "Profile validation failed."}\n\n${data.issues
              .map((issue, index) => `${index + 1}. ${issue}`)
              .join("\n")}`
            : data.error ||
            data.message ||
            "Server error";

        throw new Error(validationMessage);
      }

      const normalized =
        normalizeGuidance(
          data.aiGuidance
        );


      console.log(
        "Normalized guidance:",
        normalized
      );


      if (!normalized) {

        throw new Error(
          "AI guidance was not returned."
        );
      }

      setGuidance(
        normalized
      );
      setStudentId(data.student._id);
      localStorage.setItem("studentId", data.student._id);
      setActiveSection("dashboard");
      setMessage(
        "Student data saved successfully!"
      );


    } catch (error) {

      console.error(
        "Frontend error:",
        error
      );


      setMessage(
        "❌ " +
        error.message
      );


    } finally {

      setLoading(false);
    }
  };
  /* =======================================================
     RESET ANALYSIS
  ======================================================= */

  const handleReset = () => {

    setFormData({

      name: "",

      education: "",

      skills: "",

      interests: "",

      programming: "",

      experience: "",

      career: ""
    });

    setGuidance(null);

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  };
  /* =======================================================
     DOWNLOAD PDF REPORT
  ======================================================= */
  const handleDownloadPDF = () => {

    try {

      /* =========================================
         VALIDATION
      ========================================= */

      if (!guidance) {

        alert(
          "Please generate AI career guidance first."
        );

        return;
      }


      /* =========================================
         CREATE PDF
      ========================================= */

      const doc =
        new jsPDF(
          "p",
          "mm",
          "a4"
        );


      const pageWidth =
        doc.internal.pageSize.getWidth();


      const pageHeight =
        doc.internal.pageSize.getHeight();


      const margin = 18;


      let y = 20;


      /* =========================================
         HELPER: CHECK PAGE SPACE
      ========================================= */

      const checkPageSpace =
        (space = 20) => {

          if (
            y + space >
            pageHeight - 20
          ) {

            doc.addPage();

            y = 20;
          }
        };


      /* =========================================
         HELPER: SECTION TITLE
      ========================================= */

      const addSectionTitle =
        (title) => {

          checkPageSpace(18);


          doc.setFillColor(
            84,
            40,
            216
          );


          doc.roundedRect(
            margin,
            y - 6,
            pageWidth - margin * 2,
            10,
            2,
            2,
            "F"
          );


          doc.setTextColor(
            255,
            255,
            255
          );


          doc.setFontSize(13);

          doc.setFont(
            "helvetica",
            "bold"
          );


          doc.text(
            title,
            margin + 4,
            y
          );


          doc.setTextColor(
            0,
            0,
            0
          );


          y += 14;
        };


      /* =========================================
         HELPER: NORMAL TEXT
      ========================================= */

      const addText =
        (
          text,
          fontSize = 10,
          spaceAfter = 7
        ) => {

          if (
            text === undefined ||
            text === null
          ) {

            text = "N/A";
          }


          const textValue =
            String(text);


          doc.setFontSize(
            fontSize
          );


          doc.setFont(
            "helvetica",
            "normal"
          );


          const lines =
            doc.splitTextToSize(
              textValue,
              pageWidth - margin * 2
            );


          checkPageSpace(
            lines.length * 6 + spaceAfter
          );


          doc.text(
            lines,
            margin,
            y
          );


          y +=
            lines.length * 6 +
            spaceAfter;
        };


      /* =========================================
         HELPER: BULLET LIST
      ========================================= */

      const addBulletList =
        (items) => {

          const list =
            Array.isArray(items)
              ? items
              : [];


          if (
            list.length === 0
          ) {

            addText("N/A");

            return;
          }


          list.forEach(
            (item) => {

              let value = item;


              if (
                typeof item === "object" &&
                item !== null
              ) {

                value =
                  getValue(
                    item,
                    [
                      "name",
                      "title",
                      "skill",
                      "role",
                      "advice",
                      "description",
                      "text",
                      "career"
                    ],
                    "N/A"
                  );
              }


              const lines =
                doc.splitTextToSize(
                  `• ${String(value)}`,
                  pageWidth -
                  margin * 2 -
                  4
                );


              checkPageSpace(
                lines.length * 6 + 4
              );


              doc.setFontSize(10);

              doc.setFont(
                "helvetica",
                "normal"
              );


              doc.text(
                lines,
                margin + 2,
                y
              );


              y +=
                lines.length * 6 +
                3;
            }
          );


          y += 3;
        };


      /* =========================================
         COVER / TITLE
      ========================================= */

      doc.setFillColor(
        84,
        40,
        216
      );


      doc.rect(
        0,
        0,
        pageWidth,
        45,
        "F"
      );


      doc.setTextColor(
        255,
        255,
        255
      );


      doc.setFontSize(24);

      doc.setFont(
        "helvetica",
        "bold"
      );


      doc.text(
        "AI Career Guidance Report",
        pageWidth / 2,
        22,
        {
          align: "center"
        }
      );


      doc.setFontSize(11);

      doc.setFont(
        "helvetica",
        "normal"
      );


      doc.text(
        "Personalized career analysis powered by AI",
        pageWidth / 2,
        32,
        {
          align: "center"
        }
      );


      doc.setTextColor(
        0,
        0,
        0
      );


      y = 58;


      /* =========================================
         STUDENT INFORMATION
      ========================================= */

      addSectionTitle(
        "Student Information"
      );


      autoTable(
        doc,
        {

          startY: y,

          head: [
            [
              "Field",
              "Information"
            ]
          ],

          body: [

            [
              "Name",
              formData.name || "N/A"
            ],

            [
              "Education",
              formData.education || "N/A"
            ],

            [
              "Skills",
              formData.skills || "N/A"
            ],

            [
              "Interests",
              formData.interests || "N/A"
            ],

            [
              "Programming",
              formData.programming || "N/A"
            ],

            [
              "Experience",
              formData.experience || "N/A"
            ],

            [
              "Preferred Career",
              formData.career || "N/A"
            ]

          ],

          theme: "grid",

          headStyles: {
            fillColor: [
              84,
              40,
              216
            ]
          },

          margin: {
            left: margin,
            right: margin
          }

        }
      );



      y =
        doc.lastAutoTable.finalY +
        12;


      /* =========================================
         CAREER RECOMMENDATION
      ========================================= */

      addSectionTitle(
        "AI Career Recommendation"
      );


      doc.setFontSize(16);

      doc.setFont(
        "helvetica",
        "bold"
      );


      doc.setTextColor(
        84,
        40,
        216
      );


      doc.text(
        guidance.recommendedCareer ||
        "N/A",
        margin,
        y
      );


      doc.setTextColor(
        0,
        0,
        0
      );


      y += 9;


      doc.setFontSize(10);

      doc.setFont(
        "helvetica",
        "normal"
      );


      const matchScore =
        Number.isFinite(
          guidance.careerMatchScore
        )
          ? `${guidance.careerMatchScore}%`
          : "N/A";


      doc.text(
        `Career Match Score: ${matchScore}`,
        margin,
        y
      );


      y += 10;


      /* =========================================
         ALTERNATIVE CAREERS
      ========================================= */

      addText(
        "Alternative Careers:",
        11,
        4
      );


      addBulletList(
        guidance.alternativeCareers
      );


      /* =========================================
         WHY THIS CAREER
      ========================================= */

      addSectionTitle(
        "Why This Career?"
      );


      addText(
        guidance.whyThisCareer ||
        "N/A"
      );


      /* =========================================
         PROFILE ANALYSIS
      ========================================= */

      addSectionTitle(
        "Profile Analysis"
      );


      const profile =
        guidance.profileAnalysis ||
        {};


      autoTable(
        doc,
        {

          startY: y,

          head: [
            [
              "Profile Area",
              "Score"
            ]
          ],

          body: [

            [
              "Skills",
              Number.isFinite(
                profile.skillsScore
              )
                ? `${profile.skillsScore}%`
                : "N/A"
            ],

            [
              "Interests",
              Number.isFinite(
                profile.interestsScore
              )
                ? `${profile.interestsScore}%`
                : "N/A"
            ],

            [
              "Education",
              Number.isFinite(
                profile.educationScore
              )
                ? `${profile.educationScore}%`
                : "N/A"
            ],

            [
              "Programming",
              Number.isFinite(
                profile.programmingScore
              )
                ? `${profile.programmingScore}%`
                : "N/A"
            ],

            [
              "Experience",
              Number.isFinite(
                profile.experienceScore
              )
                ? `${profile.experienceScore}%`
                : "N/A"
            ]

          ],

          theme: "grid",

          headStyles: {
            fillColor: [
              84,
              40,
              216
            ]
          },

          margin: {
            left: margin,
            right: margin
          }

        }
      );


      y =
        doc.lastAutoTable.finalY +
        12;



      /* =========================================
         SKILL GAP ANALYSIS
      ========================================= */

      if (
        guidance.skillGapAnalysis &&
        guidance.skillGapAnalysis.length > 0
      ) {

        addSectionTitle(
          "Skill Gap Analysis"
        );


        autoTable(
          doc,
          {

            startY: y,

            head: [
              [
                "Skill",
                "Current",
                "Required",
                "Gap"
              ]
            ],

            body:
              guidance.skillGapAnalysis.map(
                (item) => [

                  item.skill || "N/A",

                  Number.isFinite(
                    item.currentScore
                  )
                    ? `${item.currentScore}%`
                    : "N/A",

                  Number.isFinite(
                    item.requiredScore
                  )
                    ? `${item.requiredScore}%`
                    : "N/A",

                  Number.isFinite(
                    item.gap
                  )
                    ? `${item.gap}%`
                    : "N/A"

                ]
              ),

            theme: "grid",

            headStyles: {
              fillColor: [
                84,
                40,
                216
              ]
            },

            margin: {
              left: margin,
              right: margin
            }

          }
        );


        y =
          doc.lastAutoTable.finalY +
          12;
      }


      /* =========================================
         SKILLS TO LEARN
      ========================================= */

      addSectionTitle(
        "Skills To Learn"
      );


      addBulletList(
        guidance.skillsToLearn
      );

      /* =========================================
         CAREER ADVICE
      ========================================= */

      addSectionTitle(
        "Personalized Career Advice"
      );


      addBulletList(
        guidance.careerAdvice
      );


      /* =========================================
         PAGE NUMBERS
      ========================================= */

      const totalPages =
        doc.getNumberOfPages();


      for (
        let page = 1;
        page <= totalPages;
        page++
      ) {

        doc.setPage(page);


        doc.setFontSize(8);

        doc.setTextColor(
          100,
          100,
          100
        );


        doc.text(
          `AI Career Guidance Report • Page ${page} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          {
            align: "center"
          }
        );
      }


      /* =========================================
         SAFE FILE NAME
      ========================================= */

      const safeName =
        formData.name
          ? formData.name
            .trim()
            .replace(
              /\s+/g,
              "_"
            )
            .replace(
              /[^a-zA-Z0-9_-]/g,
              ""
            )
          : "Student";


      /* =========================================
         SAVE PDF
      ========================================= */

      doc.save(
        `${safeName}_Career_Guidance_Report.pdf`
      );
      // Add copyright to the bottom of every PDF page
      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);

        doc.text(
          "© 2026 AI Career Guidance System. All Rights Reserved.",
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }


      alert(
        "✅ Career report downloaded successfully!"
      );


    } catch (error) {

      console.error(
        "PDF download error:",
        error
      );


      alert(
        "❌ Unable to generate the PDF report. Please try again."
      );
    }
  };
  /* =======================================================
     DASHBOARD DATA
  ======================================================= */

  const profileData = guidance
    ? [

      {
        subject: "Skills",
        value:
          guidance.profileAnalysis.skillsScore,
        fullMark: 100
      },

      {
        subject: "Interests",
        value:
          guidance.profileAnalysis.interestsScore,
        fullMark: 100
      },

      {
        subject: "Education",
        value:
          guidance.profileAnalysis.educationScore,
        fullMark: 100
      },

      {
        subject: "Programming",
        value:
          guidance.profileAnalysis.programmingScore,
        fullMark: 100
      },

      {
        subject: "Experience",
        value:
          guidance.profileAnalysis.experienceScore,
        fullMark: 100
      }
    ]
    : [];


  const validProfileScores =
    profileData.filter(
      (item) =>
        Number.isFinite(
          item.value
        )
    );


  const strongestArea =
    validProfileScores.length > 0
      ? validProfileScores.reduce(
        (best, current) =>
          current.value >
            best.value
            ? current
            : best
      )
      : null;
  const careerChartData =
    guidance
      ? guidance.careerComparison
      : [];


  const skillChartData =
    guidance
      ? guidance.skillGapAnalysis
      : [];


  /* =======================================================
     RETURN
  ======================================================= */
  return (
    !authToken ? (
      <div className="auth-container">
        <div className="auth-card">

          <h1>AI Career Guidance</h1>

          <p>
            {authMode === "login"
              ? "Welcome back! Login to continue."
              : "Create your student account."}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === "register" ? "active" : ""}
              onClick={() => {
                setAuthMode("register");
                setAuthMessage("");
              }}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit}>

            {authMode === "register" && (
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={authForm.name}
                onChange={handleAuthChange}
                required
              />
            )}

            <input
              type="email"
              name="email"
              disabled={authLoading}
              placeholder="Email Address"
              value={authForm.email}
              onChange={handleAuthChange}
              required
            />

            <input
              type={showPassword ? "text" : "password"}
              name="password"
              disabled={authLoading}
              placeholder="Password (minimum 4 characters)"
              value={authForm.password}
              onChange={handleAuthChange}
              minLength={4}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              title={showPassword ? "Hide password" : "Show password"}
            >

              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {showPassword ? (
                  <>
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 9 5 9 7a9.5 9.5 0 0 1-2.1 3.1" />
                    <path d="M6.2 6.2C3.7 7.7 3 10.3 3 12c0 2 4 7 9 7a9.5 9.5 0 0 0 3.1-.5" />
                  </>
                ) : (
                  <>
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>

            <button
              type="submit"
              disabled={authLoading}
            >
              {authLoading
                ? (authMode === "login" ? "Logging in..." : "Creating account...")
                : authMode === "login"
                  ? "Login"
                  : "Create Account"}
            </button>

          </form>

          {authMessage && (
            <p className="auth-message">
              {authMessage}
            </p>
          )}

        </div>
      </div>
    ) : (


      <div className="app">
        <Navigation activeSection={activeSection} setActiveSection={handleSectionNavigation} />





        {/* ===================================================
          HEADER
      =================================================== */}

        <header className="header">

          <div className="robot">
            🤖
          </div>

          <h1>
            AI Career Guidance
          </h1>

          <p>
            Discover the right career path
            using Artificial Intelligence.
          </p>

          <small>
            AI-powered analysis of your career profile
          </small>

        </header>


        {/* ===================================================
          STUDENT FORM
      =================================================== */}

        {activeSection === 'career' && (
          <section className="career-form">

            <h2>
              👤 Student Information
            </h2>


            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="form-grid">


                <div className="form-group">

                  <label>
                    Name
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter your name"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Education
                  </label>

                  <input
                    type="text"
                    name="education"
                    value={
                      formData.education
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: BCA"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Skills
                  </label>

                  <input
                    type="text"
                    name="skills"
                    value={
                      formData.skills
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: Python, SQL"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Interests
                  </label>

                  <input
                    type="text"
                    name="interests"
                    value={
                      formData.interests
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: AI, Data Science"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Programming
                  </label>

                  <input
                    type="text"
                    name="programming"
                    value={
                      formData.programming
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Example: Python"
                    required
                  />

                </div>


                <div className="form-group">

                  <label>
                    Experience
                  </label>

                  <select
                    name="experience"
                    value={
                      formData.experience
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      Select experience
                    </option>

                    <option value="Beginner">
                      Beginner
                    </option>

                    <option value="Intermediate">
                      Intermediate
                    </option>

                    <option value="Advanced">
                      Advanced
                    </option>

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Preferred Career
                  </label>

                  <select
                    name="career"
                    value={
                      formData.career
                    }
                    onChange={
                      handleChange
                    }
                    required
                  >

                    <option value="">
                      Select career
                    </option>

                    <option value="Data Science">
                      Data Science
                    </option>

                    <option value="Artificial Intelligence">
                      Artificial Intelligence
                    </option>

                    <option value="Machine Learning">
                      Machine Learning
                    </option>

                    <option value="Web Development">
                      Web Development
                    </option>

                    <option value="Cloud Computing">
                      Cloud Computing
                    </option>

                    <option value="Cyber Security">
                      Cyber Security
                    </option>

                    <option value="Software Development">
                      Software Development
                    </option>

                  </select>

                </div>

              </div>


              <button
                type="submit"
                className="submit-button"
                disabled={
                  loading
                }
              >

                {loading
                  ? "🤖 Generating AI Guidance..."
                  : "🚀 Get Career Guidance"
                }

              </button>
              <button
                type="button"
                className="reset-button"
                onClick={handleReset}
                disabled={loading}
              >
                🔄 New Analysis
              </button>

            </form>

          </section>
        )}
        {/* ANALYTICS DASHBOARD */}
        {activeSection === "analytics" && (
          <section className="analytics-page">

            <div className="analytics-header">
              <div>
                <h2>📊 Analytics Dashboard</h2>
                <p>
                  Insights and statistics based on registered student data.
                </p>
              </div>

              <button
                className="submit-button"
                onClick={fetchAnalytics}
                disabled={analyticsLoading}
              >
                {analyticsLoading ? "Refreshing..." : "↻ Refresh Data"}
              </button>
            </div>

            {analyticsLoading && (
              <p className="analytics-message">
                Loading analytics from MongoDB...
              </p>
            )}

            {analyticsError && (
              <p className="error-message">{analyticsError}</p>
            )}

            {!analyticsLoading && analyticsData && (
              <>
                {/* SUMMARY CARDS */}
                <div className="analytics-summary-grid">

                  <div className="analytics-summary-card">
                    <span>👨‍🎓</span>
                    <p>Total Students</p>
                    <h3>{analyticsData.totalStudents}</h3>
                  </div>

                  <div className="analytics-summary-card">
                    <span>💼</span>
                    <p>Career Categories</p>
                    <h3>{analyticsData.careerDistribution?.length || 0}</h3>
                  </div>

                  <div className="analytics-summary-card">
                    <span>🎓</span>
                    <p>Education Categories</p>
                    <h3>{analyticsData.educationDistribution?.length || 0}</h3>
                  </div>

                  <div className="analytics-summary-card">
                    <span>💻</span>
                    <p>Skill Categories</p>
                    <h3>{analyticsData.skillsDistribution?.length || 0}</h3>
                  </div>

                </div>

                {/* CAREER DISTRIBUTION */}
                <div className="analytics-chart-grid">

                  <div className="analytics-chart-card">
                    <h3>💼 Career Distribution</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={analyticsData.careerDistribution}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <YAxis
                          type="category"
                          dataKey="_id"
                          width={110}
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => {
                            const labels = {
                              bca: "BCA",
                              bba: "BBA",
                              bcom: "B.Com",
                              ba: "BA",
                              bsc: "B.Sc",
                              mca: "MCA",
                              mba: "MBA",
                              msc: "M.Sc",
                              puc: "PUC",
                              sslc: "SSLC"
                            };

                            return labels[value] ||
                              value.toUpperCase();
                          }}
                        />

                        <Tooltip />
                        <Bar
                          dataKey="count"
                          name="Students"
                          fill="#6366f1"
                          radius={[0, 6, 6, 0]}
                          barSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* EDUCATION DISTRIBUTION */}
                  <div className="analytics-chart-card">
                    <h3>🎓 Education Distribution</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={analyticsData.educationDistribution.slice(0, 8)}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="_id"
                          width={110}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          name="Students"
                          fill="#0ea5e9"
                          radius={[0, 6, 6, 0]}
                          barSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* SKILLS DISTRIBUTION */}
                  <div className="analytics-chart-card">
                    <h3>🧠 Skills Distribution</h3>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart
                        data={analyticsData.skillsDistribution.slice(0, 8)}
                        layout="vertical"
                        margin={{ top: 5, right: 25, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="_id"
                          width={110}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="count"
                          name="Students"
                          fill="#10b981"
                          radius={[0, 6, 6, 0]}
                          barSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* REGISTRATION TREND */}
                  <div className="analytics-chart-card">
                    <h3>📈 Student Registration Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData.registrationTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Registrations"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* PROGRAMMING DISTRIBUTION */}
                  <div className="analytics-chart-card">
                    <h3>💻 Programming Knowledge</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analyticsData.programmingDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Students" fill="#f59e0b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* EXPERIENCE DISTRIBUTION */}
                  <div className="analytics-chart-card">
                    <h3>🚀 Experience Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analyticsData.experienceDistribution}
                          dataKey="count"
                          nameKey="_id"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {analyticsData.experienceDistribution?.map((entry, index) => (
                            <Cell
                              key={`experience-${index}`}
                              fill={[
                                "#0ea5e9",
                                "#8b5cf6",
                                "#f97316",
                                "#14b8a6"
                              ][index % 4]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                </div>
              </>
            )}

            {!analyticsLoading && !analyticsError && !analyticsData && (
              <p className="analytics-message">
                Analytics data is not available yet.
              </p>
            )}

          </section>
        )}
        {/* ========================================
    MCP LEARNING RESOURCES PAGE
======================================== */}

        {activeSection === "resources" && (
          <section className="learning-resources-page">

            <h2>📚 AI Learning Resources</h2>

            <p>
              Discover courses, tutorials, documentation,
              practice platforms and projects for your career.
            </p>

            <div className="form-grid">

              <div className="form-group">
                <label>Choose Your Career</label>

                <input
                  type="text"
                  value={resourceCareer}
                  onChange={(e) => setResourceCareer(e.target.value)}
                  placeholder="Example: Data Scientist"
                />
              </div>

              <div className="form-group">
                <label>Resource Category</label>

                <select
                  value={resourceCategory}
                  onChange={(e) => setResourceCategory(e.target.value)}
                >
                  <option value="all">All Resources</option>
                  <option value="courses">Courses</option>
                  <option value="tutorials">Tutorials</option>
                  <option value="documentation">Documentation</option>
                  <option value="practice">Practice</option>
                  <option value="projects">Projects</option>
                </select>
              </div>

              <div className="form-group">
                <label>Learning Level</label>

                <select
                  value={resourceLevel}
                  onChange={(e) => setResourceLevel(e.target.value)}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

            </div>

            <button
              type="button"
              className="submit-button"
              onClick={handleLearningResourceSearch}
              disabled={resourceLoading}
            >
              {resourceLoading
                ? "Searching Resources..."
                : "🔍 Find Learning Resources"
              }
            </button>

            {resourceError && (
              <p className="error-message">{resourceError}</p>
            )}

            {resourceLoading && (
              <p>🤖 AI is searching for learning resources...</p>
            )}
            {resourceResults && (
              <div className="resource-results">

                <div className="resource-results-header">
                  <h3>Recommended Learning Resources</h3>
                  <p>
                    Explore carefully selected resources for your career.
                  </p>
                  <span>
                    {resourceResults.sources?.length || 0} resources found
                  </span>
                </div>

                <div className="resource-cards">

                  {resourceResults.sources?.map((resource, index) => (
                    <div className="resource-card" key={index}>

                      <div className="resource-card-top">
                        <span className="resource-number">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        <span className="free-badge">
                          Free
                        </span>
                      </div>

                      <h4>{resource.title}</h4>

                      <p className="resource-provider">
                        By {resource.provider}
                      </p>

                      <p className="resource-description">
                        {resource.description}
                      </p>

                      <div className="resource-tags">
                        <span>{resource.category}</span>
                        <span>{resource.level}</span>
                      </div>

                      <a
                        href={resource.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        Explore Resource ↗
                      </a>

                    </div>
                  ))}

                </div>

                {(!resourceResults.sources ||
                  resourceResults.sources.length === 0) && (
                    <p>No matching resources found. Try another category.</p>
                  )}

              </div>
            )}



          </section>
        )}

        {/* ========================================
    PROGRESS TRACKING PAGE
======================================== */}

        {activeSection === "progress" && guidance && (
          <section className="progress-page">

            <h2>📊 My Learning Progress</h2>
            {progressLoading && (
              <p>⏳ Loading or saving your progress...</p>
            )}

            {progressMessage && (
              <p>{progressMessage}</p>
            )}
            <div className="progress-summary">

              <h3>Overall Completion</h3>

              <h2>{progressPercentage}%</h2>

              <p>
                {completedProgressCount} of {totalProgressItems} items completed
              </p>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>

            </div>

            <p>Track your completed skills and learning roadmap.</p>
            <div className="progress-save-container">
              <button
                type="button"
                className="save-progress-button"
                onClick={handleSaveProgress}
                disabled={progressLoading || !progressLoaded}
              >
                {progressLoading ? "Saving Progress..." : "💾 Save Progress"}
              </button>
            </div>

            <h3>💻 Skills to Learn</h3>

            {guidance.skillsToLearn?.map((skill, index) => {
              const itemId = `skill-${index}`;

              return (
                <label key={itemId} className="progress-item">
                  <input
                    type="checkbox"
                    checked={completedProgressItems.includes(itemId)}
                    onChange={() => {
                      setCompletedProgressItems((previous) =>
                        previous.includes(itemId)
                          ? previous.filter((item) => item !== itemId)
                          : [...previous, itemId]
                      );
                    }}
                  />
                  {typeof skill === "string"
                    ? skill
                    : skill.name || skill.skill || JSON.stringify(skill)}
                </label>
              );
            })}

            <h3>📚 Learning Roadmap</h3>
            {guidance.learningRoadmap?.map((month, monthIndex) => (
              <div className="roadmap-month" key={`month-${monthIndex}`}>

                <h4>{month.month || `Month ${monthIndex + 1}`}</h4>

                <p>{month.goal || ""}</p>

                <div className="roadmap-topics">
                  {(Array.isArray(month.topics) ? month.topics : []).map(
                    (topic, topicIndex) => {
                      const itemId = `roadmap-${monthIndex}-${topicIndex}`;

                      return (
                        <label key={itemId} className="progress-item">
                          <input
                            type="checkbox"
                            checked={completedProgressItems.includes(itemId)}
                            onChange={() => {
                              setCompletedProgressItems((previous) =>
                                previous.includes(itemId)
                                  ? previous.filter((item) => item !== itemId)
                                  : [...previous, itemId]
                              );
                            }}
                          />
                          {topic}
                        </label>
                      );
                    }
                  )}
                </div>

                {month.practice && (
                  <p className="roadmap-practice">
                    <strong>Practice:</strong> {month.practice}
                  </p>
                )}

              </div>
            ))}

          </section>
        )}
        {/* ===================================================
          MESSAGE
      =================================================== */}
        {/* MESSAGE */}
        {message && (
          <div className={`validation-message ${message.toLowerCase().includes("successfully")
            ? "success-message"
            : ""
            }`}>
            <div className="validation-message-icon">
              {message.toLowerCase().includes("successfully")
                ? "✓"
                : "❌"}
            </div>

            <div className="validation-message-content">
              <h3>
                {message.toLowerCase().includes("successfully")
                  ? "Success"
                  : message.toLowerCase().includes("profile validation failed")
                    ? "Profile Validation Failed"
                    : "Career Guidance Error"}
              </h3>

              <p>
                {message.toLowerCase().includes("429") ||
                  message.toLowerCase().includes("quota") ||
                  message.toLowerCase().includes("resource_exhausted")
                  ? "Gemini AI usage limit reached. Please try again later."
                  : message.replace("❌ ", "")}
              </p>
            </div>
          </div>
        )}
        {/* AI LOADING PANEL */}

        {loading && (

          <div className="ai-loading-panel">

            <div className="ai-loading-icon">
              🤖
            </div>

            <div className="ai-loading-content">

              <h2>
                AI is analyzing your profile...
              </h2>

              <p>
                Gemini is evaluating your skills, interests,
                education, experience, and career preferences.
              </p>

              <div className="loading-dots">

                <span></span>
                <span></span>
                <span></span>

              </div>

            </div>

          </div>

        )}

        {/* ===================================================
          STUDENT PROFILE
      =================================================== */}

        {guidance && !["resume", "interview", "skills", "resources", "knowledge", "analytics", "jobs", "agent"].includes(activeSection) && (
          <section className="student-card">

            <div className="profile-header">
              <h2>👤 Student Profile</h2>

              {!isEditingProfile && (
                <button
                  className="edit-profile-btn"
                  onClick={() => {
                    setOriginalProfileData({ ...formData });
                    setIsEditingProfile(true);
                  }}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>

            <div className="profile-grid">

              {/* Name */}
              <div>
                <strong>Name</strong>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.name || "N/A"}</span>
                )}
              </div>

              {/* Education */}
              <div>
                <strong>Education</strong>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        education: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.education || "N/A"}</span>
                )}
              </div>

              {/* Skills */}
              <div>
                <strong>Skills</strong>
                {isEditingProfile ? (
                  <textarea
                    value={formData.skills}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        skills: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.skills || "N/A"}</span>
                )}
              </div>

              {/* Interests */}
              <div>
                <strong>Interests</strong>
                {isEditingProfile ? (
                  <textarea
                    value={formData.interests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interests: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.interests || "N/A"}</span>
                )}
              </div>

              {/* Programming */}
              <div>
                <strong>Programming</strong>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={formData.programming}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        programming: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.programming || "N/A"}</span>
                )}
              </div>

              {/* Experience */}
              <div>
                <strong>Experience</strong>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        experience: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.experience || "N/A"}</span>
                )}
              </div>

              {/* Preferred Career */}
              <div>
                <strong>Preferred Career</strong>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={formData.career}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        career: e.target.value
                      })
                    }
                  />
                ) : (
                  <span>{formData.career || "N/A"}</span>
                )}
              </div>

            </div>

            {/* Save and Cancel Buttons */}
            {isEditingProfile && (
              <div className="profile-edit-actions">

                <button
                  className="save-profile-btn"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  {isSavingProfile
                    ? "Saving..."
                    : "💾 Save Changes"}
                </button>

                <button
                  className="cancel-profile-btn"
                  onClick={handleCancelProfileEdit}
                  disabled={isSavingProfile}
                >
                  Cancel
                </button>

              </div>
            )}

          </section>
        )}
        {/* ============================================
    AI RESUME ANALYZER
============================================ */}

        {activeSection === "resume" && (
          <>
            <section className="resume-analyzer-section">

              <div className="resume-header">

                <div className="resume-icon">
                  📄
                </div>

                <div>
                  <h2>AI Resume Analyzer</h2>

                  <p>
                    Upload your resume and let AI analyze your
                    skills, experience, projects and career potential.
                  </p>
                </div>

              </div>

              <div className="resume-upload-box">

                <label className="resume-file-label">
                  📎 Select Resume
                </label>

                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(event) => {

                    const file = event.target.files[0];

                    setResumeFile(file);
                    setResumeMessage("");
                    setResumeResult(null);

                  }}
                />


                {resumeFile && (

                  <div className="selected-resume">

                    📄 <strong>{resumeFile.name}</strong>

                    <span>
                      {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>

                  </div>

                )}


                <button
                  type="button"
                  className="resume-analyze-btn"
                  onClick={handleResumeUpload}
                  disabled={resumeLoading}
                >

                  {resumeLoading
                    ? "🤖 Analyzing Resume..."
                    : "✨ Analyze Resume"}

                </button>


                {resumeMessage && (

                  <div className="resume-message">
                    {resumeMessage}
                  </div>

                )}

              </div>

            </section>
          </>
        )}
        {/* ============================================
    RESUME ANALYSIS RESULTS
============================================ */}

        {activeSection === "resume" &&
          resumeResult && resumeResult.resumeAnalysis && (

            <div className="resume-results">

              <div className="resume-results-title">
                <span>🤖</span>
                <div>
                  <h2>Resume Analysis Results</h2>
                  <p>
                    AI-powered analysis of your resume
                  </p>
                </div>
              </div>


              {/* RESUME SCORE */}

              <div className="resume-score-card">

                <div className="score-circle">

                  <span>
                    {resumeResult.resumeAnalysis.resumeScore}
                  </span>

                  <small>/100</small>

                </div>

                <div className="score-info">

                  <h3>Resume Score</h3>

                  <p>
                    {resumeResult.resumeAnalysis.summary}
                  </p>

                </div>

              </div>
              {/* ============================================
    CAREER ALIGNMENT
============================================ */}

              {resumeResult.careerAlignment && (

                <div className="career-alignment-card">

                  <div className="career-alignment-header">

                    <div>
                      <span className="alignment-icon">🎯</span>

                      <div>
                        <h3>Career Alignment</h3>

                        <p>
                          How well your resume matches your
                          recommended career
                        </p>
                      </div>
                    </div>

                    <div className="alignment-score">
                      <span>
                        {resumeResult.careerAlignment.alignmentScore}
                      </span>
                      <small>% Match</small>
                    </div>

                  </div>


                  {/* CAREER READINESS */}

                  <div className="career-readiness">

                    <h4>📈 Career Readiness</h4>

                    <p>
                      {resumeResult.careerAlignment.careerReadiness}
                    </p>

                  </div>


                  {/* MATCHING SKILLS */}

                  <div className="alignment-section">

                    <h4>✅ Matching Skills</h4>

                    <div className="resume-tag-list">

                      {resumeResult.careerAlignment.matchingSkills?.map(
                        (skill, index) => (

                          <span
                            className="resume-tag technical"
                            key={index}
                          >
                            ✓ {skill}
                          </span>

                        )
                      )}

                    </div>

                  </div>


                  {/* MISSING SKILLS */}

                  <div className="alignment-section">

                    <h4>❌ Skills to Improve</h4>

                    <div className="resume-tag-list">

                      {resumeResult.careerAlignment.missingSkills?.map(
                        (skill, index) => (

                          <span
                            className="resume-tag missing"
                            key={index}
                          >
                            + {skill}
                          </span>

                        )
                      )}

                    </div>

                  </div>


                  {/* CAREER SPECIFIC IMPROVEMENTS */}

                  <div className="alignment-section">

                    <h4>🚀 Career-Specific Improvements</h4>

                    <ul className="resume-suggestion-list">

                      {resumeResult.careerAlignment
                        .careerSpecificImprovements?.map(
                          (item, index) => (

                            <li key={index}>
                              <span>✓</span>
                              {item}
                            </li>

                          )
                        )}

                    </ul>

                  </div>

                </div>

              )}


              {/* STRENGTHS */}

              <div className="resume-result-card">

                <h3>💪 Strengths</h3>

                <div className="resume-tag-list">

                  {resumeResult.resumeAnalysis.strengths?.map(
                    (item, index) => (

                      <span
                        className="resume-tag"
                        key={index}
                      >
                        ✓ {item}
                      </span>

                    )
                  )}

                </div>

              </div>


              {/* TECHNICAL SKILLS */}

              <div className="resume-result-card">

                <h3>💻 Technical Skills</h3>

                <div className="resume-tag-list">

                  {resumeResult.resumeAnalysis.technicalSkills?.map(
                    (item, index) => (

                      <span
                        className="resume-tag technical"
                        key={index}
                      >
                        {item}
                      </span>

                    )
                  )}

                </div>

              </div>


              {/* SOFT SKILLS */}

              <div className="resume-result-card">

                <h3>🤝 Soft Skills</h3>

                <div className="resume-tag-list">

                  {resumeResult.resumeAnalysis.softSkills?.map(
                    (item, index) => (

                      <span
                        className="resume-tag soft"
                        key={index}
                      >
                        {item}
                      </span>

                    )
                  )}

                </div>

              </div>


              {/* MISSING SKILLS */}

              <div className="resume-result-card">

                <h3>📚 Missing / Recommended Skills</h3>

                <div className="resume-tag-list">

                  {resumeResult.resumeAnalysis.missingSkills?.map(
                    (item, index) => (

                      <span
                        className="resume-tag missing"
                        key={index}
                      >
                        + {item}
                      </span>

                    )
                  )}

                </div>

              </div>


              {/* EXPERIENCE */}

              <div className="resume-result-card">

                <h3>💼 Experience Analysis</h3>

                <p className="resume-analysis-text">
                  {resumeResult.resumeAnalysis.experienceAnalysis}
                </p>

              </div>


              {/* EDUCATION */}

              <div className="resume-result-card">

                <h3>🎓 Education Analysis</h3>

                <p className="resume-analysis-text">
                  {resumeResult.resumeAnalysis.educationAnalysis}
                </p>

              </div>


              {/* PROJECTS */}

              <div className="resume-result-card">

                <h3>🚀 Project Analysis</h3>

                <p className="resume-analysis-text">
                  {resumeResult.resumeAnalysis.projectAnalysis}
                </p>

              </div>


              {/* IMPROVEMENT SUGGESTIONS */}

              <div className="resume-result-card">

                <h3>✨ Improvement Suggestions</h3>

                <ul className="resume-suggestion-list">

                  {resumeResult.resumeAnalysis.improvementSuggestions?.map(
                    (item, index) => (

                      <li key={index}>
                        <span>✓</span>
                        {item}
                      </li>

                    )
                  )}

                </ul>

              </div>


              {/* CAREER SUGGESTIONS */}

              <div className="resume-result-card">

                <h3>🎯 Career Suggestions</h3>

                <div className="resume-career-list">

                  {resumeResult.resumeAnalysis.careerSuggestions?.map(
                    (item, index) => (

                      <div
                        className="resume-career-item"
                        key={index}
                      >
                        <span>{index + 1}</span>
                        <strong>{item}</strong>
                      </div>

                    )
                  )}

                </div>

              </div>

            </div>

          )}

        {/* ===================================================
          AI DASHBOARD
      =================================================== */}
        {/* ================= CAREER ALIGNMENT ================= */}

        {activeSection === "alignment" && (
          <div className="career-alignment-page">

            <h2>🎯 Career Alignment</h2>

            <p>
              Compare your student information and resume
              with your AI-recommended career.
            </p>

            {/* Student Information Status */}
            <div className="card">
              <h3>Student Information</h3>

              {guidance ? (
                <p>✅ Student Information completed</p>
              ) : (
                <p>❌ Please complete Student Information first.</p>
              )}
            </div>

            {/* Resume Status */}
            <div className="card">
              <h3>Resume</h3>

              {resumeFile ? (
                <p>✅ Resume uploaded: {resumeFile.name}</p>
              ) : (
                <p>
                  ❌ Please upload your resume in the Resume Analyzer section.
                </p>
              )}
            </div>

            {/* Missing Requirements */}
            {!guidance && !resumeFile && (
              <p>
                Please complete Student Information and upload your resume first.
              </p>
            )}

            {!guidance && resumeFile && (
              <p>Please complete Student Information first.</p>
            )}

            {guidance && !resumeFile && (
              <p>
                Please upload your resume in the Resume Analyzer section first.
              </p>
            )}

            {/* Run Alignment */}
            <button
              onClick={handleCareerAlignment}
              disabled={alignmentLoading || !guidance || !resumeFile}
            >
              {alignmentLoading
                ? "Analyzing Career Alignment..."
                : "Analyze Career Alignment"}
            </button>

            {/* Messages */}
            {alignmentMessage && (
              <p>{alignmentMessage}</p>
            )}
            {/* Alignment Results */}
            {alignmentResult && (
              <div className="alignment-results">

                <div className="alignment-score-card">

                  <div className="alignment-score-header">
                    <span>🎯</span>
                    <div>
                      <h3>Career Match Score</h3>
                      <p>How closely your profile matches your recommended career</p>
                    </div>
                  </div>

                  <div className="alignment-score-value">
                    <h2>{alignmentResult.alignmentScore}%</h2>
                    <span>Overall Alignment</span>
                  </div>

                  <div className="alignment-progress">
                    <div
                      className="alignment-progress-fill"
                      style={{
                        width: `${Math.min(100, Math.max(0, Number(alignmentResult.alignmentScore) || 0))}%`
                      }}
                    ></div>
                  </div>

                </div>


                <p>
                  <strong>Career Readiness:</strong>{" "}
                  {alignmentResult.careerReadiness}
                </p>

                <h3>Matching Skills</h3>

                <ul>
                  {alignmentResult.matchingSkills?.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))}
                </ul>

                <h3>Missing Skills</h3>

                <ul>
                  {alignmentResult.missingSkills?.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))}
                </ul>

                <h3>Career-Specific Improvements</h3>

                <ul>
                  {alignmentResult.careerSpecificImprovements?.map(
                    (item, index) => (
                      <li key={index}>{item}</li>
                    )
                  )}
                </ul>

              </div>
            )}

          </div>
        )}
        {/* AI CAREER AGENT */}
        {activeSection === "agent" && (
          <div className="career-agent-page">

            <h2>🤖 AI Career Agent</h2>

            <p>
              Ask questions about careers, skills, learning roadmaps,
              projects and job opportunities.
            </p>
            <div className="agent-chat-container">

              <div className="agent-chat-history">

                {agentChatHistory.map((chat, index) => (
                  <div
                    key={index}
                    className={`agent-message ${chat.role}`}
                  >
                    <strong>
                      {chat.role === "user" ? "You" : "AI Career Agent"}
                    </strong>

                    <div className="agent-markdown">
                      <ReactMarkdown>{chat.text}</ReactMarkdown>
                    </div>
                  </div>
                ))}

                {agentLoading && (
                  <p>🤖 AI Career Agent is thinking...</p>
                )}

              </div>
              {showVoicePanel && (
                <div className="agent-voice-panel">
                  <h3>
                    {isListening ? "Listening..." : "Recording stopped"}
                  </h3>

                  <div className="agent-voice-waves">
                    {Array.from({ length: 15 }).map((_, index) => (
                      <span key={index}></span>
                    ))}
                  </div>

                  <p>Speak your career-related question</p>

                  <button
                    type="button"
                    className="agent-stop-button"
                    onClick={stopVoiceRecognition}
                  >
                    Stop Recording
                  </button>
                </div>
              )}

              <div className="agent-input-area">

                <textarea
                  value={agentMessage}
                  onChange={(e) => setAgentMessage(e.target.value)}
                  placeholder="Ask your career-related question..."
                  disabled={agentLoading}
                />

                <button
                  type="button"
                  className={`agent-mic-button ${isListening ? "listening" : ""}`}
                  onClick={startVoiceRecognition}
                  disabled={agentLoading || isListening}
                  title="Start voice input"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <path d="M12 17v5" />
                    <path d="M8 22h8" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    console.log("Send Message button clicked");
                    handleCareerAgent();
                  }}
                  disabled={agentLoading || !agentMessage.trim()}
                >
                  {agentLoading ? "Please wait..." : "Send Message"}
                </button>

              </div>
              {voiceError && (
                <p className="agent-voice-error">
                  {voiceError}
                </p>
              )}

            </div>

          </div>
        )}
        {/* PROFESSIONAL KNOWLEDGE BASE */}
        {activeSection === "knowledge" && (
          <div className="knowledge-base-page">

            {/* Page Header */}
            <div className="knowledge-header">
              <div className="knowledge-header-icon">📚</div>
              <h2>Career Knowledge Base</h2>
              <p>
                Explore career paths, technical skills, qualifications,
                job opportunities and personalized learning roadmaps.
              </p>
            </div>

            {/* Search Panel */}
            <div className="knowledge-search-panel">

              <h3>What would you like to explore?</h3>

              <div className="knowledge-search-box">

                <input
                  type="text"
                  value={knowledgeQuery}
                  onChange={(e) => setKnowledgeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleKnowledgeSearch();
                    }
                  }}
                  placeholder="Search careers, skills or topics..."
                />

                <button
                  onClick={handleKnowledgeSearch}
                  disabled={knowledgeLoading || !knowledgeQuery.trim()}
                >
                  {knowledgeLoading ? "Searching..." : "🔍 Search"}
                </button>

              </div>

              <div className="knowledge-search-hint">
                Try: Data Science, Python, Artificial Intelligence or Web Development
              </div>

            </div>

            {/* Popular Topics */}
            <div className="knowledge-popular">

              <h3>Explore Popular Topics</h3>

              <div className="knowledge-topic-grid">

                {[
                  { name: "Data Science", icon: "📊" },
                  { name: "Artificial Intelligence", icon: "🤖" },
                  { name: "Web Development", icon: "🌐" },
                  { name: "Machine Learning", icon: "🧠" }
                ].map((topic) => (
                  <button
                    type="button"
                    className="knowledge-topic-card"
                    key={topic.name}
                    onClick={() => {
                      setKnowledgeQuery(topic.name);
                    }}
                  >
                    <span>{topic.icon}</span>
                    <strong>{topic.name}</strong>
                    <small>Explore career information →</small>
                  </button>
                ))}

              </div>

            </div>

            {/* Loading */}
            {knowledgeLoading && (
              <div className="knowledge-status">
                <span>🔍</span>
                <p>Searching your career knowledge base...</p>
              </div>
            )}

            {/* Error */}
            {knowledgeError && (
              <div className="knowledge-error">
                {knowledgeError}
              </div>
            )}

            {/* Results */}
            {knowledgeResults.length > 0 && (
              <div className="knowledge-results">

                <div className="knowledge-results-heading">
                  <div>
                    <h3>Search Results</h3>
                    <p>Career information matching your search.</p>
                  </div>

                  <span className="knowledge-result-count">
                    {knowledgeResults.length} Results
                  </span>
                </div>

                <div className="knowledge-card-grid">

                  {knowledgeResults.map((item, index) => {

                    const career = item.career || item;


                    const normalizeCareerName = (value = "") =>
                      value.toLowerCase().trim().replace(/\s+/g, " ");

                    const isExactMatch =
                      normalizeCareerName(career.careerName) ===
                      normalizeCareerName(knowledgeQuery);

                    return (
                      <div
                        className="knowledge-card"
                        key={item._id || index}
                      >

                        {/* Card Header */}
                        <div className="knowledge-card-header">

                          <div>
                            <span className="knowledge-card-icon">
                              💼
                            </span>

                            <h3>
                              {career.careerName || "Career Information"}
                            </h3>
                          </div>

                          <span className={
                            isExactMatch
                              ? "exact-match-label"
                              : "related-career-label"
                          }>
                            {isExactMatch
                              ? "✓ Exact Match"
                              : "Related Career"}
                          </span>

                        </div>

                        {/* Category */}
                        <div className="knowledge-category">
                          {career.category || "Career"}
                        </div>

                        {/* Description */}
                        <p className="knowledge-description">
                          {career.description ||
                            "No description available."}
                        </p>

                        {/* Skills */}
                        <div className="knowledge-section">

                          <h4>⚡ Required Skills</h4>

                          <div className="knowledge-skill-tags">

                            {(career.requiredSkills || []).map(
                              (skill, i) => (
                                <span
                                  className="knowledge-skill-tag"
                                  key={i}
                                >
                                  {skill}
                                </span>
                              )
                            )}

                          </div>

                        </div>

                        {/* Job Roles */}
                        <div className="knowledge-section">

                          <h4>💼 Job Roles</h4>

                          <div className="knowledge-job-tags">

                            {(career.jobRoles || []).map(
                              (role, i) => (
                                <span
                                  className="knowledge-job-tag"
                                  key={i}
                                >
                                  {role}
                                </span>
                              )
                            )}

                          </div>

                        </div>

                        {/* Qualifications */}
                        <div className="knowledge-section">

                          <h4>🎓 Qualifications</h4>

                          <div className="knowledge-qualification-tags">

                            {(career.qualification || []).map(
                              (qualification, i) => (
                                <span
                                  className="knowledge-qualification-tag"
                                  key={i}
                                >
                                  {qualification}
                                </span>
                              )
                            )}

                          </div>

                        </div>

                        {/* Roadmap */}
                        <div className="knowledge-section">

                          <h4>🚀 Learning Roadmap</h4>

                          <div className="knowledge-roadmap">

                            {(career.roadmap || []).map(
                              (step, i) => (
                                <div
                                  className="knowledge-roadmap-step"
                                  key={i}
                                >

                                  <div className="knowledge-roadmap-number">
                                    {i + 1}
                                  </div>

                                  <div className="knowledge-roadmap-content">
                                    <strong>
                                      Step {i + 1}
                                    </strong>

                                    <p>{step}</p>
                                  </div>

                                </div>
                              )
                            )}

                          </div>

                        </div>

                        {/* Relevance Score */}
                        <div className="knowledge-relevance">

                          <span>Relevance Score</span>

                          <strong>
                            {typeof item.relevanceScore === "number"
                              ? `${(item.relevanceScore * 100).toFixed(1)}%`
                              : "Not available"}
                          </strong>

                        </div>

                      </div>
                    );

                  })}

                </div>

              </div>
            )}

            {/* Empty State */}
            {!knowledgeLoading &&
              !knowledgeError &&
              knowledgeResults.length === 0 && (
                <div className="knowledge-empty-state">
                  <span>🔎</span>
                  <h3>Discover Your Career Knowledge</h3>
                  <p>
                    Search for a career or select a popular topic
                    to explore career information.
                  </p>
                </div>
              )}

          </div>
        )}

        {guidance && activeSection === 'dashboard' && (

          <main className="dashboard">


            {/* =================================================
              DASHBOARD HEADER
          ================================================= */}

            <section className="dashboard-title">

              <div className="dashboard-icon">
                📊
              </div>

              <h2>
                AI Career Dashboard
              </h2>

              <p>
                AI-powered analysis of your career profile
              </p>

            </section>


            {/* =================================================
              KPI CARDS
          ================================================= */}

            <section className="kpi-grid">


              {/* CAREER MATCH */}

              <div className="kpi-card">

                <div className="kpi-icon">
                  🎯
                </div>

                <div className="kpi-content">

                  <h3>
                    Career Match
                  </h3>

                  <h2>
                    {guidance.careerMatchScore !== null
                      ? `${guidance.careerMatchScore}%`
                      : "N/A"}
                  </h2>

                  <p>
                    Compatibility with recommended career
                  </p>

                </div>

              </div>


              {/* STRONGEST AREA */}

              <div className="kpi-card">

                <div className="kpi-icon">
                  💪
                </div>

                <div className="kpi-content">

                  <h3>
                    Strongest Area
                  </h3>

                  <h2>
                    {strongestArea
                      ? strongestArea.subject
                      : "N/A"}
                  </h2>

                  <p>
                    {strongestArea
                      ? `${strongestArea.value}% compatibility`
                      : "No analysis available"}
                  </p>

                </div>

              </div>


              {/* BIGGEST GAP */}

              <div className="kpi-card">

                <div className="kpi-icon">
                  📊
                </div>

                <div className="kpi-content">

                  <h3>
                    Biggest Skill Gap
                  </h3>

                  <h2>

                    {guidance.skillGapAnalysis.length > 0
                      ? guidance.skillGapAnalysis.reduce(
                        (largest, current) =>
                          current.gap > largest.gap
                            ? current
                            : largest
                      ).skill
                      : "N/A"}

                  </h2>

                  <p>

                    {guidance.skillGapAnalysis.length > 0
                      ? `${guidance.skillGapAnalysis.reduce(
                        (largest, current) =>
                          current.gap > largest.gap
                            ? current
                            : largest
                      ).gap}% gap`
                      : "No skill-gap data"}

                  </p>

                </div>

              </div>
              {/* RECOMMENDED CAREER */}
              {/* RECOMMENDED CAREER */}
              <section className="dashboard-section recommended-career-section">
                <div className="section-heading">
                  <span className="section-icon">🎯</span>

                  <div>
                    <h2>Recommended Career</h2>
                    <p>Your best career path based on AI analysis.</p>
                  </div>
                </div>

                <div className="recommended-career-card">

                  <div className="recommended-career-icon">
                    🚀
                  </div>

                  <div className="recommended-career-info">

                    <span className="career-label">
                      AI RECOMMENDED CAREER
                    </span>

                    <h1 className="recommended-career-name">
                      {guidance?.recommendedCareer || "Data Scientist"}
                    </h1>

                    <p>
                      This career has the strongest match with your
                      current profile, skills, interests, and AI analysis.
                    </p>

                  </div>

                </div>


                {/* ALTERNATIVE CAREERS */}

                <div className="alternative-careers">

                  <h3>Alternative Careers</h3>

                  <div className="alternative-careers-list">

                    {guidance?.alternativeCareers?.length > 0 ? (

                      guidance.alternativeCareers.map((career, index) => (

                        <span
                          className="career-pill"
                          key={index}
                        >
                          {career}
                        </span>

                      ))

                    ) : (

                      <>
                        <span className="career-pill">
                          AI Engineer
                        </span>

                        <span className="career-pill">
                          Machine Learning Engineer
                        </span>
                      </>

                    )}

                  </div>

                </div>

              </section>


            </section>


            {/* =================================================
              CAREER MATCH SCORE
          ================================================= */}
            <section className="match-score-card">
              <div className="match-circle">

                <span>
                  {guidance.careerMatchScore ?? 0}%
                </span>

              </div>

              <div>
                <h3>🎯 AI Career Match Score</h3>

                <p>
                  Gemini estimates that your profile is{" "}
                  <strong>
                    {guidance.careerMatchScore ?? 0}%
                  </strong>{" "}
                  compatible with the recommended career.
                </p>
              </div>
            </section>


            {/* =================================================
              PROFILE ANALYSIS
          ================================================= */}

            <section className="dashboard-section">

              <div className="section-heading">

                <h2>
                  📊 Profile Analysis
                </h2>

                <p>
                  See how each part of your profile supports your recommended career.
                </p>

              </div>


              <div className="chart-container">

                <ResponsiveContainer
                  width="100%"
                  height={430}
                >

                  <RadarChart
                    data={profileData}
                  >

                    <PolarGrid />

                    <PolarAngleAxis
                      dataKey="subject"
                    />

                    <PolarRadiusAxis
                      domain={[0, 100]}
                    />

                    <Radar
                      name="Compatibility"
                      dataKey="value"
                      stroke="#5428d8"
                      fill="#5428d8"
                      fillOpacity={0.35}
                      strokeWidth={3}
                    />

                    <Tooltip
                      formatter={(value) =>
                        Number.isFinite(value)
                          ? [`${value}%`, "Compatibility"]
                          : ["N/A", "Compatibility"]
                      }
                    />

                  </RadarChart>

                </ResponsiveContainer>

              </div>


              {/* PROFILE SCORE CARDS */}

              <div className="score-grid">

                {profileData.map(
                  (item) => (

                    <div
                      className="score-card"
                      key={item.subject}
                    >

                      <span>
                        {item.subject}
                      </span>

                      <strong>

                        {Number.isFinite(item.value)
                          ? `${item.value}%`
                          : "N/A"}

                      </strong>

                    </div>

                  )
                )}

              </div>

            </section>


            {/* =================================================
              CAREER COMPARISON
          ================================================= */}

            <section className="dashboard-section">

              <div className="section-heading">

                <h2>
                  🏆 Career Comparison
                </h2>

                <p>
                  Compare your compatibility with different career paths.
                </p>

              </div>


              {careerChartData.length > 0 ? (

                <div className="chart-container">

                  <ResponsiveContainer
                    width="100%"
                    height={430}
                  >

                    <BarChart
                      data={careerChartData}
                      layout="vertical"
                      margin={{
                        top: 20,
                        right: 40,
                        left: 30,
                        bottom: 20
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        type="number"
                        domain={[0, 100]}
                      />

                      <YAxis
                        type="category"
                        dataKey="career"
                        width={170}
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${value}%`,
                          "Career Match"
                        ]}
                      />

                      <Legend />

                      <Bar
                        dataKey="score"
                        name="Career Match %"
                        fill="#5428d8"
                        radius={[
                          0,
                          10,
                          10,
                          0
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              ) : (

                <div className="empty-chart">
                  No career comparison data available.
                </div>

              )}

            </section>


            {/* =================================================
              SKILL GAP ANALYSIS
          ================================================= */}

            <section className="dashboard-section">

              <div className="section-heading">

                <h2>
                  🧠 Skill Gap Analysis
                </h2>

                <p>
                  Compare your current skill level with the level required for your recommended career.
                </p>

              </div>


              {skillChartData.length > 0 ? (

                <div className="chart-container">

                  <ResponsiveContainer
                    width="100%"
                    height={450}
                  >

                    <BarChart
                      data={skillChartData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 10,
                        bottom: 50
                      }}
                    >

                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="skill"
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />

                      <YAxis
                        domain={[0, 100]}
                      />

                      <Tooltip
                        formatter={(value) => [
                          `${value}%`,
                          "Level"
                        ]}
                      />

                      <Legend />

                      <Bar
                        dataKey="currentScore"
                        name="Current Level"
                        fill="#4f46e5"
                        radius={[
                          8,
                          8,
                          0,
                          0
                        ]}
                      />

                      <Bar
                        dataKey="requiredScore"
                        name="Required Level"
                        fill="#16a34a"
                        radius={[
                          8,
                          8,
                          0,
                          0
                        ]}
                      />

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              ) : (

                <div className="empty-chart">

                  <h3>
                    No skill-gap information available
                  </h3>

                  <p>
                    Gemini did not return detailed skill-gap data.
                  </p>

                </div>

              )}

            </section>


            {/* =================================================
              SKILL GAP TABLE
          ================================================= */}

            {skillChartData.length > 0 && (

              <section className="dashboard-section">

                <div className="section-heading">

                  <h2>
                    📋 Skill Gap Details
                  </h2>

                  <p>
                    Skills that should be improved for the recommended career.
                  </p>

                </div>


                <div className="skill-gap-table">

                  <div className="table-header">

                    <span>
                      Skill
                    </span>

                    <span>
                      Current
                    </span>

                    <span>
                      Required
                    </span>

                    <span>
                      Gap
                    </span>

                  </div>


                  {skillChartData.map(
                    (item, index) => (

                      <div
                        className="table-row"
                        key={index}
                      >

                        <span>
                          {item.skill}
                        </span>

                        <span>
                          {item.currentScore}%
                        </span>

                        <span>
                          {item.requiredScore}%
                        </span>

                        <span className="gap-value">
                          {item.gap}%
                        </span>

                      </div>

                    )
                  )}

                </div>

              </section>

            )}

            {/* =================================================
              WHY THIS CAREER
          ================================================= */}

            <section className="dashboard-section">

              <div className="section-heading">

                <h2>
                  💡 Why This Career?
                </h2>

              </div>


              <div className="text-card">

                <p>
                  {guidance.whyThisCareer || "N/A"}
                </p>

              </div>

            </section>






            {/* =================================================
              CAREER ADVICE
          ================================================= */}

            <section className="dashboard-section">

              <div className="section-heading">

                <h2>
                  🚀 Career Advice
                </h2>

                <p>
                  Personalized recommendations generated by AI.
                </p>

              </div>


              <div className="advice-container">

                {guidance.careerAdvice.length > 0

                  ? guidance.careerAdvice.map(
                    (advice, index) => (

                      <div
                        className="advice-card"
                        key={index}
                      >

                        <div className="advice-number">
                          {index + 1}
                        </div>

                        <p>
                          {typeof advice === "object"
                            ? getValue(
                              advice,
                              [
                                "advice",
                                "recommendation",
                                "text",
                                "description"
                              ],
                              "N/A"
                            )
                            : advice}
                        </p>

                      </div>

                    )
                  )

                  : (
                    <div className="empty-chart">
                      No career advice available.
                    </div>
                  )}

              </div>




            </section>



          </main>
        )}
        {/* CAREER REPORT PAGE */}
        {activeSection === "report" && (
          <main className="career-report-page">

            <div className="career-report-header">
              <div className="career-report-icon">📄</div>

              <h1>Career Guidance Report</h1>

              <p>
                Download your personalized AI-generated career
                guidance report in PDF format.
              </p>
            </div>

            {guidance ? (
              <>
                <div className="career-report-card">

                  <h2>📋 Report Overview</h2>

                  <div className="career-report-details">

                    <div>
                      <span>Student Name</span>
                      <strong>{formData.name || "N/A"}</strong>
                    </div>

                    <div>
                      <span>Education</span>
                      <strong>{formData.education || "N/A"}</strong>
                    </div>

                    <div>
                      <span>Recommended Career</span>
                      <strong>{guidance.recommendedCareer || "N/A"}</strong>
                    </div>

                    <div>
                      <span>Career Match Score</span>
                      <strong>
                        {Number.isFinite(guidance.careerMatchScore)
                          ? `${guidance.careerMatchScore}%`
                          : "N/A"}
                      </strong>
                    </div>

                  </div>

                  <div className="career-report-includes">
                    <h3>What's Included in Your Report?</h3>

                    <ul>
                      <li>Student Information</li>
                      <li>AI Career Recommendation and Match Score</li>
                      <li>Alternative Career Options</li>
                      <li>Career Explanation</li>
                      <li>Profile Analysis</li>
                      <li>Skill Gap Analysis</li>
                      <li>Skills to Learn</li>
                      <li>Project Ideas</li>
                      <li>Possible Job Roles</li>
                      <li>Personalized Career Advice</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="download-pdf-button"
                    onClick={handleDownloadPDF}
                  >
                    📄 Download Career Report (PDF)
                  </button>

                </div>
              </>
            ) : (
              <div className="career-report-empty">
                <h3>Career Guidance Not Available</h3>
                <p>
                  Please complete your student profile and generate
                  AI career guidance before downloading the report.
                </p>
              </div>
            )}

          </main>
        )}
        {/* JOBS & PROJECTS PAGE */}
        {activeSection === "jobs" && guidance && (
          <main className="jobs-projects-page">

            <div className="section-heading">
              <h1>💼 Jobs & Projects</h1>
              <p>
                Explore career opportunities and build projects
                to strengthen your professional portfolio.
              </p>
            </div>

            {/* PROJECT IDEAS */}
            <section className="dashboard-section">
              <div className="section-heading">
                <h2>🛠️ Project Ideas</h2>
                <p>Projects you can build to improve your portfolio.</p>
              </div>

              <div className="project-grid">
                {guidance.projectIdeas?.length > 0 ? (
                  guidance.projectIdeas.map((project, index) => {
                    const title =
                      typeof project === "object"
                        ? getValue(
                          project,
                          ["title", "projectTitle", "name"],
                          `Project ${index + 1}`
                        )
                        : project;

                    const description =
                      typeof project === "object"
                        ? getValue(
                          project,
                          ["description", "details", "summary"],
                          "N/A"
                        )
                        : "Build this project to strengthen your portfolio.";

                    return (
                      <div className="project-card" key={index}>
                        <div className="project-number">
                          {index + 1}
                        </div>

                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-chart">
                    No project ideas available.
                  </div>
                )}
              </div>
            </section>

            {/* JOB ROLES */}
            <section className="dashboard-section">
              <div className="section-heading">
                <h2>💼 Job Roles</h2>
                <p>
                  Possible roles related to your recommended career.
                </p>
              </div>

              <div className="job-role-grid">
                {guidance.jobRoles?.length > 0 ? (
                  guidance.jobRoles.map((role, index) => (
                    <div className="job-role-card" key={index}>
                      <span>💼</span>

                      <strong>
                        {typeof role === "object"
                          ? getValue(
                            role,
                            ["role", "title", "name"],
                            "N/A"
                          )
                          : role}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div className="empty-chart">
                    No job roles available.
                  </div>
                )}
              </div>
            </section>

          </main>
        )}
        {/* SKILLS & ROADMAP PAGE */}
        {activeSection === "skills" && guidance && (
          <main className="skills-roadmap-page">

            {/* PAGE HEADER */}
            <div className="section-heading">
              <h1>🧠 Skills & Learning Roadmap</h1>
              <p>
                Explore your recommended skills and follow
                your personalized learning journey.
              </p>
            </div>

            {/* =========================================
              SKILLS TO LEARN
          ========================================= */}

            <section className="dashboard-section">

              <div className="section-heading">
                <h2>🧠 Skills To Learn</h2>
                <p>
                  Recommended skills to strengthen your career profile.
                </p>
              </div>

              <div className="skills-learning-grid">

                {guidance.skillsToLearn?.length > 0 ? (

                  guidance.skillsToLearn.map((skill, index) => (

                    <div
                      className="learning-skill-card"
                      key={index}
                    >

                      <div>✓</div>

                      <span>
                        {typeof skill === "object"
                          ? getValue(
                            skill,
                            ["skill", "name", "title"],
                            "N/A"
                          )
                          : skill}
                      </span>

                    </div>

                  ))

                ) : (

                  <div className="empty-chart">
                    No skills-to-learn data available.
                  </div>

                )}

              </div>

            </section>

            {/* =========================================
              LEARNING ROADMAP
          ========================================= */}

            <section className="dashboard-section">

              <div className="section-heading">
                <h2>🗺️ Learning Roadmap</h2>
                <p>
                  A step-by-step learning plan for your career.
                </p>
              </div>

              <div className="roadmap-container">

                {guidance.learningRoadmap?.length > 0 ? (

                  guidance.learningRoadmap.map((item, index) => {

                    const month = getValue(
                      item,
                      ["month", "phase", "stage"],
                      `Phase ${index + 1}`
                    );

                    const topics = arrayValue(
                      getValue(
                        item,
                        ["topics", "topic", "subjects"],
                        []
                      )
                    );

                    const practice = getValue(
                      item,
                      ["practice", "practiceWork", "project"],
                      "N/A"
                    );

                    return (

                      <div
                        className="roadmap-card"
                        key={index}
                      >

                        <div className="roadmap-number">
                          {index + 1}
                        </div>

                        <div>

                          <h3>{month}</h3>

                          <h4>Topics</h4>

                          <ul>
                            {topics.length > 0 ? (

                              topics.map((topic, topicIndex) => (

                                <li key={topicIndex}>
                                  {typeof topic === "object"
                                    ? getValue(
                                      topic,
                                      ["name", "topic", "title"],
                                      "N/A"
                                    )
                                    : topic}
                                </li>

                              ))

                            ) : (

                              <li>N/A</li>

                            )}
                          </ul>

                          <p>
                            <strong>Practice:</strong>{" "}
                            {typeof practice === "object"
                              ? getValue(
                                practice,
                                ["description", "name", "title"],
                                "N/A"
                              )
                              : practice}
                          </p>

                        </div>

                      </div>

                    );

                  })

                ) : (

                  <div className="empty-chart">
                    No learning roadmap available.
                  </div>

                )}

              </div>

            </section>

          </main>
        )}

        {/* INTERVIEW SIMULATOR PAGE */}
        {activeSection === "interview" && guidance && (
          <InterviewSimulator
            career={guidance.recommendedCareer || "Data Scientist"}
          />
        )}
        {/* FOOTER */}


        {/* ===================================================
          FOOTER
      =================================================== */}

        <footer>

          <p>
            🤖 AI Career Guidance System
          </p>

          <small>
            MERN Stack • MongoDB • Gemini AI
          </small>
          <p className="copyright-text">
            © {new Date().getFullYear()} AI Career Guidance System.
            All Rights Reserved.
          </p>

        </footer>.

      </div >

    )

  );
}
export default App;

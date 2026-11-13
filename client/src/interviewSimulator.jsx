
import { useState } from "react";
import "./InterviewSimulator.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function InterviewSimulator({ career = "Data Scientist" }) {
    const [difficulty, setDifficulty] = useState("Medium");
    const [interviewType, setInterviewType] = useState("Technical");
    const [questionNumber, setQuestionNumber] = useState(1);

    const [question, setQuestion] = useState(null);
    const [answer, setAnswer] = useState("");

    const [evaluation, setEvaluation] = useState(null);
    const [questions, setQuestions] = useState([]);

    const [loading, setLoading] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [finished, setFinished] = useState(false);

    const [report, setReport] = useState(null);
    const [error, setError] = useState("");


    // ============================================
    // START / GENERATE QUESTION
    // ============================================

    const generateQuestion = async () => {
        try {
            setLoading(true);
            setError("");
            setEvaluation(null);

            const previousQuestions = questions.map(
                (item) => item.question
            );

            const response = await fetch(
                `${API_BASE_URL}/api/interview/question`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        career,
                        difficulty,
                        interviewType,
                        questionNumber,
                        previousQuestions
                    })
                }
            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to generate question."
                );
            }

            setQuestion(data.question);
            setAnswer("");
            setInterviewStarted(true);

        } catch (error) {
            console.error("Interview error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    // ============================================
    // START INTERVIEW
    // ============================================

    const startInterview = () => {
        setQuestions([]);
        setQuestionNumber(1);
        setQuestion(null);
        setAnswer("");
        setEvaluation(null);
        setReport(null);
        setFinished(false);

        generateQuestion();
    };


    // ============================================
    // SUBMIT ANSWER
    // ============================================

    const submitAnswer = async () => {
        if (!answer.trim()) {
            setError("Please enter your answer before submitting.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_BASE_URL}/api/interview/evaluate`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        career,
                        question: question.question,
                        answer
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to evaluate answer."
                );
            }

            const newInterviewItem = {
                question: question.question,
                category: question.category,
                answer,
                evaluation: data.evaluation
            };

            setQuestions((previous) => [
                ...previous,
                newInterviewItem
            ]);

            setEvaluation(data.evaluation);

        } catch (error) {
            console.error("Evaluation error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    // ============================================
    // NEXT QUESTION
    // ============================================

    const nextQuestion = () => {
        setQuestionNumber((previous) => previous + 1);
        setEvaluation(null);
        setAnswer("");

        generateQuestion();
    };


    // ============================================
    // FINISH INTERVIEW
    // ============================================

    const finishInterview = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_BASE_URL}/api/interview/report`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        career,
                        questions
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to generate report."
                );
            }

            setReport(data.report);
            setFinished(true);

        } catch (error) {
            console.error("Report error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };


    // ============================================
    // RENDER
    // ============================================

    return (
        <section className="interview-section">

            {/* HEADER */}

            <div className="interview-header">
                <div className="interview-icon">
                    🤖
                </div>

                <div>
                    <h2>AI Interview Simulator</h2>

                    <p>
                        Practice realistic interviews with an
                        AI-powered career coach.
                    </p>
                </div>
            </div>


            {/* SETUP */}

            {!interviewStarted && !finished && (
                <div className="interview-setup">

                    <div className="setup-card">

                        <div className="setup-icon">
                            🎯
                        </div>

                        <h3>
                            Prepare for your interview
                        </h3>

                        <p>
                            Your interview will be tailored for:
                        </p>

                        <div className="career-badge">
                            {career}
                        </div>

                        <label>
                            Interview Difficulty
                        </label>

                        <select
                            value={difficulty}
                            onChange={(event) =>
                                setDifficulty(event.target.value)
                            }
                        >
                            <option value="Easy">
                                Easy
                            </option>

                            <option value="Medium">
                                Medium
                            </option>

                            <option value="Hard">
                                Hard
                            </option>
                        </select>
                        <div className="form-group">
                            <label>Interview Type</label>
                            <select
                                value={interviewType}
                                onChange={(e) => setInterviewType(e.target.value)}
                            >
                                <option value="Technical">Technical</option>
                                <option value="HR">HR</option>
                                <option value="Mixed">Mixed</option>
                            </select>
                        </div>

                        <button
                            className="start-interview-btn"
                            onClick={startInterview}
                            disabled={loading}
                        >
                            {loading
                                ? "Starting..."
                                : "🚀 Start AI Interview"}
                        </button>

                    </div>

                </div>
            )}


            {/* ERROR */}

            {error && (
                <div className="interview-error">
                    ⚠️ {error}
                </div>
            )}


            {/* QUESTION */}

            {interviewStarted &&
                !finished &&
                question && (

                    <div className="interview-card">

                        <div className="interview-top">

                            <span>
                                Question {questionNumber}
                            </span>

                            <span>
                                {question.category}
                            </span>

                            <span>
                                {difficulty}
                            </span>

                        </div>


                        <div className="question-box">

                            <div className="question-number">
                                Q{questionNumber}
                            </div>

                            <div>
                                <h3>
                                    {question.question}
                                </h3>
                            </div>

                        </div>


                        {!evaluation && (

                            <div className="answer-area">

                                <label>
                                    Your Answer
                                </label>

                                <textarea
                                    value={answer}
                                    onChange={(event) =>
                                        setAnswer(event.target.value)
                                    }
                                    placeholder="Type your interview answer here..."
                                    rows="7"
                                />

                                <div className="answer-footer">

                                    <span>
                                        {answer.length} characters
                                    </span>

                                    <button
                                        className="submit-answer-btn"
                                        onClick={submitAnswer}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Evaluating..."
                                            : "Submit Answer →"}
                                    </button>

                                </div>

                            </div>

                        )}


                        {/* EVALUATION */}

                        {evaluation && (

                            <div className="evaluation-panel">

                                <div className="score-section">

                                    <div className="score-circle">
                                        {evaluation.score}
                                    </div>

                                    <div>
                                        <h3>
                                            {evaluation.rating}
                                        </h3>

                                        <p>
                                            AI Evaluation
                                        </p>
                                    </div>

                                </div>


                                <div className="feedback-box">

                                    <h4>
                                        💬 Feedback
                                    </h4>

                                    <p>
                                        {evaluation.feedback}
                                    </p>

                                </div>


                                <div className="evaluation-columns">

                                    <div>
                                        <h4>
                                            ✅ Strengths
                                        </h4>

                                        <ul>
                                            {evaluation.strengths?.map(
                                                (item, index) => (
                                                    <li key={index}>
                                                        {item}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>


                                    <div>
                                        <h4>
                                            📈 Improvements
                                        </h4>

                                        <ul>
                                            {evaluation.improvements?.map(
                                                (item, index) => (
                                                    <li key={index}>
                                                        {item}
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    </div>

                                </div>


                                <div className="better-answer">

                                    <h4>
                                        💡 Better Approach
                                    </h4>

                                    <p>
                                        {evaluation.betterApproach}
                                    </p>

                                </div>


                                <div className="interview-actions">

                                    {questionNumber < 5 ? (

                                        <button
                                            className="next-question-btn"
                                            onClick={nextQuestion}
                                            disabled={loading}
                                        >
                                            {loading
                                                ? "Loading..."
                                                : "Next Question →"}
                                        </button>

                                    ) : (

                                        <button
                                            className="finish-interview-btn"
                                            onClick={finishInterview}
                                            disabled={loading}
                                        >
                                            {loading
                                                ? "Generating Report..."
                                                : "🏆 Finish Interview"}
                                        </button>

                                    )}

                                </div>

                            </div>

                        )}

                    </div>
                )}


            {/* FINAL REPORT */}

            {finished && report && (

                <div className="final-report">

                    <div className="report-header">

                        <div className="report-trophy">
                            🏆
                        </div>

                        <div>
                            <h2>
                                Interview Performance Report
                            </h2>

                            <p>
                                Your AI-powered interview assessment
                            </p>
                        </div>

                    </div>


                    <div className="overall-score">

                        <div className="final-score-circle">
                            {report.overallScore}
                            <span>/100</span>
                        </div>

                        <div>
                            <h2>
                                {report.overallRating}
                            </h2>

                            <p>
                                Overall Interview Performance
                            </p>
                        </div>

                    </div>


                    <div className="report-summary">

                        <h3>
                            📋 Performance Summary
                        </h3>

                        <p>
                            {report.summary}
                        </p>

                    </div>


                    <div className="report-grid">

                        <div className="report-card">

                            <h3>
                                💪 Strengths
                            </h3>

                            <ul>
                                {report.strengths?.map(
                                    (item, index) => (
                                        <li key={index}>
                                            {item}
                                        </li>
                                    )
                                )}
                            </ul>

                        </div>


                        <div className="report-card">

                            <h3>
                                📈 Areas to Improve
                            </h3>

                            <ul>
                                {report.weaknesses?.map(
                                    (item, index) => (
                                        <li key={index}>
                                            {item}
                                        </li>
                                    )
                                )}
                            </ul>

                        </div>

                    </div>


                    <div className="performance-box">

                        <h3>
                            🧠 Technical Performance
                        </h3>

                        <p>
                            {report.technicalPerformance}
                        </p>

                    </div>


                    <div className="performance-box">

                        <h3>
                            🗣️ Communication Performance
                        </h3>

                        <p>
                            {report.communicationPerformance}
                        </p>

                    </div>


                    <div className="recommendations-box">

                        <h3>
                            🚀 Recommendations
                        </h3>

                        <ul>
                            {report.recommendations?.map(
                                (item, index) => (
                                    <li key={index}>
                                        {item}
                                    </li>
                                )
                            )}
                        </ul>

                    </div>


                    <div className="next-steps-box">

                        <h3>
                            🛣️ Next Steps
                        </h3>

                        <ul>
                            {report.nextSteps?.map(
                                (item, index) => (
                                    <li key={index}>
                                        {item}
                                    </li>
                                )
                            )}
                        </ul>
                    </div>
                    <button
                        className="restart-interview-btn"
                        onClick={() => {
                            setInterviewStarted(false);
                            setFinished(false);
                            setReport(null);
                            setQuestion(null);
                            setQuestions([]);
                            setQuestionNumber(1);
                            setEvaluation(null);
                            setAnswer("");
                            setError("");
                        }}
                    >
                        🔄 Practice Again
                    </button>

                </div>

            )}

        </section>
    );
}

export default InterviewSimulator;
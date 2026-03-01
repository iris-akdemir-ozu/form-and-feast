import { useState, useEffect} from "react"
import axios from "axios"
import "./App.css"
import MuscleMap from "./MuscleMap"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"


const EXERCISE_LIST = [
  "Barbell Squat",
  "Romanian Deadlift",
  "Conventional Deadlift",
  "Leg Press",
  "Leg Extension",
  "Leg Curl",
  "Hip Thrust",
  "Walking Lunges",
  "Bulgarian Split Squat",
  "Bench Press",
  "Incline Bench Press",
  "Overhead Press",
  "Pull Up",
  "Lat Pulldown",
  "Barbell Row",
  "Cable Row",
  "Dumbbell Curl",
  "Tricep Pushdown",
  "Face Pull",
  "Lateral Raise",
]


function RecoveryDashboard({ status }) {
  if (!status) return null
  const trained = Object.entries(status).filter(([, d]) => d.last_trained !== null)
  if (trained.length === 0) return null

  const getColor = (pct) => {
    if (pct >= 80) return { bar: "#4caf50", text: "#4caf50" }
    if (pct >= 50) return { bar: "#ffcc00", text: "#ffcc00" }
    return { bar: "#ff3c00", text: "#ff6b35" }
  }

  return (
    <div style={{ width: "100%", background: "#111", border: "1px solid #222", borderRadius: "16px", padding: "18px 20px" }}>
      <p style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700", letterSpacing: "1px", marginBottom: "14px" }}>
        📊 RECOVERY STATUS — based on your training history
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {trained
          .sort(([, a], [, b]) => a.recovery_pct - b.recovery_pct)
          .map(([muscle, data]) => {
            const c = getColor(data.recovery_pct)
            return (
              <div key={muscle}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "0.82rem", color: "#ccc" }}>{data.display_name}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span style={{ fontSize: "0.72rem", color: "#555" }}>{data.hours_since}h ago</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: "700", color: c.text }}>{data.recovery_pct}%</span>
                  </div>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: "999px", height: "5px", overflow: "hidden" }}>
                  <div style={{ width: `${data.recovery_pct}%`, height: "100%", background: c.bar, borderRadius: "999px", transition: "width 1s ease" }} />
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}


function FormTrendLine({ sessionLog }) {
  if (!sessionLog || sessionLog.length === 0) return null

  // Flatten all sets across all exercises into a single timeline
  const allSets = []
  sessionLog.forEach(ex => {
    ex.sets.forEach(s => {
      allSets.push({
        name:     `${ex.exercise_name.split(" ").slice(-1)[0]} S${s.set_number}`,  // e.g. "Squat S1"
        fullName: `${ex.exercise_name} — Set ${s.set_number}`,
        intensity: s.intensity,
        fatigue:   s.fatigue === "high" ? 3 : s.fatigue === "medium" ? 2 : 1,
        fatigueLabel: s.fatigue,
        repsWeight: s.reps_weight || "",
      })
    })
  })

  if (allSets.length < 2) return null   // need at least 2 points to draw a line

  const {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
  } = window.Recharts || {}

  // Recharts is available via import at top of file
  // Make sure you have: import { LineChart, Line, ... } from "recharts"

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{
        background: "#1a1a1a", border: "1px solid #333", borderRadius: "10px",
        padding: "10px 14px", fontSize: "0.82rem"
      }}>
        <p style={{ color: "#ff6b35", fontWeight: "700", marginBottom: "4px" }}>{d?.fullName}</p>
        <p style={{ color: "#fff" }}>Intensity: <strong>{d?.intensity}/10</strong></p>
        <p style={{ color: d?.fatigueLabel === "high" ? "#ff3c00" : d?.fatigueLabel === "medium" ? "#ffcc00" : "#4caf50" }}>
          Fatigue: <strong>{d?.fatigueLabel}</strong>
        </p>
        {d?.repsWeight && <p style={{ color: "#888", marginTop: "4px" }}>{d.repsWeight}</p>}
      </div>
    )
  }

  // Detect trend — is intensity dropping?
  const first = allSets[0].intensity
  const last  = allSets[allSets.length - 1].intensity
  const drop  = first - last
  const trendColor = drop >= 2 ? "#ff3c00" : drop >= 1 ? "#ffcc00" : "#4caf50"
  const trendMsg   = drop >= 2
    ? `⚡ Form declining — intensity dropped ${drop} points across session`
    : drop >= 1
    ? `🟡 Slight fatigue detected — monitor next set closely`
    : `✅ Form holding strong across all sets`

  return (
    <div style={{ background: "#111", border: "1px solid #222", borderRadius: "16px", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700", letterSpacing: "1px" }}>
            📈 FORM TREND
          </p>
          <p style={{ fontSize: "0.82rem", color: "#555", marginTop: "2px" }}>
            Intensity across all sets this session
          </p>
        </div>
        <span style={{
          fontSize: "0.78rem", padding: "4px 12px", borderRadius: "999px", fontWeight: "600",
          background: drop >= 2 ? "#2a0808" : drop >= 1 ? "#1a1a08" : "#0a1a0a",
          border: `1px solid ${trendColor}`, color: trendColor
        }}>
          {trendMsg}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={allSets} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
          <XAxis
            dataKey="name"
            tick={{ fill: "#666", fontSize: 11 }}
            axisLine={{ stroke: "#2a2a2a" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fill: "#666", fontSize: 11 }}
            axisLine={{ stroke: "#2a2a2a" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Warning zone — below 5 is concerning */}
          <ReferenceLine y={5} stroke="#333" strokeDasharray="4 4" label={{ value: "threshold", fill: "#444", fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="intensity"
            stroke={trendColor}
            strokeWidth={2.5}
            dot={{ fill: trendColor, r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, fill: "#ff6b35" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function App() {
  const [step, setStep] = useState("upload")        // "upload" | "results" | "summary"
  const [video, setVideo] = useState(null)
  const [preferences, setPreferences] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  // ── Session state ──────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(null)
  const [fatigueAlert, setFatigueAlert] = useState(null)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [sessionSummary, setSessionSummary] = useState(null)

  // ── Exercise / set state ───────────────────────────────────────────────────
  const [exerciseName, setExerciseName] = useState("")
  const [repsWeight, setRepsWeight] = useState("")        // e.g. "3 reps @ 100kg"
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState("")

  // Structured session log:
  // [ { exercise_name, sets: [ { set_number, reps_weight, intensity, fatigue, feedback } ] } ]
  const [sessionLog, setSessionLog] = useState([])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const currentExercise = sessionLog.find(e => e.exercise_name === exerciseName)
  const currentSetNumber = currentExercise ? currentExercise.sets.length + 1 : 1

  const [recoveryStatus, setRecoveryStatus] = useState(null)

  useEffect(() => {
    axios.get("http://localhost:8000/recovery/status/user_001")
      .then(res => setRecoveryStatus(res.data.recovery_status))
      .catch(() => {})
  }, [])

  const filteredExercises = EXERCISE_LIST.filter(e =>
    e.toLowerCase().includes(exerciseSearch.toLowerCase())
  )

  const ensureSession = async () => {
    if (sessionId) return sessionId
    const res = await axios.post("http://localhost:8000/session/start", { user_id: "user_001" })
    setSessionId(res.data.session_id)
    return res.data.session_id
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleVideoUpload = (e) => setVideo(e.target.files[0])

  const handleSelectExercise = (name) => {
    setExerciseName(name)
    setExerciseSearch("")
    setShowExerciseDropdown(false)
  }

  const handleAnalyze = async () => {
    if (!exerciseName) { alert("Please select an exercise first!"); return }
    setLoading(true)
    const sid = await ensureSession()

    const formData = new FormData()
    formData.append("video", video)
    formData.append("cuisine", "any")
    formData.append("user_id", "user_001")
    formData.append("session_id", sid)
    formData.append("set_number", currentSetNumber)
    formData.append("exercise_name", exerciseName)
    formData.append("preferences", preferences)

    console.log("Sending exercise_name:", exerciseName)

    try {
      const res = await axios.post("http://localhost:8000/analyze", formData)
      const data = res.data
      console.log("Response exercise_name:", data.exercise_name)

      if (data.fatigue_alert?.warning) setFatigueAlert(data.fatigue_alert)

      // Add set to session log under the correct exercise
      setSessionLog(prev => {
        const existing = prev.find(e => e.exercise_name === exerciseName)
        const newSet = {
          set_number:  currentSetNumber,
          reps_weight: repsWeight,
          intensity:   data.intensity_score,
          fatigue:     data.fatigue_level,
          feedback:    data.form_feedback,
        }
        if (existing) {
          return prev.map(e =>
            e.exercise_name === exerciseName
              ? { ...e, sets: [...e.sets, newSet] }
              : e
          )
        } else {
          return [...prev, { exercise_name: exerciseName, sets: [newSet] }]
        }
      })

      setRepsWeight("")   // clear reps/weight for next set
      setResults(data)
      setStep("results")
    } catch (err) {
      alert("Something went wrong! Is the backend running?")
    }
    setLoading(false)
  }

  const handleFinishSession = async () => {
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/session/finish", {
        user_id:    "user_001",
        session_id: sessionId,
        cuisine:    "any",
        preferences
      })
      setSessionSummary(res.data)
      setResults(prev => ({
        ...prev,
        session_summary:   res.data.session_summary,
        muscle_activation: res.data.muscle_activation,
        recovery_timeline: res.data.recovery_timeline,
        meal:              res.data.meal,
      }))
      setSessionFinished(true)
      setStep("summary")
    } catch (err) {
      alert("Could not finish session!")
    }
    setLoading(false)
  }

  const handleChat = async (overrideMessage) => {
    const message = overrideMessage || chatInput
    if (!message.trim()) return
    const userMsg = { role: "user", content: message }
    const newHistory = [...chatHistory, userMsg]
    setChatHistory(newHistory)
    setChatInput("")
    setChatLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/chat", {
        message,
        context: { ...results, session_log: sessionLog },
        history: newHistory,
        user_id: "user_001"
      })
      setChatHistory(prev => [...prev, { role: "assistant", content: res.data.reply }])
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong!" }])
    }
    setChatLoading(false)
  }

  const handleReset = () => {
    setStep("upload"); setResults(null); setVideo(null)
    setChatHistory([]); setSessionId(null)
    setExerciseName(""); setRepsWeight("")
    setSessionLog([]); setSessionFinished(false)
    setSessionSummary(null); setFatigueAlert(null)
  }

  // ── UPLOAD SCREEN ──────────────────────────────────────────────────────────

  if (step === "upload") return (
    <div className="app" style={{ alignItems: "flex-start", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ display: "flex", gap: "24px", width: "100%", maxWidth: "1100px", alignItems: "flex-start" }}>

        {/* ── LEFT COLUMN: Recovery Dashboard ─────────────────────────────── */}
        <div style={{ width: "320px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: "16px", padding: "20px" }}>
            <p style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700", letterSpacing: "1px", marginBottom: "16px" }}>
              📊 RECOVERY STATUS
            </p>
            {recoveryStatus ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {Object.entries(recoveryStatus)
                  .filter(([, d]) => d.last_trained !== null)
                  .sort(([, a], [, b]) => a.recovery_pct - b.recovery_pct)
                  .map(([muscle, data]) => {
                    const color = data.recovery_pct >= 80 ? "#4caf50"
                      : data.recovery_pct >= 50 ? "#ffcc00" : "#ff3c00"
                    return (
                      <div key={muscle}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontSize: "0.82rem", color: "#ccc" }}>{data.display_name}</span>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <span style={{ fontSize: "0.7rem", color: "#555" }}>{data.hours_since}h ago</span>
                            <span style={{ fontSize: "0.78rem", fontWeight: "700", color, minWidth: "34px", textAlign: "right" }}>
                              {data.recovery_pct}%
                            </span>
                          </div>
                        </div>
                        <div style={{ background: "#1a1a1a", borderRadius: "999px", height: "5px", overflow: "hidden" }}>
                          <div style={{
                            width: `${data.recovery_pct}%`, height: "100%",
                            background: color, borderRadius: "999px", transition: "width 1s ease",
                            boxShadow: data.recovery_pct < 50 ? `0 0 6px ${color}` : "none"
                          }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: "#555" }}>No training history yet.</p>
            )}
          </div>

          {/* Session log preview — shows up once first set is done */}
          {sessionLog.length > 0 && (
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: "16px", padding: "20px" }}>
              <p style={{ fontSize: "0.75rem", color: "#888", fontWeight: "700", letterSpacing: "1px", marginBottom: "12px" }}>
                SESSION SO FAR
              </p>
              {sessionLog.map((ex, i) => (
                <div key={i} style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "0.85rem", color: "#ff6b35", fontWeight: "700", marginBottom: "6px" }}>
                    {ex.exercise_name}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {ex.sets.map((s, j) => (
                      <div key={j} style={{
                        display: "flex", justifyContent: "space-between",
                        background: "#1a1a1a", borderRadius: "8px", padding: "6px 10px"
                      }}>
                        <span style={{ fontSize: "0.78rem", color: "#ccc" }}>
                          Set {s.set_number}{s.reps_weight ? ` · ${s.reps_weight}` : ""}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#888" }}>{s.intensity}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleFinishSession}
                disabled={loading}
                style={{
                  width: "100%", marginTop: "8px",
                  background: "linear-gradient(135deg, #ff6b35, #ff3c00)",
                  border: "none", borderRadius: "10px", padding: "12px",
                  color: "#fff", fontWeight: "700", fontSize: "0.88rem", cursor: "pointer"
                }}
              >
                {loading ? "Calculating..." : "Finish Session →"}
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Upload Flow ─────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>

          <div className="hero">
            <h1>Form & Feast</h1>
            <p className="tagline">Upload your workout. Get your perfect recovery meal.</p>
          </div>

          {/* Exercise selector */}
          <div style={{ width: "100%", position: "relative" }}>
            <div
              onClick={() => setShowExerciseDropdown(v => !v)}
              style={{
                width: "100%", background: "#111",
                border: `1px solid ${exerciseName ? "#ff6b35" : "#333"}`,
                borderRadius: "12px", padding: "14px 18px",
                color: exerciseName ? "#fff" : "#555",
                fontSize: "1rem", cursor: "pointer",
                display: "flex", justifyContent: "space-between"
              }}
            >
              <span>{exerciseName || "Select exercise..."}</span>
              <span style={{ color: "#666" }}>▾</span>
            </div>

            {showExerciseDropdown && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "#181818", border: "1px solid #333", borderRadius: "12px",
                zIndex: 100, maxHeight: "260px", overflow: "hidden", display: "flex", flexDirection: "column"
              }}>
                <input
                  autoFocus
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChange={e => setExerciseSearch(e.target.value)}
                  style={{
                    background: "#111", border: "none", borderBottom: "1px solid #2a2a2a",
                    padding: "12px 16px", color: "#fff", fontSize: "0.9rem", outline: "none"
                  }}
                />
                <div style={{ overflowY: "auto", maxHeight: "200px" }}>
                  {filteredExercises.map(ex => (
                    <div key={ex} onClick={() => handleSelectExercise(ex)}
                      style={{
                        padding: "11px 16px", cursor: "pointer", fontSize: "0.9rem",
                        color: ex === exerciseName ? "#ff6b35" : "#ccc",
                        background: ex === exerciseName ? "#1a1008" : "transparent",
                        borderBottom: "1px solid #1a1a1a"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#222"}
                      onMouseLeave={e => e.currentTarget.style.background = ex === exerciseName ? "#1a1008" : "transparent"}
                    >
                      {ex}
                    </div>
                  ))}
                  {filteredExercises.length === 0 && (
                    <div style={{ padding: "12px 16px", color: "#555", fontSize: "0.85rem" }}>No exercises found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reps & weight */}
          {exerciseName && (
            <div className="chat-input-row">
              <input
                placeholder={`Set ${currentSetNumber} — e.g. "3 reps @ 100kg"`}
                value={repsWeight}
                onChange={e => setRepsWeight(e.target.value)}
              />
            </div>
          )}

          {/* Video upload */}
          <div className="upload-box" onClick={() => document.getElementById("fileInput").click()}>
            {video ? (
              <div className="upload-ready">
                <span className="check">✓</span>
                <p>{video.name}</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <span className="upload-icon">🎬</span>
                <p>Click to upload your set video</p>
                <span className="upload-sub">MP4, MOV supported · keep it under 60s</span>
              </div>
            )}
            <input id="fileInput" type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: "none" }} />
          </div>

          <div className="chat-input-row">
            <input
              placeholder="Any notes? e.g. 'I prefer fish, no gluten'"
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
            />
          </div>

          {video && exerciseName && (
            <button onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing with AI..." : `Analyze Set ${currentSetNumber} →`}
            </button>
          )}

          <div className="features-row">
            <div className="feature">🎥 Video Analysis</div>
            <div className="feature">🤖 Nova AI</div>
            <div className="feature">🍱 Smart Nutrition</div>
          </div>
        </div>

      </div>
    </div>
  )
  // ── RESULTS SCREEN (per-set feedback) ─────────────────────────────────────
  if (step === "results" && results) return (
    <div className="app">
      <div className="results-screen">
        <h1 className="results-title">Set {results.set_number} Analysis</h1>
        <p className="exercise-detected">🏋️ <strong>{results.exercise_name}</strong> · Set {results.set_number}</p>

        {/* Fatigue alert */}
        {fatigueAlert?.warning && (
          <div style={{
            width: "100%",
            background: fatigueAlert.severity === "high" ? "#2a0808" : "#1a1008",
            border: `1px solid ${fatigueAlert.severity === "high" ? "#ff2200" : "#ff6b35"}`,
            borderRadius: "12px", padding: "14px 18px", display: "flex", gap: "12px"
          }}>
            <span style={{ fontSize: "1.3rem" }}>⚡</span>
            <div>
              <p style={{ fontSize: "0.75rem", color: "#ff4444", fontWeight: "700", marginBottom: "4px", letterSpacing: "1px" }}>FATIGUE WARNING</p>
              <p style={{ fontSize: "0.9rem", color: "#fff", lineHeight: "1.5" }}>{fatigueAlert.message}</p>
            </div>
          </div>
        )}

        <div className="top-cards">
          {/* Form Feedback */}
          <div className="card">
            <div className="card-header"><span>💪</span><h2>Form Feedback</h2></div>
            <div className="intensity-bar-wrap">
              <p>Intensity Score</p>
              <div className="intensity-bar">
                <div className="intensity-fill" style={{ width: `${results.intensity_score * 10}%` }} />
              </div>
              <span>{results.intensity_score}/10</span>
            </div>
            <div className="badges">
              <span className="badge">Volume: {results.estimated_volume}</span>
              <span className="badge">Fatigue: {results.fatigue_level}</span>
            </div>
            <ul className="feedback-list">
              {results.form_feedback.map((f, i) => (
                <li key={i}><span className="feedback-icon">→</span>{f}</li>
              ))}
            </ul>
            {results.next_set_objective && (
              <div style={{ background: "linear-gradient(135deg, #1a1208, #2a1a08)", border: "1px solid #ff6b35", borderRadius: "12px", padding: "14px 16px" }}>
                <p style={{ fontSize: "0.75rem", color: "#ff9a5c", fontWeight: "700", marginBottom: "6px" }}>🎯 NEXT SET OBJECTIVE</p>
                <p style={{ fontSize: "0.9rem", color: "#fff", lineHeight: "1.5" }}>{results.next_set_objective}</p>
              </div>
            )}
            {results.injury_flags?.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "0.75rem", color: "#ff4444", fontWeight: "700", letterSpacing: "1px" }}>⚠️ INJURY RISK</p>
                {results.injury_flags.map((flag, i) => (
                  <div key={i} style={{
                    background: flag.severity === "high" ? "#2a0808" : "#1a1008",
                    border: `1px solid ${flag.severity === "high" ? "#ff2200" : "#ff6b35"}`,
                    borderRadius: "10px", padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#fff", textTransform: "capitalize" }}>{flag.issue}</span>
                      <span style={{ fontSize: "0.7rem", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", background: flag.severity === "high" ? "#ff2200" : "#ff6b35", color: "#fff", textTransform: "uppercase" }}>{flag.severity}</span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#ff9a9a" }}>⚠️ {flag.risk}</p>
                    <p style={{ fontSize: "0.85rem", color: "#ccc", marginTop: "4px" }}>✅ {flag.fix}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Muscle Activation */}
          <div className="card">
            <div className="card-header"><span>🔥</span><h2>Muscle Activation</h2></div>
            <div className="primary-secondary">
              <div>
                <p className="ms-label">Primary</p>
                <div className="muscle-tags">
                  {results.primary_muscles.map((m, i) => <span key={i} className="muscle-tag primary">{m}</span>)}
                </div>
              </div>
              <div>
                <p className="ms-label">Secondary</p>
                <div className="muscle-tags">
                  {results.secondary_muscles.map((m, i) => <span key={i} className="muscle-tag secondary">{m}</span>)}
                </div>
              </div>
            </div>
            <MuscleMap activation={results.muscle_activation} />
            <div className="muscle-bars">
              {Object.entries(results.muscle_activation)
                .filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a)
                .map(([muscle, value]) => (
                  <div key={muscle} className="muscle-bar-row">
                    <span className="muscle-name">{muscle.replace(/_/g, " ")}</span>
                    <div className="muscle-bar-track">
                      <div className="muscle-bar-fill" style={{
                        width: `${value}%`,
                        background: value > 70 ? "linear-gradient(90deg, #ff3c00, #ff6b35)" : value > 40 ? "linear-gradient(90deg, #ff6b35, #ff9a5c)" : "linear-gradient(90deg, #ff9a5c, #ffcba4)"
                      }} />
                    </div>
                    <span className="muscle-pct">{value}%</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Session log */}
        <div className="card full-width">
          <div className="card-header"><span>📋</span><h2>Session Log</h2></div>
          {sessionLog.map((ex, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "0.9rem", color: "#ff6b35", fontWeight: "700", marginBottom: "8px" }}>{ex.exercise_name}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {ex.sets.map((s, j) => (
                  <div key={j} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#1a1a1a", borderRadius: "8px", padding: "8px 14px"
                  }}>
                    <span style={{ fontSize: "0.85rem", color: "#ccc" }}>
                      Set {s.set_number}{s.reps_weight ? <span style={{ color: "#888" }}> · {s.reps_weight}</span> : ""}
                    </span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", color: "#888" }}>{s.intensity}/10</span>
                      <span style={{
                        fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", fontWeight: "700",
                        background: s.fatigue === "high" ? "#ff2200" : s.fatigue === "medium" ? "#ff6b35" : "#2a5a2a",
                        color: "#fff"
                      }}>{s.fatigue}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <FormTrendLine sessionLog={sessionLog} />

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
            <button
              onClick={() => { setVideo(null); setStep("upload") }}
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", color: "#ccc", borderRadius: "12px", padding: "13px", fontWeight: "700" }}
            >
              + Next Set
            </button>
            <button
              onClick={() => { setExerciseName(""); setVideo(null); setStep("upload") }}
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #ff6b35", color: "#ff6b35", borderRadius: "12px", padding: "13px", fontWeight: "700" }}
            >
              + New Exercise
            </button>
            <button
              onClick={handleFinishSession}
              disabled={loading}
              style={{ flex: 1, background: "linear-gradient(135deg, #ff6b35, #ff3c00)", borderRadius: "12px", padding: "13px", fontWeight: "700", color: "#fff", border: "none" }}
            >
              {loading ? "..." : "Finish →"}
            </button>
          </div>
        </div>

        {/* Coach Chat */}
        <div className="card full-width">
          <div className="card-header"><span>🧠</span><h2>Ask Your Coach</h2></div>
          <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "12px" }}>
            Ask about this set, form corrections, or when to move to the next exercise.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", maxHeight: "320px", overflowY: "auto" }}>
            {chatHistory.length === 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["Should I add weight next set?", "Is my form safe enough to continue?", "Should I move to the next exercise?", "How many more sets should I do?"].map((s, i) => (
                  <button key={i} onClick={() => handleChat(s)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "999px", padding: "6px 14px", fontSize: "0.8rem", color: "#aaa", cursor: "pointer", width: "auto" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #ff6b35, #ff3c00)" : "#1a1a1a",
                  border: msg.role === "assistant" ? "1px solid #2a2a2a" : "none",
                  fontSize: "0.88rem", color: "#fff", lineHeight: "1.5"
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                  <span style={{ color: "#888", fontSize: "0.88rem" }}>Coach is thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleChat()}
              placeholder="Ask your coach anything..."
              style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: "12px", padding: "12px 16px", color: "#fff", fontSize: "0.9rem", outline: "none" }}
            />
            <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
              style={{ background: "linear-gradient(135deg, #ff6b35, #ff3c00)", border: "none", borderRadius: "12px", padding: "12px 20px", color: "#fff", fontWeight: "700", fontSize: "0.9rem", width: "auto" }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── SESSION SUMMARY SCREEN ─────────────────────────────────────────────────
  if (step === "summary" && sessionSummary) return (
    <div className="app">
      <div className="results-screen">
        <h1 className="results-title">Session Complete 🎉</h1>
        <p style={{ color: "#888", fontSize: "1rem" }}>
          {sessionSummary.session_summary?.total_sets} sets · {sessionSummary.exercises_done?.length} exercises · avg intensity {sessionSummary.session_summary?.avg_intensity}/10
        </p>

        {/* Full session log */}
        <div className="card full-width">
          <div className="card-header"><span>📋</span><h2>Full Session Log</h2></div>
          {sessionLog.map((ex, i) => (
            <div key={i} style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "0.95rem", color: "#ff6b35", fontWeight: "700", marginBottom: "8px" }}>{ex.exercise_name}</p>
              {ex.sets.map((s, j) => (
                <div key={j} style={{
                  display: "flex", justifyContent: "space-between",
                  background: "#1a1a1a", borderRadius: "8px", padding: "8px 14px", marginBottom: "4px"
                }}>
                  <span style={{ fontSize: "0.85rem", color: "#ccc" }}>Set {s.set_number}{s.reps_weight ? ` · ${s.reps_weight}` : ""}</span>
                  <span style={{ fontSize: "0.8rem", color: "#888" }}>{s.intensity}/10 · {s.fatigue} fatigue</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Muscle heatmap for full session */}
        <div className="card full-width">
          <div className="card-header"><span>🔥</span><h2>Muscles Trained This Session</h2></div>
          <MuscleMap activation={sessionSummary.muscle_activation} />
        </div>

        {/* Recovery timeline */}
        <div className="card full-width">
          <div className="card-header"><span>⏱️</span><h2>Recovery Timeline</h2></div>
          <div className="recovery-grid">
            {Object.entries(sessionSummary.recovery_timeline || {})
              .filter(([, hours]) => hours > 0).sort(([, a], [, b]) => b - a)
              .map(([muscle, hours]) => (
                <div key={muscle} className="recovery-item">
                  <div className="recovery-circle" style={{ borderColor: hours >= 48 ? "#ff3c00" : hours >= 36 ? "#ff6b35" : "#ff9a5c" }}>
                    <span className="recovery-hours">{hours}h</span>
                  </div>
                  <span className="recovery-muscle">{muscle.replace(/_/g, " ")}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Session meal — recalculated for total volume */}
        <div className="card full-width">
          <div className="card-header"><span>🍽️</span><h2>Recovery Meal</h2></div>
          <p style={{ fontSize: "0.8rem", color: "#4caf50", marginBottom: "8px" }}>
            ✅ Recalculated for your full session volume ({sessionSummary.total_sets} sets)
          </p>
          <h3 className="meal-name">{results?.meal?.recipe_name}</h3>
          <div className="macros-row">
            <div className="macro"><span className="macro-val">{results?.meal?.macros?.protein_g}g</span><span className="macro-label">Protein</span></div>
            <div className="macro"><span className="macro-val">{results?.meal?.macros?.carbs_g}g</span><span className="macro-label">Carbs</span></div>
            <div className="macro"><span className="macro-val">{results?.meal?.macros?.fat_g}g</span><span className="macro-label">Fat</span></div>
            <div className="macro"><span className="macro-val">{results?.meal?.macros?.calories}</span><span className="macro-label">kcal</span></div>
          </div>
          {results?.meal?.nutrition_reasoning && (
            <div style={{ background: "linear-gradient(135deg, #0a1a0a, #0f1f0f)", border: "1px solid #2a5a2a", borderRadius: "12px", padding: "14px 16px", margin: "8px 0" }}>
              <p style={{ fontSize: "0.75rem", color: "#4caf50", fontWeight: "700", marginBottom: "6px" }}>🧬 WHY THIS MEAL?</p>
              <p style={{ fontSize: "0.88rem", color: "#ccc", lineHeight: "1.6" }}>{results?.meal?.nutrition_reasoning}</p>
            </div>
          )}

          {results?.meal?.carbon_footprint_kg && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "8px 0" }}>

              {/* Carbon score badge */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: results.meal.carbon_label?.startsWith("Low")
                  ? "#0a1a0a" : results.meal.carbon_label?.startsWith("Medium")
                  ? "#1a1a08" : "#1a0808",
                border: `1px solid ${results.meal.carbon_label?.startsWith("Low")
                  ? "#2a5a2a" : results.meal.carbon_label?.startsWith("Medium")
                  ? "#5a5a00" : "#5a1a00"}`,
                borderRadius: "12px", padding: "12px 16px"
              }}>
                <div>
                  <p style={{ fontSize: "0.75rem", fontWeight: "700", letterSpacing: "1px", marginBottom: "4px",
                    color: results.meal.carbon_label?.startsWith("Low") ? "#4caf50"
                      : results.meal.carbon_label?.startsWith("Medium") ? "#ffcc00" : "#ff6b35"
                  }}>
                    🌍 CARBON FOOTPRINT
                  </p>
                  <p style={{ fontSize: "0.88rem", color: "#ccc" }}>{results.meal.carbon_reasoning}</p>
                </div>
                <div style={{ textAlign: "center", flexShrink: 0, marginLeft: "16px" }}>
                  <p style={{ fontSize: "1.4rem", fontWeight: "900",
                    color: results.meal.carbon_label?.startsWith("Low") ? "#4caf50"
                      : results.meal.carbon_label?.startsWith("Medium") ? "#ffcc00" : "#ff6b35"
                  }}>
                    {results.meal.carbon_footprint_kg}kg
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#888" }}>CO₂e</p>
                  <p style={{ fontSize: "0.8rem", marginTop: "2px" }}>{results.meal.carbon_label}</p>
                </div>
              </div>

              {/* Sustainable swap suggestion */}
              {results.meal.sustainable_swap && (
                <div style={{
                  background: "#0d1a0d", border: "1px solid #1e4d1e",
                  borderRadius: "12px", padding: "14px 16px"
                }}>
                  <p style={{ fontSize: "0.75rem", color: "#4caf50", fontWeight: "700", marginBottom: "8px", letterSpacing: "1px" }}>
                    ♻️ SUSTAINABLE SWAP
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                    <span style={{
                      background: "#1a0808", border: "1px solid #5a1a00", borderRadius: "8px",
                      padding: "4px 12px", fontSize: "0.85rem", color: "#ff9a5c",
                      textDecoration: "line-through"
                    }}>
                      {results.meal.sustainable_swap.ingredient}
                    </span>
                    <span style={{ color: "#555", fontSize: "1rem" }}>→</span>
                    <span style={{
                      background: "#0a1a0a", border: "1px solid #2a5a2a", borderRadius: "8px",
                      padding: "4px 12px", fontSize: "0.85rem", color: "#4caf50"
                    }}>
                      {results.meal.sustainable_swap.swap}
                    </span>
                    <span style={{
                      background: "#0a1a0a", border: "1px solid #1e4d1e", borderRadius: "999px",
                      padding: "3px 10px", fontSize: "0.78rem", color: "#4caf50", fontWeight: "700"
                    }}>
                      saves {results.meal.sustainable_swap.co2_saving_kg}kg CO₂e
                    </span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "#888", lineHeight: "1.5" }}>
                    💪 {results.meal.sustainable_swap.performance_note}
                  </p>
                </div>
              )}
            </div>
          )}
          <div className="ingredients-grid">
            {results?.meal?.ingredients?.map((ing, i) => <span key={i} className="ingredient-chip">{ing}</span>)}
          </div>
          {results?.meal?.drink_pairing && <div className="drink-pairing">🍵 {results.meal.drink_pairing}</div>}
        </div>

        {/* Coach chat on summary screen */}
        <div className="card full-width">
          <div className="card-header"><span>🧠</span><h2>Ask Your Coach</h2></div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", maxHeight: "280px", overflowY: "auto" }}>
            {chatHistory.length === 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {["What should I train tomorrow?", "How long until I can train legs again?", "Can I swap the chicken for something else?", "How was my overall session?"].map((s, i) => (
                  <button key={i} onClick={() => handleChat(s)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "999px", padding: "6px 14px", fontSize: "0.8rem", color: "#aaa", width: "auto" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg, #ff6b35, #ff3c00)" : "#1a1a1a",
                  border: msg.role === "assistant" ? "1px solid #2a2a2a" : "none",
                  fontSize: "0.88rem", color: "#fff", lineHeight: "1.5"
                }}>{msg.content}</div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                  <span style={{ color: "#888" }}>Coach is thinking...</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChat()}
              placeholder="Ask your coach anything..."
              style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: "12px", padding: "12px 16px", color: "#fff", fontSize: "0.9rem", outline: "none" }} />
            <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
              style={{ background: "linear-gradient(135deg, #ff6b35, #ff3c00)", border: "none", borderRadius: "12px", padding: "12px 20px", color: "#fff", fontWeight: "700", fontSize: "0.9rem", width: "auto" }}>
              Send
            </button>
          </div>
        </div>

        <button className="start-over" onClick={handleReset}>← Start New Session</button>
      </div>
    </div>
  )

  return null
}
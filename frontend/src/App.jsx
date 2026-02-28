import { useState } from "react"
import axios from "axios"
import "./App.css"
import MuscleMap from "./MuscleMap"

export default function App() {
  const [step, setStep] = useState("upload")
  const [video, setVideo] = useState(null)
  const [preferences, setPreferences] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  const handleVideoUpload = (e) => {
    setVideo(e.target.files[0])
  }

  const handleAnalyze = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append("video", video)
    formData.append("cuisine", "any")
    formData.append("user_id", "user_001")
    formData.append("preferences", preferences)

    try {
      const res = await axios.post("http://localhost:8000/analyze", formData)
      setResults(res.data)
      setStep("results")
    } catch (err) {
      alert("Something went wrong! Is the backend running?")
    }
    setLoading(false)
  }

  return (
    <div className="app">

      {/* UPLOAD SCREEN */}
      {step === "upload" && (
        <div className="screen">
          <div className="hero">
            <h1>Form & Feast</h1>
            <p className="tagline">Upload your workout. Get your perfect recovery meal.</p>
          </div>

          <div className="upload-box" onClick={() => document.getElementById("fileInput").click()}>
            {video ? (
              <div className="upload-ready">
                <span className="check">✓</span>
                <p>{video.name}</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <span className="upload-icon">🎬</span>
                <p>Click to upload your workout video</p>
                <span className="upload-sub">MP4, MOV supported</span>
              </div>
            )}
            <input id="fileInput" type="file" accept="video/*" onChange={handleVideoUpload} style={{display:"none"}} />
          </div>

          <div className="chat-input-row">
            <input
              placeholder="Any notes? e.g. 'I prefer fish, no gluten, make it spicy'"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
            />
          </div>

          {video && (
            <button onClick={handleAnalyze} disabled={loading}>
              {loading ? "Analyzing with AI ..." : "Analyze My Workout →"}
            </button>
          )}

          <div className="features-row">
            <div className="feature">🎥 Video Analysis</div>
            <div className="feature">🤖 Nova AI</div>
            <div className="feature">🍱 Smart Nutrition</div>
          </div>
        </div>
      )}

      {/* RESULTS SCREEN */}
      {step === "results" && results && (
        <div className="results-screen">
          <h1 className="results-title">Your Analysis</h1>
          <p className="exercise-detected">🏋️ Detected: <strong>{results.exercise_name}</strong></p>

          <div className="top-cards">

            {/* Form Feedback */}
            <div className="card">
              <div className="card-header">
                <span>💪</span>
                <h2>Form Feedback</h2>
              </div>
              <div className="intensity-bar-wrap">
                <p>Intensity Score</p>
                <div className="intensity-bar">
                  <div className="intensity-fill" style={{width: `${results.intensity_score * 10}%`}}></div>
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

              {/* Next Set Objective */}
              {results.next_set_objective && (
                <div style={{background:"linear-gradient(135deg, #1a1208, #2a1a08)", border:"1px solid #ff6b35", borderRadius:"12px", padding:"14px 16px", marginTop:"8px"}}>
                  <p style={{fontSize:"0.75rem", color:"#ff9a5c", fontWeight:"700", marginBottom:"6px"}}>
                    🎯 NEXT SET OBJECTIVE
                  </p>
                  <p style={{fontSize:"0.9rem", color:"#fff", lineHeight:"1.5"}}>
                    {results.next_set_objective}
                  </p>
                </div>
              )}

              {/* Injury Flags */}
              {results.injury_flags && results.injury_flags.length > 0 && (
                <div style={{display:"flex", flexDirection:"column", gap:"10px", marginTop:"8px"}}>
                  <p style={{fontSize:"0.75rem", color:"#ff4444", fontWeight:"700", letterSpacing:"1px"}}>
                    ⚠️ INJURY RISK DETECTED
                  </p>
                  {results.injury_flags.map((flag, i) => (
                    <div key={i} style={{
                      background: flag.severity === "high" ? "#2a0808" : flag.severity === "moderate" ? "#1a1008" : "#0a1a0a",
                      border: `1px solid ${flag.severity === "high" ? "#ff2200" : flag.severity === "moderate" ? "#ff6b35" : "#ffaa70"}`,
                      borderRadius:"10px", padding:"12px 14px", display:"flex", flexDirection:"column", gap:"6px"
                    }}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                        <span style={{fontSize:"0.9rem", fontWeight:"700", color:"#fff", textTransform:"capitalize"}}>
                          {flag.issue}
                        </span>
                        <span style={{
                          fontSize:"0.7rem", fontWeight:"700", padding:"2px 8px", borderRadius:"999px",
                          background: flag.severity === "high" ? "#ff2200" : flag.severity === "moderate" ? "#ff6b35" : "#ffaa70",
                          color:"#fff", textTransform:"uppercase"
                        }}>
                          {flag.severity}
                        </span>
                      </div>
                      <p style={{fontSize:"0.8rem", color:"#ff9a9a"}}>⚠️ Risk: {flag.risk}</p>
                      <p style={{fontSize:"0.85rem", color:"#ccc"}}>✅ Fix: {flag.fix}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Muscle Activation */}
            <div className="card">
              <div className="card-header">
                <span>🔥</span>
                <h2>Muscle Activation</h2>
              </div>
              <div className="primary-secondary">
                <div>
                  <p className="ms-label">Primary</p>
                  <div className="muscle-tags">
                    {results.primary_muscles.map((m, i) => (
                      <span key={i} className="muscle-tag primary">{m}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="ms-label">Secondary</p>
                  <div className="muscle-tags">
                    {results.secondary_muscles.map((m, i) => (
                      <span key={i} className="muscle-tag secondary">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              <MuscleMap activation={results.muscle_activation} />
              <div className="muscle-bars">
                {Object.entries(results.muscle_activation)
                  .filter(([, val]) => val > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([muscle, value]) => (
                    <div key={muscle} className="muscle-bar-row">
                      <span className="muscle-name">{muscle.replace(/_/g, " ")}</span>
                      <div className="muscle-bar-track">
                        <div className="muscle-bar-fill" style={{
                          width: `${value}%`,
                          background: value > 70
                            ? "linear-gradient(90deg, #ff3c00, #ff6b35)"
                            : value > 40
                            ? "linear-gradient(90deg, #ff6b35, #ff9a5c)"
                            : "linear-gradient(90deg, #ff9a5c, #ffcba4)"
                        }}></div>
                      </div>
                      <span className="muscle-pct">{value}%</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Recovery Timeline */}
          <div className="card full-width">
            <div className="card-header">
              <span>⏱️</span>
              <h2>Recovery Timeline</h2>
            </div>
            <div className="recovery-grid">
              {Object.entries(results.recovery_timeline)
                .filter(([, hours]) => hours > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([muscle, hours]) => (
                  <div key={muscle} className="recovery-item">
                    <div className="recovery-circle" style={{
                      borderColor: hours >= 48 ? "#ff3c00" : hours >= 36 ? "#ff6b35" : "#ff9a5c"
                    }}>
                      <span className="recovery-hours">{hours}h</span>
                    </div>
                    <span className="recovery-muscle">{muscle.replace(/_/g, " ")}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Meal Card */}
          <div className="card full-width">
            <div className="card-header">
              <span>🍽️</span>
              <h2>Recovery Meal</h2>
            </div>
            <h3 className="meal-name">{results.meal.recipe_name}</h3>
            <div className="macros-row">
              <div className="macro">
                <span className="macro-val">{results.meal.macros.protein_g}g</span>
                <span className="macro-label">Protein</span>
              </div>
              <div className="macro">
                <span className="macro-val">{results.meal.macros.carbs_g}g</span>
                <span className="macro-label">Carbs</span>
              </div>
              <div className="macro">
                <span className="macro-val">{results.meal.macros.fat_g}g</span>
                <span className="macro-label">Fat</span>
              </div>
              <div className="macro">
                <span className="macro-val">{results.meal.macros.calories}</span>
                <span className="macro-label">kcal</span>
              </div>
            </div>

            {/* Why this meal? */}
            {results.meal.nutrition_reasoning && (
              <div style={{background:"linear-gradient(135deg, #0a1a0a, #0f1f0f)", border:"1px solid #2a5a2a", borderRadius:"12px", padding:"14px 16px", margin:"8px 0"}}>
                <p style={{fontSize:"0.75rem", color:"#4caf50", fontWeight:"700", marginBottom:"6px", letterSpacing:"1px"}}>
                  🧬 WHY THIS MEAL?
                </p>
                <p style={{fontSize:"0.88rem", color:"#ccc", lineHeight:"1.6"}}>
                  {results.meal.nutrition_reasoning}
                </p>
              </div>
            )}

            <h4>Ingredients</h4>
            <div className="ingredients-grid">
              {Array.isArray(results.meal.ingredients)
                ? results.meal.ingredients.map((ing, i) => {
                    const ingName = ing.split(" ").slice(1).join(" ").split(":")[0].trim()
                    const reason = results.meal.ingredient_reasoning?.[ingName]
                    return (
                      <div key={i} className="ingredient-chip-wrap">
                        <span className="ingredient-chip">{ing}</span>
                        {reason && <span className="ingredient-why">💡 {reason}</span>}
                      </div>
                    )
                  })
                : Object.entries(results.meal.ingredients).map(([name, amount], i) => {
                    const reason = results.meal.ingredient_reasoning?.[name]
                    return (
                      <div key={i} className="ingredient-chip-wrap">
                        <span className="ingredient-chip">{name.replace(/_/g, " ")}: {amount}</span>
                        {reason && <span className="ingredient-why">💡 {reason}</span>}
                      </div>
                    )
                  })
              }
            </div>

            {results.meal.drink_pairing && (
              <div className="drink-pairing">🍵 {results.meal.drink_pairing}</div>
            )}
          </div>

          <button className="start-over" onClick={() => { setStep("upload"); setResults(null); setVideo(null); }}>
            ← Analyze Another Workout
          </button>

        </div>
      )}

    </div>
  )
}
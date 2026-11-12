import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";
import JSZip from "jszip";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const studyTabs = ["Overview", "Revision sheet", "Flashcards", "Practice exam"];

function makeStudyContent(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 5);
  const terms = sentences.filter((sentence) => sentence.length > 35).slice(0, 8);
  const cards = (terms.length ? terms : sentences).slice(0, 10).map((sentence, index) => ({
    question: `What is the key idea ${index + 1}?`,
    answer: sentence,
  }));
  const questions = (terms.length ? terms : sentences).slice(0, 5).map((sentence, index) => ({
    question: `Question ${index + 1}: Which statement best matches your course?`,
    answer: sentence,
    options: [sentence, "The document does not discuss this idea.", "This idea is the opposite of the course.", "None of the above"],
  }));
  return { summary, terms, cards, questions };
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [sourceText, setSourceText] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const [studyContent, setStudyContent] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answers, setAnswers] = useState({});
  const [writtenAnswers, setWrittenAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studymind-sessions") || "[]"); } catch { return []; }
  });
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedTask, setPlannedTask] = useState("");
  const [plans, setPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem("studymind-plans") || "[]"); } catch { return []; }
  });
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState("study");

  useEffect(() => { localStorage.setItem("studymind-sessions", JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem("studymind-plans", JSON.stringify(plans)); }, [plans]);
  useEffect(() => {
    if (!timerRunning) return undefined;
    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          if (timerMode === "study") {
            setSessions((old) => [{ id: Date.now(), title: "Session Pomodoro", date: new Date().toISOString(), minutes: pomodoroMinutes, kind: "Pomodoro" }, ...old].slice(0, 100));
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerMode, pomodoroMinutes]);

  const scrollToUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const processText = async (text, label = "Contenu") => {
    if (!text.trim()) {
      setMessage("Ajoute d'abord un document ou colle ton cours.");
      return;
    }
    setProcessing(true);
    setMessage("");
    try {
      // Laisse le temps à l'interface d'afficher son état de chargement.
      await new Promise((resolve) => setTimeout(resolve, 350));
      setSourceText(text);
      setStudyContent(makeStudyContent(text));
      setSessions((old) => [{ id: Date.now(), title: label, date: new Date().toISOString(), minutes: 0, kind: "Analyse du cours", characters: text.length }, ...old].slice(0, 100));
      setActiveTab("Overview");
      setCardIndex(0);
      setFlipped(false);
      setAnswers({});
      setWrittenAnswers({});
      setShowResults(false);
      setMessage(`${label} prêt à être consulté. Les supports affichés sont organisés à partir du texte fourni, sans génération IA pour le moment.`);
      setTimeout(() => document.getElementById("study-kit")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } finally {
      setProcessing(false);
    }
  };

  const handleFile = async () => {
    if (!file) {
      setMessage("Choisis un fichier ou colle ton cours dans la zone de texte.");
      return;
    }
    setProcessing(true);
    setMessage("Lecture du document en cours...");
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      let text = "";
      if (extension === "pdf" || file.type === "application/pdf") {
        const data = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n\n";
        }
      } else if (extension === "txt" || file.type.startsWith("text/")) {
        text = await file.text();
      } else if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value || "";
      } else if (extension === "pptx") {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slidePaths = Object.keys(zip.files)
          .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
          .sort((a, b) => {
            const numberA = Number(a.match(/slide(\d+)\.xml$/)?.[1] || 0);
            const numberB = Number(b.match(/slide(\d+)\.xml$/)?.[1] || 0);
            return numberA - numberB;
          });
        for (const path of slidePaths) {
          const xml = await zip.files[path].async("text");
          const documentXml = new DOMParser().parseFromString(xml, "application/xml");
          text += Array.from(documentXml.getElementsByTagName("a:t"))
            .map((node) => node.textContent || "")
            .join(" ") + "\n\n";
        }
      } else {
        setMessage("Format non pris en charge. Choisis un PDF, DOCX, PPTX ou TXT.");
        return;
      }
      if (!text.trim()) {
        setMessage("Aucun texte détecté. Le document est peut-être scanné ou vide.");
      } else {
        processText(text, file.name);
      }
    } catch (error) {
      console.error(error);
      setMessage("Impossible de lire ce fichier. Essaie un PDF avec du texte ou un fichier TXT.");
    } finally {
      setProcessing(false);
    }
  };

  const quiz = studyContent?.questions ?? [];
  const correctCount = quiz.reduce((total, question, index) => total + (answers[index] === 0 ? 1 : 0), 0);

  return (
    <div className="app">
      <style>{`@keyframes studyStarTurn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <header className="navbar">
        <a href="#home" className="brand" onClick={() => setActiveTab("Overview")}>
          <span className="brand-icon">♧</span><span>StudyMind AI</span>
        </a>
        <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          {menuOpen ? "✕" : "☰"}
        </button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#features" onClick={() => setMenuOpen(false)}>What you get</a>
          <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#library" onClick={() => setMenuOpen(false)}>My library</a>
          <button className="button button-dark nav-button" onClick={scrollToUpload}>Start studying</button>
        </nav>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="welcome-pill"><span className="sparkle">✧</span>Your cosy study companion</div>
            <h1>Turn your course<br />into a cosy little<br /><span className="highlight">study kit</span></h1>
            <p className="hero-description">Drop in a lecture, a chapter or last year's exam. StudyMind helps organise your material into revision notes, flashcards and a practice quiz.</p>
            <div className="hero-buttons">
              <button className="button button-dark" onClick={scrollToUpload}>Add your material <span className="arrow">→</span></button>
              <button className="button button-light" onClick={() => document.getElementById("study-kit")?.scrollIntoView({ behavior: "smooth" })}>My study kit</button>
            </div>
            <p className="small-print">PDF or text file <span>·</span> Paste your notes <span>·</span> Start for free</p>
          </div>
          <div className="hero-visual">
            <div className="paper-tape" />
            <article className="revision-card">
              <div className="revision-top"><span className="revision-label">REVISION SHEET</span><span className="coffee">♨</span></div>
              <h2>{studyContent ? "Your study kit" : "A little study kit"}</h2>
              <div className="paper-lines"><span /><span /><span /></div>
              <div className="must-know">
                <p className="mini-label">MUST KNOW</p>
                <ul>
                  {(studyContent?.summary.slice(0, 3) ?? ["Key concepts", "Definitions and examples", "Quick recall"]).map((item, index) => <li key={index}>{item.slice(0, 62)}{item.length > 62 ? "…" : ""}</li>)}
                </ul>
              </div>
              <div className="paper-footer">Key concepts · Quick recall</div>
            </article>
            <div className="floating-badge quiz-badge"><span className="check-icon">✓</span>{studyContent ? `${quiz.length} practice questions` : "Your pace, your way"}</div>
            <button className="floating-badge flashcard-badge" onClick={() => { setActiveTab("Flashcards"); document.getElementById("study-kit")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className="flash-icon">♧</span>{studyContent ? `${studyContent.cards.length} study cards` : "Flashcards"}
            </button>
            <div className="visual-decoration">✳</div>
          </div>
        </section>

        <section className="reassurance"><span>LESS CRAMMING</span><span className="separator">✳</span><span>MORE UNDERSTANDING</span><span className="separator">✳</span><span>ZERO STUDY GUILT</span></section>

        <section className="features section" id="features">
          <div className="section-heading"><div><p className="eyebrow">YOUR TOOLS, ALL IN ONE PLACE</p><h2>Everything in one <em>little kit.</em></h2></div><p>One source, four ways to study. Choose what fits the moment you're in.</p></div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-icon">✳</span><p className="feature-context">BEFORE CLASS</p><h3>Revision sheets</h3><p>Key concepts, definitions and examples organised into a readable study sheet.</p><a href="#upload">Give it a try ↗</a></article>
            <article className="feature-card sage"><span className="feature-icon">✧</span><p className="feature-context">5 MINUTE GAPS</p><h3>Practice quizzes</h3><p>Practise recalling ideas with questions based on the material you provide.</p><a href="#study-kit">Give it a try ↗</a></article>
            <article className="feature-card peach"><span className="feature-icon">▤</span><p className="feature-context">ON THE BUS</p><h3>Flashcards</h3><p>Review key sentences with question-and-answer cards you can flip.</p><a href="#study-kit">Give it a try ↗</a></article>
            <article className="feature-card"><span className="feature-icon">♡</span><p className="feature-context">EXAM WEEK</p><h3>Answer feedback</h3><p>Practise writing answers and compare them with key points from your course.</p><a href="#study-kit">Give it a try ↗</a></article>
          </div>
        </section>

        <section className="how-section" id="how"><div className="section section-inner">
          <div className="section-heading"><div><p className="eyebrow">THREE STEPS, NO STUDY GUILT</p><h2>Small steps. <em>Clear head.</em></h2></div><p>Start with what you have. Build a little study habit from there.</p></div>
          <div className="steps-grid">
            <article className="step"><span className="step-number">01</span><div className="step-icon">↥</div><h3>Add your material</h3><p>Upload a supported file or paste your own notes.</p></article>
            <article className="step"><span className="step-number">02</span><div className="step-icon">✳</div><h3>Build your study kit</h3><p>Review a summary, key ideas, cards and practice questions.</p></article>
            <article className="step"><span className="step-number">03</span><div className="step-icon">↗</div><h3>Study a little, often</h3><p>Return to the material and practise at your own pace.</p></article>
          </div>
        </div></section>

        <section className="kindness section"><div><p className="eyebrow">A GENTLER WAY TO GET THERE</p><h2>You're a person, not a <em>productivity machine.</em></h2><p className="kindness-intro">Studying is hard enough. Your tools should meet you where you are, not make you feel behind.</p></div>
          <div className="kindness-list"><article><span>☾</span><div><h3>For the 11pm panic</h3><p>Start with one chapter instead of the whole syllabus.</p></div></article><article><span>↗</span><div><h3>Looks fine on your phone</h3><p>Keep the same calm layout on a small screen.</p></div></article><article><span>♡</span><div><h3>Feedback, not judgement</h3><p>Focus on what you know and what to review next.</p></div></article></div>
        </section>

        <section className="upload-section" id="upload"><div className="upload-card">
          <span className="upload-flower">✳</span><p className="eyebrow">YOUR NEXT SMALL STEP</p><h2>One chapter is enough <em>to start.</em></h2>
          <p className="upload-description">Choose a document or paste your notes to begin your study kit.</p>
          <label className="upload-drop">
            <input type="file" accept=".pdf,.docx,.pptx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => { setFile(event.target.files?.[0] || null); setMessage(""); }} />
            <span className="upload-icon">↥</span><strong>{file ? file.name : "Choose a PDF, Word, PowerPoint or text file"}</strong><span className="upload-hint">PDF · Word (.docx) · PowerPoint (.pptx) · TXT</span>
          </label>
          <div style={{ marginTop: 18, textAlign: "left" }}>
            <label htmlFor="course-text" style={{ display: "block", marginBottom: 9, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>Or paste your course here</label>
            <textarea id="course-text" value={pasteText} onChange={(event) => setPasteText(event.target.value)} placeholder="Paste your notes, lesson, exercise or exam statement…" rows={5} style={{ width: "100%", resize: "vertical", padding: 15, borderRadius: 12, border: "1px solid var(--line)", background: "#fffdfa", color: "var(--ink)", font: "inherit" }} />
          </div>
          <button className="button button-dark upload-button" onClick={() => pasteText.trim() ? processText(pasteText, "Texte collé") : handleFile()} disabled={processing}>
            {processing ? "Reading your material..." : "Build my study kit"} <span className="arrow">→</span>
          </button>
          {processing && <div role="status" aria-live="polite" style={{ marginTop: 24, padding: "24px 18px", border: "1px solid #e8d9c7", borderRadius: 20, background: "#fffdfa", textAlign: "center" }}>
            <style>{`@keyframes studyMindSpin { to { transform: rotate(360deg); } } @keyframes studyMindPulse { 0%,100% { opacity:.45; transform:scale(.96); } 50% { opacity:1; transform:scale(1); } }`}</style>
            <div style={{ width: 46, height: 46, margin: "0 auto 14px", border: "3px solid #eadfce", borderTopColor: "#a88761", borderRadius: "50%", animation: "studyMindSpin 1s linear infinite" }} />
            <p style={{ margin: "0 0 7px", fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, color: "#302821" }}>On prépare ton espace de révision…</p>
            <p style={{ margin: "0 auto 18px", maxWidth: 440, color: "#9b8875", lineHeight: 1.6, fontSize: 14 }}>Lecture du document et organisation du texte. Cela peut prendre quelques instants.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>{["Lecture du cours", "Repérage des idées", "Préparation des supports"].map((step, i) => <span key={step} style={{ borderRadius: 24, padding: "8px 12px", background: "#f6f0e6", color: "#8b6b4d", fontSize: 12, animation: `studyMindPulse 1.5s ease-in-out ${i * .2}s infinite` }}>✳ {step}</span>)}</div>
          </div>}
          {message && <p className="file-message" role="status">{message}</p>}
        </div></section>

        {studyContent && <section className="section" id="study-kit" style={{ paddingTop: 65, paddingBottom: 80 }}>
          <div className="section-heading"><div><p className="eyebrow">YOUR PERSONAL STUDY SPACE</p><h2>Your study <em>kit.</em></h2></div><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}><p style={{ margin: 0 }}>Built from your provided material. Review the source when you need more context.</p><button className="button button-light" onClick={() => { setStudyContent(null); setSourceText(""); setFile(null); setPasteText(""); setMessage(""); setActiveTab("Overview"); setCardIndex(0); setFlipped(false); setAnswers({}); setWrittenAnswers({}); setShowResults(false); document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" }); }} style={{ borderRadius: 28, padding: "10px 18px" }}><span style={{ display: "inline-block", marginRight: 8, animation: "studyStarTurn 3s linear infinite" }}>✧</span>New analysis</button></div></div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 24 }}>
            {studyTabs.map((tab) => <button key={tab} className={`button ${activeTab === tab ? "button-dark" : "button-light"}`} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          </div>
          <div style={{ padding: "clamp(20px, 4vw, 36px)", background: "#fffdfa", border: "1px solid var(--line)", borderRadius: 22 }}>
            {activeTab === "Overview" && <div><p className="eyebrow">OVERVIEW</p><h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 500 }}>Your course at a glance</h3><p style={{ color: "var(--muted)", lineHeight: 1.8 }}>This overview is organised from the text you supplied. It is not an AI-generated summary yet.</p><ul style={{ lineHeight: 1.9 }}>{studyContent.summary.map((item, index) => <li key={index}>{item}</li>)}</ul><p style={{ color: "var(--muted)", fontSize: 13 }}>Source length: {sourceText.length.toLocaleString()} characters.</p></div>}
            {activeTab === "Revision sheet" && <article style={{ maxWidth: 850, margin: "0 auto", background: "#fffdf9", border: "1px solid #e8d9c7", borderRadius: 8, padding: "clamp(18px, 4vw, 34px)", color: "#302821", fontSize: 13, lineHeight: 1.65 }}>
              <p style={{ margin: "0 0 8px", fontSize: 9, letterSpacing: "0.2em", color: "#9a7959", textTransform: "uppercase" }}>Révision sheet</p>
              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px, 3vw, 30px)", lineHeight: 1.25, fontWeight: 500, margin: "0 0 8px", color: "#302821" }}>Fiche de révision — {file?.name ? file.name.replace(/\.[^.]+$/, "") : "Mon cours"}</h3>
              <p style={{ margin: "0 0 18px", color: "#8f7b68", fontSize: 12 }}>Cette fiche rassemble les idées principales détectées dans le contenu fourni. Relis le cours d'origine pour vérifier les détails.</p>
              <div style={{ height: 1, background: "#e8d9c7", margin: "14px 0 20px" }} />
              <section style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 500, margin: "0 0 9px" }}>01&nbsp; Points essentiels</h4>
                {studyContent.summary.length ? <ul style={{ paddingLeft: 18, margin: 0 }}>{studyContent.summary.map((item, index) => <li key={index} style={{ paddingLeft: 2, marginBottom: 6 }}>{item}</li>)}</ul> : <p>{sourceText.slice(0, 700)}</p>}
              </section>
              <section style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 500, margin: "0 0 9px" }}>02&nbsp; Formules et éléments à repérer</h4>
                {(() => {
                  const lines = sourceText.split(/\n|(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
                  const formulaLines = lines.filter((line) => /[=<>±×÷√∑∫]|\b(formule|théorème|loi|équation|vitesse|calcul|coefficient)\b|\b[A-Za-z]\s*=?\s*[-+]?\d/i.test(line)).slice(0, 8);
                  const importantLines = lines.filter((line) => /important|à retenir|attention|définition|principe|essentiel|must know|key concept/i.test(line)).slice(0, 5);
                  const found = [...new Set([...formulaLines, ...importantLines])].slice(0, 8);
                  return found.length ? <div style={{ display: "grid", gap: 9 }}>{found.map((line, i) => <div key={i} style={{ border: "1px solid #e8d9c7", borderRadius: 10, padding: "12px 14px", background: i % 2 ? "#fffdf9" : "#fffaf3" }}><span style={{ display: "block", color: "#9a7959", fontSize: 9, letterSpacing: "0.12em", marginBottom: 5 }}>{/[=<>±×÷√∑∫]/.test(line) ? "FORMULE / RELATION DÉTECTÉE" : "ÉLÉMENT À VÉRIFIER"}</span><span>{line}</span></div>)}</div> : <p style={{ color: "#8f7b68" }}>Aucune formule évidente repérée automatiquement dans le texte. Les formules intégrées dans des images ou des PDF scannés peuvent ne pas être détectées.</p>;
                })()}
              </section>
              <section style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 500, margin: "0 0 9px" }}>03&nbsp; Concepts et définitions</h4>
                <div style={{ border: "1px solid #e8d9c7", borderRadius: 8, overflow: "hidden" }}>
                  {(studyContent.terms.length ? studyContent.terms.slice(0, 5) : [sourceText.slice(0, 180)]).map((item, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "minmax(95px, 0.32fr) 1fr", gap: 12, padding: "10px 12px", borderBottom: index === Math.min(studyContent.terms.length, 5) - 1 ? 0 : "1px solid #eee3d6", background: index % 2 ? "#fffdf9" : "#fffaf3" }}><strong style={{ fontSize: 11, color: "#8b6b4d" }}>Concept {index + 1}</strong><span style={{ fontSize: 12 }}>{item}</span></div>)}
                </div>
              </section>
              <section style={{ marginBottom: 22 }}>
                <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 500, margin: "0 0 9px" }}>04&nbsp; À retenir</h4>
                <div style={{ border: "1px solid #e8d9c7", borderRadius: 8, padding: "13px 15px", background: "#fffaf3" }}>
                  <p style={{ margin: "0 0 6px", color: "#9a7959", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase" }}>Résumé rapide</p>
                  <p style={{ margin: 0, fontSize: 12 }}>{studyContent.summary.slice(0, 2).join(" ") || sourceText.slice(0, 300)}</p>
                </div>
              </section>
              <section>
                <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 17, fontWeight: 500, margin: "0 0 9px" }}>05&nbsp; Exemples et application</h4>
                <div style={{ borderRadius: 8, padding: "13px 15px", background: "#f6f0e6" }}><p style={{ margin: 0, fontSize: 12 }}>{studyContent.terms.find((item) => /exemple|par exemple|comme|donc|ainsi/i.test(item)) || studyContent.terms[studyContent.terms.length - 1] || "Ajoute ici un exemple donné par ton cours pour appliquer les notions."}</p></div>
              </section>
              <p style={{ borderTop: "1px solid #e8d9c7", paddingTop: 12, margin: "20px 0 0", color: "#9b8875", fontSize: 10 }}>StudyMind AI · Fiche organisée à partir du document importé · {sourceText.length.toLocaleString()} caractères analysés</p>
            </article>}
            {activeTab === "Flashcards" && <div>
              {studyContent.cards.length ? <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 18, color: "#9b8875", fontSize: 14 }}>
                  <span>Card {cardIndex + 1} of {studyContent.cards.length}</span>
                  <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    <button onClick={() => { const shuffled = [...studyContent.cards].sort(() => Math.random() - 0.5); setStudyContent({ ...studyContent, cards: shuffled }); setCardIndex(0); setFlipped(false); }} style={{ border: 0, background: "transparent", color: "#9b8875", cursor: "pointer", font: "inherit" }}>⤨ Shuffle</button>
                    <button onClick={() => { setStudyContent({ ...studyContent, cards: makeStudyContent(sourceText).cards }); setCardIndex(0); setFlipped(false); }} style={{ border: 0, background: "transparent", color: "#9b8875", cursor: "pointer", font: "inherit" }}>↶ Reset</button>
                  </div>
                </div>
                <button onClick={() => setFlipped(!flipped)} aria-label="Retourner la flashcard" style={{ boxSizing: "border-box", display: "block", width: "100%", minHeight: 335, padding: "clamp(26px, 5vw, 48px)", textAlign: "left", borderRadius: 28, border: "1px solid #e8d9c7", background: flipped ? "#f0f1e8" : "#fffdfa", color: "#302821", cursor: "pointer", font: "inherit", boxShadow: "0 2px 5px rgba(70, 50, 30, 0.015)" }}>
                  <span style={{ display: "block", color: "#a58a6e", letterSpacing: "0.18em", fontSize: 12, marginBottom: 48 }}>{flipped ? "ANSWER" : "QUESTION"}</span>
                  <span style={{ display: "block", fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(24px, 3vw, 32px)", lineHeight: 1.45, margin: "0 0 34px 10px" }}>{flipped ? studyContent.cards[cardIndex].answer : studyContent.cards[cardIndex].question}</span>
                  <span style={{ display: "block", color: "#b39a81", fontSize: 14, marginLeft: 10 }}>{flipped ? "Click the card to see the question" : "Click the card to reveal the answer"}</span>
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12, marginTop: 24 }}>
                  <button className="button button-light" style={{ justifySelf: "start", borderRadius: 28, padding: "12px 22px" }} onClick={() => { setCardIndex((cardIndex - 1 + studyContent.cards.length) % studyContent.cards.length); setFlipped(false); }}>‹ &nbsp; Previous</button>
                  <div style={{ display: "flex", gap: 7, alignItems: "center", justifyContent: "center" }}>{studyContent.cards.map((_, index) => <button key={index} aria-label={`Aller à la carte ${index + 1}`} onClick={() => { setCardIndex(index); setFlipped(false); }} style={{ width: index === cardIndex ? 24 : 8, height: 8, padding: 0, border: 0, borderRadius: 20, background: index === cardIndex ? "#a88761" : "#e3d4c2", cursor: "pointer" }} />)}</div>
                  <button className="button button-dark" style={{ justifySelf: "end", borderRadius: 28, padding: "12px 22px" }} onClick={() => { setCardIndex((cardIndex + 1) % studyContent.cards.length); setFlipped(false); }}>Next &nbsp; ›</button>
                </div>
              </div> : <p>Not enough text to create cards yet.</p>}
            </div>}
            {activeTab === "Practice exam" && <div><p className="eyebrow">PRACTICE EXAM</p><h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, fontWeight: 500 }}>Write your answers</h3><p style={{ color: "var(--muted)", lineHeight: 1.7 }}>Réponds comme dans un vrai examen. Prends le temps d'expliquer tes étapes et d'utiliser le vocabulaire du cours.</p>{quiz.map((question, index) => <article key={index} style={{ background: "#fffdfa", border: "1px solid #e8d9c7", borderRadius: 18, padding: "clamp(18px, 3vw, 28px)", margin: "20px 0", boxShadow: "0 3px 12px rgba(74, 52, 31, 0.025)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}><div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><span style={{ color: "#a27e5d", fontWeight: 600 }}>{index + 1}.</span><h4 style={{ margin: 0, fontSize: 17, lineHeight: 1.55, fontWeight: 600 }}>{`Explique avec tes propres mots l'idée suivante : ${question.answer}`}</h4></div><span style={{ flexShrink: 0, borderRadius: 20, padding: "6px 12px", background: "#f5eee3", color: "#947655", fontSize: 12, whiteSpace: "nowrap" }}>{index === 0 ? 5 : 3} pts</span></div><p style={{ color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>Présente les idées importantes, explique les termes essentiels et donne un exemple si possible.</p><textarea aria-label={`Réponse à la question ${index + 1}`} value={writtenAnswers[index] || ""} onChange={(event) => { setWrittenAnswers({ ...writtenAnswers, [index]: event.target.value }); setShowResults(false); }} placeholder="Écris ta réponse ici…" rows={5} style={{ boxSizing: "border-box", display: "block", width: "100%", minHeight: 140, resize: "vertical", padding: 16, borderRadius: 14, border: "1px solid #ead9c7", background: "#fff", color: "var(--ink)", font: "inherit", lineHeight: 1.6, outlineColor: "#bda184" }} />{showResults && <p style={{ color: "#8a6b4e", fontSize: 13, marginBottom: 0 }}>Réponse enregistrée dans cette page. Compare-la avec le passage de ton cours : {question.answer}</p>}</article>)}<button className="button button-dark" onClick={() => setShowResults(true)}>Terminer l'examen</button>{showResults && <p style={{ marginTop: 16, fontWeight: 600 }}>Examen terminé : {Object.values(writtenAnswers).filter((answer) => answer.trim()).length} réponse(s) rédigée(s) sur {quiz.length}. La correction automatique par IA sera ajoutée dans une prochaine étape.</p>}</div>}
          </div>
        </section>}
      </main>
      <section className="section" id="library" style={{ paddingTop: 55, paddingBottom: 70 }}>
        <div className="section-heading"><div><p className="eyebrow">YOUR PERSONAL LIBRARY</p><h2>Study habits, <em>one step at a time.</em></h2></div><p>Ton historique et ton planning restent enregistrés dans ce navigateur.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20, alignItems: "start" }}>
          <article style={{ background: "#fffdfa", border: "1px solid #e8d9c7", borderRadius: 22, padding: 22 }}>
            <p className="eyebrow">FOCUS TIMER</p><h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 25, fontWeight: 500, marginTop: 0 }}>Pomodoro</h3>
            <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Travaille pendant une courte période, puis fais une pause.</p>
            <div style={{ textAlign: "center", padding: "22px 10px", borderRadius: 18, background: "#f7f1e8", margin: "16px 0" }}><div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 52, color: "#302821", fontVariantNumeric: "tabular-nums" }}>{String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</div><p style={{ color: "#9a7959", margin: 0 }}>{timerMode === "study" ? "Temps de concentration" : "Pause"}</p></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{[25, 45, 50].map((minutes) => <button key={minutes} className="button button-light" onClick={() => { setPomodoroMinutes(minutes); setSecondsLeft(minutes * 60); setTimerMode("study"); setTimerRunning(false); }} style={{ padding: "8px 12px" }}>{minutes} min</button>)}<button className="button button-light" onClick={() => { setTimerMode("break"); setSecondsLeft(5 * 60); setTimerRunning(false); }} style={{ padding: "8px 12px" }}>Pause 5 min</button></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="button button-dark" onClick={() => { if (secondsLeft === 0) setSecondsLeft((timerMode === "study" ? pomodoroMinutes : 5) * 60); setTimerRunning(!timerRunning); }}>{timerRunning ? "Pause" : "Démarrer"}</button><button className="button button-light" onClick={() => { setTimerRunning(false); setSecondsLeft((timerMode === "study" ? pomodoroMinutes : 5) * 60); }}>Réinitialiser</button></div>
          </article>
          <article style={{ background: "#fffdfa", border: "1px solid #e8d9c7", borderRadius: 22, padding: 22 }}>
            <p className="eyebrow">STUDY CALENDAR</p><h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 25, fontWeight: 500, marginTop: 0 }}>Planifier une session</h3>
            <label style={{ display: "block", color: "var(--muted)", fontSize: 13, marginBottom: 6 }}>Date</label><input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: "1px solid #e8d9c7", background: "#fff" }} />
            <label style={{ display: "block", color: "var(--muted)", fontSize: 13, margin: "14px 0 6px" }}>Objectif de révision</label><input value={plannedTask} onChange={(e) => setPlannedTask(e.target.value)} placeholder="Ex. Réviser les formules" style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: "1px solid #e8d9c7", background: "#fff", font: "inherit" }} />
            <button className="button button-dark" style={{ marginTop: 12 }} onClick={() => { if (!plannedTask.trim()) return; setPlans((old) => [...old, { id: Date.now(), date: plannedDate, task: plannedTask.trim() }].sort((a,b) => a.date.localeCompare(b.date))); setPlannedTask(""); }}>Ajouter au calendrier</button>
            <div style={{ marginTop: 18, display: "grid", gap: 8 }}>{plans.length ? plans.map((plan) => <div key={plan.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 12, background: "#f7f1e8" }}><div><strong style={{ display: "block", fontSize: 13 }}>{plan.task}</strong><span style={{ color: "#9b8875", fontSize: 12 }}>{plan.date}</span></div><button aria-label="Supprimer la session planifiée" onClick={() => setPlans((old) => old.filter((item) => item.id !== plan.id))} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#8b6b4d" }}>Supprimer</button></div>) : <p style={{ color: "var(--muted)", fontSize: 13 }}>Aucune session planifiée pour le moment.</p>}</div>
          </article>
        </div>
        <article style={{ marginTop: 20, background: "#fffdfa", border: "1px solid #e8d9c7", borderRadius: 22, padding: 22 }}>
          <p className="eyebrow">SESSION HISTORY</p><h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 25, fontWeight: 500, marginTop: 0 }}>Historique des sessions</h3>
          {sessions.length ? <div style={{ display: "grid", gap: 8 }}>{sessions.map((session) => <div key={session.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "12px 14px", background: "#f9f4ec", borderRadius: 12 }}><div><strong>{session.title}</strong><div style={{ color: "#9b8875", fontSize: 12, marginTop: 4 }}>{new Date(session.date).toLocaleString("fr-FR")} · {session.kind}</div></div><span style={{ color: "#8b6b4d", fontSize: 13 }}>{session.minutes ? `${session.minutes} min` : `${session.characters || 0} caractères`}</span></div>)}</div> : <p style={{ color: "var(--muted)", fontSize: 13 }}>Ton historique apparaîtra ici après ta première analyse ou session Pomodoro.</p>}
          {sessions.length > 0 && <button className="button button-light" style={{ marginTop: 12 }} onClick={() => { if (confirm("Effacer tout l’historique des sessions ?")) setSessions([]); }}>Effacer l’historique</button>}
        </article>
      </section>
      <footer className="footer" id="signin"><a href="#home" className="brand"><span className="brand-icon">♧</span><span>StudyMind AI</span></a><span>© 2026 StudyMind AI</span><a href="#home">A little progress still counts ↑</a></footer>
    </div>
  );
}
